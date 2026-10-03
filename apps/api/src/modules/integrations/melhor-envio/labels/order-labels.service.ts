// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { BuyOrderLabelPayload, LabelBalanceDetails, OrderLabelOverview, OrderLabelPrint, OrderLabelVolume } from '@harness-monorepo/contracts';
import type { OrderLabelModel } from '../../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../../stores/stores.service.js';
import { melhorEnvioConfig, MelhorEnvioClient, MelhorEnvioRefused, type MelhorEnvioConfig } from '../melhor-envio.client.js';
import { MelhorEnvioService } from '../melhor-envio.service.js';
import { DEFAULT_SITE, labelError, labelOf, sameVolume, translated, volumeOf } from './label-mapping.js';
import { cartRequestOf, labelBlockersOf, type LabelSources } from './label-parties.js';
import { suggestedVolumeOf } from './label-volume.js';

/**
 * An order's shipping label (BEELINK-187), bought from the shop's own Melhor Envio wallet in the
 * shop's name: into Melhor Envio's cart, paid from the balance, generated — then printed, tracked into
 * the order's delivery record, or cancelled while Melhor Envio allows it.
 *
 * Buying carries on from where the label stands, so pressing again after a refusal never buys twice:
 * a label in the cart is paid, a paid one is generated. Two presses on one order at once take turns —
 * in this process, which is the one that serves the API — so the second finds what the first did.
 */
