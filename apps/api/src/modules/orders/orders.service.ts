// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Order, OrderPage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { CreateOrderDto, ListOrdersDto, OrderCustomerDto, OrderDeliveryDto, UpdateOrderStatusDto } from './dto/order.dto.js';
import { OrderPlacement } from './order-placement.js';
import { settleCancellation } from './order-cancellation.js';
import { oweStatusEmail } from './order-status-email.js';
import { OrderStatusMailer } from './order-status-mailer.js';
import { orderError, ORDERS_PAGE_SIZE, ORDERS_PAGE_SIZE_MAX, PLACED_AT_SKEW_MS } from './orders.constants.js';
import { ORDER_INCLUDE, ORDER_SUMMARY_INCLUDE, toOrder, toOrderSummary } from './orders.mapper.js';
import { isOpen } from '../conversations/conversations.constants.js';
import { noteOrderStatus } from '../conversations/order-status-notice.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';

type Tx = Prisma.TransactionClient;

/**
 * A shop's orders, as its owner registers and moves them. Placing one is `OrderPlacement`'s, which
 * the cart shares; a status change takes the same lock of the shop's row, so the two never interleave.
 */
@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly placement: OrderPlacement,
    private readonly realtime: RealtimePublisher,
    private readonly mailer: OrderStatusMailer,
  ) {}

  async create(storeSlug: string, userId: string, dto: CreateOrderDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const placedAt = dto.placedAt ? new Date(dto.placedAt) : new Date();
    // ISO-shaped is not a date: "2026-02-30" passes the shape and parses to nothing.
    if (Number.isNaN(placedAt.getTime())) {
      throw new BadRequestException({ errorCode: 'BAD_REQUEST', message: 'placedAt is not a date' });
    }
    if (placedAt.getTime() > Date.now() + PLACED_AT_SKEW_MS) {
      throw new BadRequestException(orderError('ORDER_PLACED_IN_FUTURE', 'An order cannot be placed in the future'));
    }

    const order = await this.placement.place({
      storeId,
      items: dto.items,
      fulfillment: dto.fulfillment,
      // The panel knows a customer by their default address.
      addressId: null,
      paymentMethod: dto.paymentMethod,
      deliveryFeeCents: dto.deliveryFeeCents ?? 0,
      discountCents: dto.discountCents ?? 0,
      note: dto.note?.length ? dto.note : null,
      placedAt,
      // Registered by the shopkeeper, who already agreed the sale: accepted, not received.
      status: 'ACCEPTED',
      actor: 'SHOPKEEPER',
      userId,
      onSaleOnly: false,
      customerOf: (tx) => this.customerOf(tx, storeId, dto.customer),
    });
    this.realtime.publish({ storeId, customerId: order.customerId }, { type: 'order.created', orderNumber: order.number, placedBy: 'SHOP' });
    return toOrder(order);
  }

  async list(storeSlug: string, userId: string, query: ListOrdersDto = {}): Promise<OrderPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? ORDERS_PAGE_SIZE, 1), ORDERS_PAGE_SIZE_MAX);
    const raw = query.q?.trim() ?? '';
    // "#12" is order 12 and nothing else; "12" is also a name or a piece of a phone.
    const byNumberOnly = raw.startsWith('#');
    const term = raw.replace(/^#/, '');
    const digits = term.replace(/\D/g, '');
    const where: Prisma.OrderWhereInput = {
      storeId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(term
        ? {
            OR: [
              ...(/^\d{1,9}$/.test(term) ? [{ number: Number(term) }] : []),
              ...(byNumberOnly
                ? []
                : [
                    { customer: { name: { contains: term, mode: 'insensitive' as const } } },
                    // Four digits at least: a "1" would find every phone in the shop.
                    ...(digits.length >= 4 ? [{ customer: { phone: { contains: digits } } }] : []),
                  ]),
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: ORDER_SUMMARY_INCLUDE,
        orderBy: [{ placedAt: 'desc' }, { number: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders: rows.map(toOrderSummary), total, page, pageSize };
  }

  async get(storeSlug: string, userId: string, number: number): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, include: ORDER_INCLUDE });
    if (!order) throw this.notFound(number);
    return toOrder(order);
  }

  /** Any status to any other, except out of `CANCELLED`, which is final. */
  async updateStatus(storeSlug: string, userId: string, number: number, { status }: UpdateOrderStatusDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const moved = await this.prisma.$transaction(async (tx) => {
      // The same row lock as a new order takes, so a status change and a placement never interleave.
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;

      const current = await tx.order.findUnique({
        where: { storeId_number: { storeId, number } },
        select: { id: true, status: true, customerId: true, stockTaken: true },
      });
      if (!current) throw this.notFound(number);
      if (current.status === 'CANCELLED') {
        throw new ConflictException(orderError('ORDER_CANCELLED', 'A cancelled order does not change status'));
      }
      if (current.status === status) {
        throw new ConflictException(orderError('ORDER_STATUS_UNCHANGED', `The order is already ${status}`));
      }

      const order = await tx.order.update({
        where: { id: current.id },
        data: { status, events: { create: { status, actor: 'SHOPKEEPER', userId } } },
        include: ORDER_INCLUDE,
      });
      if (status === 'CANCELLED') await settleCancellation(tx, current);
      // Told to the customer in the conversation, before a move that closes it: the last line is why.
      await noteOrderStatus(tx, { order: current, status, at: new Date(), seen: false });
      const owed = await oweStatusEmail(tx, { order: current, status, byCustomer: false });
      const conversation = await tx.orderConversation.count({ where: { orderId: current.id } });
      return { order, owed, customerId: current.customerId, closes: conversation > 0 && isOpen(current.status) && !isOpen(status) };
    });
    if (moved.owed) this.mailer.dispatch();

    // Told once the change is committed: both sides read the order again, and a conversation it
    // closes stops taking messages.
    const to = { storeId, customerId: moved.customerId };
    this.realtime.publish(to, { type: 'order.status', orderNumber: number, status });
    if (moved.closes) this.realtime.publish(to, { type: 'conversation.closed', orderNumber: number });
    return toOrder(moved.order);
  }

  /**
   * What the shopkeeper tells of a delivery: who brings it, its tracking and the window it should
   * arrive in, the whole record replaced. A pick-up has none, and a window is both days or neither,
   * never ending before it starts. A cancelled order still takes it: the record is the shop's own.
   */
  async setDelivery(storeSlug: string, userId: string, number: number, dto: OrderDeliveryDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true, fulfillment: true } });
    if (!current) throw this.notFound(number);
    if (current.fulfillment === 'PICKUP') {
      throw new BadRequestException(orderError('ORDER_DELIVERY_FOR_PICKUP', 'A pick-up is handed over at the shop'));
    }
    const from = dto.estimateFrom ?? null;
    const to = dto.estimateTo ?? null;
    // `YYYY-MM-DD` strings compare as the days they name.
    if ((from === null) !== (to === null) || (from !== null && to !== null && to < from)) {
      throw new BadRequestException(orderError('ORDER_DELIVERY_WINDOW_INVALID', 'The window needs both days, and cannot end before it starts'));
    }

    const record = {
      kind: dto.kind,
      carrier: dto.carrier ?? null,
      service: dto.service ?? null,
      trackingCode: dto.trackingCode ?? null,
      trackingUrl: dto.trackingUrl ?? null,
      estimateFrom: from ? new Date(`${from}T00:00:00.000Z`) : null,
      estimateTo: to ? new Date(`${to}T00:00:00.000Z`) : null,
    };
    // Top-level, on the unique order id: Postgres's own INSERT … ON CONFLICT. Nested under the order,
    // Prisma reads then writes, and two first saves at once would both insert.
    await this.prisma.orderDelivery.upsert({ where: { orderId: current.id }, create: { orderId: current.id, ...record }, update: record });
    return toOrder(await this.prisma.order.findUniqueOrThrow({ where: { id: current.id }, include: ORDER_INCLUDE }));
  }

  /** The delivery told wrong, taken back: the order reads as one nobody told yet. */
  async clearDelivery(storeSlug: string, userId: string, number: number): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true } });
    if (!current) throw this.notFound(number);

    await this.prisma.orderDelivery.deleteMany({ where: { orderId: current.id } });
    return toOrder(await this.prisma.order.findUniqueOrThrow({ where: { id: current.id }, include: ORDER_INCLUDE }));
  }

  /**
   * The customer the order is for: one of this shop's, or one registered here. A phone the shop
   * already knows is that customer — the phone identifies a customer within a shop — and what was
   * typed as the name does not overwrite theirs.
   */
  private async customerOf(tx: Tx, storeId: string, input: OrderCustomerDto): Promise<string> {
    if (input.id) {
      const known = await tx.customer.findFirst({ where: { id: input.id, storeId }, select: { id: true } });
      if (!known) throw new BadRequestException(orderError('ORDER_CUSTOMER_NOT_FOUND', 'No such customer in this shop'));
      return known.id;
    }
    if (!input.name || !input.phone) {
      throw new BadRequestException(orderError('ORDER_CUSTOMER_NOT_FOUND', 'A customer needs an id, or a name and a phone'));
    }

    const customer = await tx.customer.upsert({
      where: { storeId_phone: { storeId, phone: input.phone } },
      create: { storeId, name: input.name, phone: input.phone },
      update: {},
      select: { id: true },
    });
    return customer.id;
  }

  private notFound(number: number): NotFoundException {
    return new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} in this shop`));
  }
}
