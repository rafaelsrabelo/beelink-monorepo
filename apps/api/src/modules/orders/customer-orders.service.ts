// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { CustomerOrder, CustomerOrderPage, CustomerOrderSituation, CustomerReorder, OrderStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CustomersService } from '../customers/customers.service.js';
import { CUSTOMER_ORDER_INCLUDE, toCustomerOrder, toCustomerOrderSummary } from './customer-order.mapper.js';
import type { ListCustomerOrdersDto, PlaceCustomerOrderDto } from './dto/customer-order.dto.js';
import { settleCancellation } from './order-cancellation.js';
import { OrderPlacement } from './order-placement.js';
import { OrderShipping } from './order-shipping.js';
import { reorderOf } from './order-reorder.js';
import { CUSTOMER_ORDER_SITUATIONS, CUSTOMER_ORDERS_PAGE_SIZE, CUSTOMER_ORDERS_PAGE_SIZE_MAX, orderError } from './orders.constants.js';
import { noteOrderStatus } from '../conversations/order-status-notice.js';
import { OrderPayments } from '../payments/order-payments.service.js';
import { refusePaidOrder } from '../payments/payment-guards.js';
import { isOnlineMethod } from '../payments/payment-terms.js';
import { PLACE_CHARGE_BUDGET_MS } from '../payments/payments.constants.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';

/** The shops are Brazilian, and so is a customer's year: "2025" starts at midnight in Brasília. */
const SHOP_OFFSET = '-03:00';
const THREE_MONTHS_MS = 90 * 86_400_000;

/**
 * The signed-in shopper's own orders at a shop: placing one from the cart, reading them — theirs,
 * including those the shop registered for them — and cancelling one the shop has not accepted yet.
 *
 * Every read goes through the shopper's own record at the shop, so another customer's order is not
 * found rather than forbidden: the answer never says it exists.
 */