@Injectable()
export class OrderLabels {
  /** The last step taken on each order's label, for the next to wait on. */
  private readonly turns = new Map<string, Promise<unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly connection: MelhorEnvioService,
    private readonly melhorEnvio: MelhorEnvioClient,
  ) {}

  async overview(storeSlug: string, userId: string, number: number): Promise<OrderLabelOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.overviewOf(storeId, number, true);
  }

  async buy(storeSlug: string, userId: string, number: number, payload: BuyOrderLabelPayload): Promise<OrderLabelOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.inTurn(`${storeId}:${number}`, () => this.buyNow(storeId, number, payload));
  }

  private async buyNow(storeId: string, number: number, payload: BuyOrderLabelPayload): Promise<OrderLabelOverview> {
    const { sources, orderId, label } = await this.sourcesOf(storeId, number);
    const blockers = labelBlockersOf(sources);
    if (blockers.length) throw new ConflictException(labelError('LABEL_NOT_AVAILABLE', 'The order cannot have a label yet', { blockers }));
    if (label?.status === 'GENERATED') return this.overviewOf(storeId, number, false);

    const config = melhorEnvioConfig()!;
    const token = await this.connection.accessTokenFor(storeId);
    const invoiceKey = payload.invoiceKey ?? null;

    try {
      let current = label?.status === 'CANCELLED' ? null : label;
      // A label still in the cart for another box, or another invoice, is taken out rather than paid.
      if (current?.status === 'IN_CART' && (!sameVolume(volumeOf(current), payload.volume) || current.invoiceKey !== invoiceKey)) {
        await this.melhorEnvio.removeFromCart(config, token, current.providerId).catch(() => undefined);
        current = null;
      }
      if (!current) current = await this.addToCart(config, token, storeId, orderId, sources, payload.volume, invoiceKey);
      if (current.status === 'IN_CART') current = await this.pay(config, token, current);
      if (current.status === 'PAID') await this.generate(config, token, current, orderId);
    } catch (error) {
      throw translated(error);
    }
    return this.overviewOf(storeId, number, false);
  }

  async print(storeSlug: string, userId: string, number: number): Promise<OrderLabelPrint> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const label = await this.labelOf(storeId, number);
    if (label.status !== 'GENERATED') throw new ConflictException(labelError('LABEL_NOT_GENERATED', 'The label is not generated yet'));

    const token = await this.connection.accessTokenFor(storeId);
    try {
      return { url: await this.melhorEnvio.print(melhorEnvioConfig()!, token, label.providerId) };
    } catch (error) {
      throw translated(error);
    }
  }

  /** Cancelled while Melhor Envio allows it, its value back to the wallet; one still in the cart is only taken out. */
  async cancel(storeSlug: string, userId: string, number: number): Promise<OrderLabelOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.inTurn(`${storeId}:${number}`, () => this.cancelNow(storeId, number));
  }

  private async cancelNow(storeId: string, number: number): Promise<OrderLabelOverview> {
    const label = await this.labelOf(storeId, number);
    const config = melhorEnvioConfig()!;
    const token = await this.connection.accessTokenFor(storeId);

    try {
      if (label.status === 'IN_CART') {
        await this.melhorEnvio.removeFromCart(config, token, label.providerId);
        await this.prisma.orderLabel.delete({ where: { orderId: label.orderId } });
        return this.overviewOf(storeId, number, false);
      }
      const cancellable = await this.melhorEnvio.cancellable(config, token, label.providerId);
      if (!cancellable || !(await this.melhorEnvio.cancel(config, token, label.providerId, `Pedido #${number} cancelado pela loja`))) {
        throw new ConflictException(labelError('LABEL_NOT_CANCELLABLE', 'Melhor Envio no longer allows cancelling the label'));
      }
    } catch (error) {
      throw translated(error);
    }

    await this.prisma.$transaction([
      this.prisma.orderLabel.update({ where: { orderId: label.orderId }, data: { status: 'CANCELLED', cancelledAt: new Date() } }),
      // The tracking the label gave the order goes with it; one the shopkeeper typed stays.
      ...(label.trackingCode ? [this.prisma.orderDelivery.updateMany({ where: { orderId: label.orderId, trackingCode: label.trackingCode }, data: { trackingCode: null } })] : []),
    ]);
    return this.overviewOf(storeId, number, false);
  }

  /** Runs after whatever was last started on the same label, and is what the next one waits on. */
  private async inTurn<T>(key: string, step: () => Promise<T>): Promise<T> {
    const before = this.turns.get(key) ?? Promise.resolve();
    const mine = before.catch(() => undefined).then(step);
    this.turns.set(key, mine);
    try {
      return await mine;
    } finally {
      if (this.turns.get(key) === mine) this.turns.delete(key);
    }
  }

  private async addToCart(config: MelhorEnvioConfig, token: string, storeId: string, orderId: string, sources: LabelSources, volume: OrderLabelVolume, invoiceKey: string | null): Promise<OrderLabelModel> {
    const item = await this.melhorEnvio.addToCart(config, token, cartRequestOf(sources, volume, invoiceKey));
    const data = {
      storeId,
      providerId: item.id,
      protocol: item.protocol,
      status: 'IN_CART' as const,
      priceCents: item.priceCents,
      ...volume,
      invoiceKey,
      trackingCode: null,
      paidAt: null,
      generatedAt: null,
      cancelledAt: null,
    };
    return this.prisma.orderLabel.upsert({ where: { orderId }, create: { orderId, ...data }, update: { ...data, createdAt: new Date() } });
  }

  /** Paid from the wallet — read first, so a wallet short of the price says by how much, and nothing is tried. */
  private async pay(config: MelhorEnvioConfig, token: string, label: OrderLabelModel): Promise<OrderLabelModel> {
    const balanceCents = await this.melhorEnvio.balanceCents(config, token);
    if (balanceCents < label.priceCents) {
      const details: LabelBalanceDetails = { balanceCents, priceCents: label.priceCents, walletUrl: config.baseUrl };
      throw new ConflictException(labelError('LABEL_BALANCE_INSUFFICIENT', 'The wallet holds less than the label costs', details));
    }
    await this.melhorEnvio.checkout(config, token, label.providerId);
    return this.prisma.orderLabel.update({ where: { orderId: label.orderId }, data: { status: 'PAID', paidAt: new Date() } });
  }

  /** Generated, then its tracking code into the order's delivery record — unless the shopkeeper typed one already. */
  private async generate(config: MelhorEnvioConfig, token: string, label: OrderLabelModel, orderId: string): Promise<void> {
    const generated = await this.melhorEnvio.generate(config, token, label.providerId);
    if (!generated.generated) throw new MelhorEnvioRefused(422, generated.message ?? 'Melhor Envio did not generate the label');

    const tracking = await this.melhorEnvio.tracking(config, token, label.providerId).catch(() => ({ status: 'unknown', trackingCode: null }));
    await this.prisma.$transaction([
      this.prisma.orderLabel.update({ where: { orderId }, data: { status: 'GENERATED', generatedAt: new Date(), trackingCode: tracking.trackingCode } }),
      ...(tracking.trackingCode ? [this.prisma.orderDelivery.updateMany({ where: { orderId, trackingCode: null }, data: { trackingCode: tracking.trackingCode } })] : []),
    ]);
  }

  private async labelOf(storeId: string, number: number): Promise<OrderLabelModel> {
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { label: true } });
    if (!order) throw new NotFoundException({ errorCode: 'ORDER_NOT_FOUND', message: `No order #${number} in this shop` });
    if (!order.label || order.label.status === 'CANCELLED') throw new NotFoundException(labelError('LABEL_NOT_FOUND', 'The order has no label'));
    return order.label;
  }

  private async sourcesOf(storeId: string, number: number): Promise<{ sources: LabelSources; orderId: string; label: OrderLabelModel | null }> {
    const [order, store, settings, integration] = await Promise.all([
      this.prisma.order.findUnique({
        where: { storeId_number: { storeId, number } },
        include: { customer: { select: { name: true, phone: true } }, items: { orderBy: { position: 'asc' } }, delivery: true, label: true },
      }),
      this.prisma.store.findUniqueOrThrow({ where: { id: storeId } }),
      this.prisma.melhorEnvioSettings.findUnique({ where: { storeId } }),
      this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: 'MELHOR_ENVIO' } } }),
    ]);
    if (!order) throw new NotFoundException({ errorCode: 'ORDER_NOT_FOUND', message: `No order #${number} in this shop` });

    const sources: LabelSources = {
      order,
      store,
      senderDocument: settings?.senderDocument ?? null,
      senderStateRegister: settings?.senderStateRegister ?? null,
      account: melhorEnvioConfig() && integration?.status === 'CONNECTED' ? { email: integration.accountEmail } : null,
    };
    return { sources, orderId: order.id, label: order.label };
  }

  /**
   * The label and what buying one needs. Read through, on the order page's own read: the wallet and
   * the box Melhor Envio would pack the order in, each a call of its own — and each null when it fails,
   * since neither keeps the page from showing what the order has.
   */
  private async overviewOf(storeId: string, number: number, withSuggestion: boolean): Promise<OrderLabelOverview> {
    const { sources, label } = await this.sourcesOf(storeId, number);
    const blockers = labelBlockersOf(sources);
    const delivery = sources.order.delivery;
    const carrier = delivery?.kind === 'CARRIER' && delivery.carrierServiceId !== null ? { serviceId: delivery.carrierServiceId, service: delivery.service ?? '', company: delivery.carrier ?? '' } : null;
    const config = melhorEnvioConfig();
    const overview: OrderLabelOverview = { label: label ? labelOf(label) : null, blockers, carrier, suggestedVolume: null, balanceCents: null, walletUrl: config?.baseUrl ?? DEFAULT_SITE };
    if (!config || !sources.account) return overview;

    const token = await this.connection.accessTokenFor(storeId).catch(() => null);
    if (!token) return overview;
    const [balanceCents, suggestedVolume] = await Promise.all([
      this.melhorEnvio.balanceCents(config, token).catch(() => null),
      withSuggestion && carrier && !label ? suggestedVolumeOf(this.prisma, this.melhorEnvio, { config, token, storeId, sources, serviceId: carrier.serviceId }) : null,
    ]);
    return { ...overview, balanceCents, suggestedVolume };
  }
}