@Injectable()
export class CustomerOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customers: CustomersService,
    private readonly placement: OrderPlacement,
    private readonly shipping: OrderShipping,
    private readonly realtime: RealtimePublisher,
    private readonly payments: OrderPayments,
  ) {}

  /**
   * The cart as an order of the shopper's record at this shop: priced, checked against the stock and
   * the shop's payments, and waiting for the shop — `RECEIVED`, the shopper's own word on it. A
   * delivery goes at the fee and the window the shop's rules quote to its address now (BEELINK-178);
   * where they quote none, the fee is the shop's to tell: not agreed (null), never a free delivery.
   */
  async place(storeSlug: string, userId: string, dto: PlaceCustomerOrderDto): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const addressId = dto.addressId?.toLowerCase() ?? null;
    const terms = await this.shipping.forPlacement({ storeId, customerId, fulfillment: dto.fulfillment, addressId, items: dto.items, choice: dto.shipping, shownFeeCents: dto.deliveryFeeCents });
    // A carrier's label is bought with the CPF of who receives it (BEELINK-187): the checkout asks for it first.
    const deliveryDocument = terms.carrier ? await this.documentOf(customerId, dto.recipientDocument, 'ORDER_RECIPIENT_DOCUMENT_MISSING') : null;
    const online = await this.chargedOnline(storeId, dto);
    // Asaas charges a person by their CPF (BEELINK-204): asked at checkout as a carrier's is.
    if (online) await this.documentOf(customerId, dto.recipientDocument, 'ORDER_PAYER_DOCUMENT_MISSING');

    const placed = await this.placement.place({
      storeId,
      items: dto.items,
      fulfillment: dto.fulfillment,
      addressId,
      paymentMethod: dto.paymentMethod,
      paymentChannel: online ? 'ONLINE' : 'OFFLINE',
      installments: dto.installments ?? 1,
      deliveryFeeCents: terms.deliveryFeeCents,
      deliveryWindow: terms.window,
      deliveryCarrier: terms.carrier,
      deliveryDocument,
      discountCents: 0,
      couponCode: dto.couponCode ?? null,
      cashbackCents: dto.cashbackCents ?? 0,
      note: null,
      placedAt: new Date(),
      status: 'RECEIVED',
      actor: 'CUSTOMER',
      userId,
      onSaleOnly: true,
      customerOf: async () => customerId,
    });
    this.realtime.publish({ storeId, customerId }, { type: 'order.created', orderNumber: placed.number, placedBy: 'CUSTOMER' });
    // After the commit, with no lock held, and never failing the order: should Asaas not answer, the
    // order goes back without a charge and its customer makes one from it. A fee not agreed yet is
    // no total to charge.
    if (online && placed.deliveryFeeCents !== null) await this.payments.ensureWithin(storeId, placed.id, PLACE_CHARGE_BUDGET_MS);
    return this.read(storeId, customerId, placed.number);
  }

  /**
   * Whether the order is charged at Asaas, having refused what the shop does not take now
   * (BEELINK-204). Online is Pix or a credit card, of a shop whose Asaas is connected and takes that
   * way, in no more instalments than it offers. Offline is what it was — the shop's own labels, checked
   * as the order is written — unless the shop, connected, turned paying on delivery off. A shop with
   * no Asaas in good standing sells as before it.
   */
  private async chargedOnline(storeId: string, dto: PlaceCustomerOrderDto): Promise<boolean> {
    const online = dto.paymentChannel === 'ONLINE';
    const installments = dto.installments ?? 1;
    const takes = await this.payments.acceptanceOf(storeId);
    const accepted = online
      ? takes.connected && isOnlineMethod(dto.paymentMethod) && (dto.paymentMethod === 'PIX' ? takes.pix && installments === 1 : takes.card && installments <= takes.maxInstallments)
      : installments === 1 && (!takes.connected || takes.offline);
    if (!accepted) throw new BadRequestException(orderError('ORDER_PAYMENT_NOT_ACCEPTED', 'The shop does not take that payment'));
    return online;
  }

  /** The customer's CPF on file, else the one typed at checkout — which is kept on their record, so it is asked once. */
  private async documentOf(customerId: string, typed: string | undefined, missing: 'ORDER_RECIPIENT_DOCUMENT_MISSING' | 'ORDER_PAYER_DOCUMENT_MISSING'): Promise<string> {
    const { cpf } = await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId }, select: { cpf: true } });
    if (cpf) return cpf;
    if (!typed) throw new BadRequestException(orderError(missing, "A carrier's delivery and an online payment need the customer's CPF"));
    await this.prisma.customer.update({ where: { id: customerId }, data: { cpf: typed } });
    return typed;
  }

  async list(storeSlug: string, userId: string, query: ListCustomerOrdersDto = {}): Promise<CustomerOrderPage> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? CUSTOMER_ORDERS_PAGE_SIZE, 1), CUSTOMER_ORDERS_PAGE_SIZE_MAX);
    // The tabs count under the period and the search, never under the tab chosen.
    const scope: Prisma.OrderWhereInput = { storeId, customerId, ...periodOf(query.period), ...searchOf(query.q) };
    const where: Prisma.OrderWhereInput = query.situation
      ? { AND: [scope, { status: { in: [...CUSTOMER_ORDER_SITUATIONS[query.situation]] } }] }
      : scope;

    const [rows, total, byStatus, years] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: CUSTOMER_ORDER_INCLUDE,
        orderBy: [{ placedAt: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], where: scope, orderBy: { status: 'asc' }, _count: { _all: true } }),
      this.prisma.$queryRaw<{ year: number }[]>`
        SELECT DISTINCT extract(year FROM "placedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::int AS "year"
        FROM "orders" WHERE "storeId" = ${storeId}::uuid AND "customerId" = ${customerId}::uuid
        ORDER BY 1 DESC`,
    ]);

    const counted = new Map(byStatus.map((row) => [row.status, (row._count as { _all: number })._all]));
    const countOf = (statuses: readonly OrderStatus[]) => statuses.reduce((sum, status) => sum + (counted.get(status) ?? 0), 0);
    const situations = Object.entries(CUSTOMER_ORDER_SITUATIONS) as [CustomerOrderSituation, readonly OrderStatus[]][];

    return {
      orders: rows.map(toCustomerOrderSummary),
      total,
      page,
      pageSize,
      counts: {
        ALL: countOf([...counted.keys()]),
        ...(Object.fromEntries(situations.map(([situation, statuses]) => [situation, countOf(statuses)])) as Record<CustomerOrderSituation, number>),
      },
      years: years.map((row) => row.year),
    };
  }

  async get(storeSlug: string, userId: string, number: number): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    return this.read(storeId, customerId, number);
  }

  /**
   * One of the customer's orders read against today's catalogue, to be bought again: what goes into
   * the cart and what stays out. A read: nothing is reserved, and the checkout checks again.
   */
  async reorder(storeSlug: string, userId: string, number: number): Promise<CustomerReorder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);
    const order = await this.prisma.order.findFirst({
      where: { storeId, customerId, number },
      select: { items: { orderBy: { position: 'asc' }, select: { productId: true, variantId: true, productName: true, variantLabel: true, quantity: true } } },
    });
    if (!order) throw notFound(number);

    const variantIds = order.items.flatMap((item) => (item.variantId ? [item.variantId] : []));
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds }, storeId },
      select: {
        id: true,
        productId: true,
        isActive: true,
        archivedAt: true,
        trackStock: true,
        stockQuantity: true,
        product: { select: { status: true, _count: { select: { options: true } } } },
      },
    });
    return reorderOf(
      number,
      order.items,
      variants.map(({ product, ...variant }) => ({ ...variant, productStatus: product.status, productHasOptions: product._count.options > 0 })),
    );
  }

  /**
   * The customer's own cancellation, while the shop has not accepted the order: after that it is the
   * shop's to cancel. Under the lock of the shop's row, as the panel's status changes take it, so the
   * shop accepting and the customer cancelling at once end one way or the other, never both.
   */
  async cancel(storeSlug: string, userId: string, number: number): Promise<CustomerOrder> {
    const { storeId, customerId } = await this.customers.shopperAt(storeSlug, userId);

    // A charge paid since bee-link last asked must be known before the order is cancelled over it (BEELINK-204).
    await this.payments.hearOf(storeId, number);
    let orderId: string | null = null;
    const conversation = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;

      const current = await tx.order.findFirst({
        where: { storeId, customerId, number },
        select: { id: true, status: true, customerId: true, stockTaken: true },
      });
      if (!current) throw notFound(number);
      orderId = current.id;
      // Already cancelled — by the shop, or by a second press — is said as such, not as "accepted".
      if (current.status === 'CANCELLED') {
        throw new ConflictException(orderError('ORDER_CANCELLED', 'The order is already cancelled'));
      }
      if (current.status !== 'RECEIVED') {
        throw new ConflictException(orderError('ORDER_NOT_CANCELLABLE', "Only an order the shop has not accepted is the customer's to cancel"));
      }
      // A paid order is not cancelled before it is refunded (BEELINK-204).
      await refusePaidOrder(tx, current.id);

      await tx.order.update({
        where: { id: current.id },
        data: { status: 'CANCELLED', events: { create: { status: 'CANCELLED', actor: 'CUSTOMER', userId } } },
      });
      await settleCancellation(tx, current);
      // The customer's own doing: in the conversation's history, but not news to them.
      await noteOrderStatus(tx, { order: current, status: 'CANCELLED', at: new Date(), seen: true });
      return (await tx.orderConversation.count({ where: { orderId: current.id } })) > 0;
    });
    this.realtime.publish({ storeId, customerId }, { type: 'order.status', orderNumber: number, status: 'CANCELLED' });
    if (conversation) this.realtime.publish({ storeId, customerId }, { type: 'conversation.closed', orderNumber: number });
    // After the commit, and never undoing it: a charge still waiting must not be paid for a cancelled order.
    if (orderId) await this.payments.release(storeId, orderId);
    return this.read(storeId, customerId, number);
  }

  private async read(storeId: string, customerId: string, number: number): Promise<CustomerOrder> {
    const order = await this.prisma.order.findFirst({ where: { storeId, customerId, number }, include: CUSTOMER_ORDER_INCLUDE });
    if (!order) throw notFound(number);
    return toCustomerOrder(order);
  }
}

function notFound(number: number): NotFoundException {
  return new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} of yours in this shop`));
}

/** `3m` is the last ninety days; a year is that year in the shop's calendar. */
function periodOf(period: string | undefined): Prisma.OrderWhereInput {
  if (!period) return {};
  if (period === '3m') return { placedAt: { gte: new Date(Date.now() - THREE_MONTHS_MS) } };
  const year = Number(period);
  return { placedAt: { gte: new Date(`${year}-01-01T00:00:00${SHOP_OFFSET}`), lt: new Date(`${year + 1}-01-01T00:00:00${SHOP_OFFSET}`) } };
}

/** "#12" is order 12 and nothing else; "12" is also part of a product's name; words are a product's name. */
function searchOf(q: string | undefined): Prisma.OrderWhereInput {
  const raw = q?.trim() ?? '';
  if (!raw) return {};
  const term = raw.replace(/^#/, '');
  const byNumber = /^\d{1,9}$/.test(term) ? [{ number: Number(term) }] : [];
  // A "#" before something that is not a number names no order.
  if (raw.startsWith('#')) return byNumber[0] ?? { number: -1 };
  return { OR: [...byNumber, { items: { some: { productName: { contains: term, mode: 'insensitive' } } } }] };
}
