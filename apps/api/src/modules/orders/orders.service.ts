// Nest
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { Order, OrderPage, OrderStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { SetOrderDeliveryFeeDto } from './dto/order-delivery-fee.dto.js';
import type { CreateOrderDto, ListOrdersDto, OrderCustomerDto, OrderDeliveryDto, UpdateOrderStatusDto } from './dto/order.dto.js';
import type { RefundOrderDto } from '../payments/dto/refund-order.dto.js';
import { agreeDeliveryFee } from './order-delivery-fee.js';
import { placedAtOf } from './order-placed-at.js';
import { OrderPlacement } from './order-placement.js';
import { settleCancellation } from './order-cancellation.js';
import { statusFilterOf } from './open-orders.js';
import { oweStatusEmail } from './order-status-email.js';
import { OrderStatusMailer } from './order-status-mailer.js';
import { orderError, ORDERS_PAGE_SIZE, ORDERS_PAGE_SIZE_MAX } from './orders.constants.js';
import { ORDER_INCLUDE, ORDER_SUMMARY_INCLUDE, toOrder, toOrderSummary } from './orders.mapper.js';
import { releaseOrderCashback, revokeOrderCashback } from '../cashback/cashback-orders.js';
import { isOpen } from '../conversations/conversations.constants.js';
import { noteOrderStatus } from '../conversations/order-status-notice.js';
import { OrderPayments } from '../payments/order-payments.service.js';
import { OrderRefunds } from '../payments/order-refunds.service.js';
import { markPaidSeen } from '../payments/payment-facts.js';
import { paymentFilterOf } from '../payments/payment-filter.js';
import { refuseUnrefundedOrder } from '../payments/payment-guards.js';
import { RealtimePublisher } from '../realtime/realtime-publisher.js';

type Tx = Prisma.TransactionClient;

/**
 * A shop's orders, as its owner registers and moves them. Placing one is `OrderPlacement`'s, which
 * the cart shares; a status change takes the same lock of the shop's row, so the two never interleave.
 */
/** The statuses an order moves through towards its delivery, in order: a carrier only moves it forward. */
const CARRIER_ORDER: readonly OrderStatus[] = ['RECEIVED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

/** Where an unpaid order still is the shop's to give up on by itself: accepting one does not hold it (BEELINK-206), goods on their way do. */
const UNPAID_CANCELLABLE: readonly OrderStatus[] = ['RECEIVED', 'ACCEPTED', 'PREPARING'];

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly placement: OrderPlacement,
    private readonly realtime: RealtimePublisher,
    private readonly mailer: OrderStatusMailer,
    private readonly payments: OrderPayments,
    private readonly refunds: OrderRefunds,
  ) {}

  async create(storeSlug: string, userId: string, dto: CreateOrderDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);

    const placedAt = placedAtOf(dto.placedAt);

    const order = await this.placement.place({
      storeId,
      items: dto.items,
      fulfillment: dto.fulfillment,
      // The panel knows a customer by their default address.
      addressId: null,
      paymentMethod: dto.paymentMethod,
      deliveryFeeCents: dto.deliveryFeeCents ?? 0,
      // The shopkeeper types the fee of a sale registered here; nothing was quoted.
      deliveryWindow: null,
      deliveryCarrier: null,
      discountCents: dto.discountCents ?? 0,
      couponCode: dto.couponCode ?? null,
      cashbackCents: dto.cashbackCents ?? 0,
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
      // Both asked: an order waiting for money that is also in that status. The payment's own
      // condition on the status gives way to the one asked.
      ...(query.payment ? paymentFilterOf(query.payment) : {}),
      ...(query.status ? statusFilterOf(query.status) : {}),
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

  /**
   * Somebody at the shop opened a paid order (BEELINK-207): the bell stops telling of it. Seen is
   * the shop's, not a person's — one opening is enough for everyone — and saying it twice is fine.
   */
  async seePayment(storeSlug: string, userId: string, number: number): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true } });
    if (!order) throw this.notFound(number);
    await markPaidSeen(this.prisma, order.id, new Date());
  }

  /**
   * Money of an order's payment given back (BEELINK-208): whole or in part, its own payment's or a
   * stray one's. Answers the order as it stands once Asaas took the refund. Refunding does not
   * cancel: the shop may give money back and keep the order.
   */
  async refund(storeSlug: string, userId: string, number: number, dto: RefundOrderDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true } });
    if (!order) throw this.notFound(number);
    await this.refunds.refund(storeId, order.id, { amountCents: dto.amountCents, reason: dto.reason, refundableCents: dto.refundableCents, strayId: dto.strayId, origin: 'PANEL', userId });
    return toOrder(await this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE }));
  }

  /**
   * Any status to any other, except out of `CANCELLED`, which is final. Cancelling an order that
   * holds its customer's money carries its refund (BEELINK-208): asked of Asaas first, and the
   * order is cancelled only once Asaas took it — a refund that fails leaves the order as it was.
   */
  async updateStatus(storeSlug: string, userId: string, number: number, { status, refund }: UpdateOrderStatusDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const moved = await this.move(storeId, number, status, { actor: 'SHOPKEEPER', userId, refund });
    if (!moved) throw new ConflictException(orderError('ORDER_STATUS_UNCHANGED', `The order is already ${status}`));
    return moved;
  }

  /**
   * A carrier's word on an order (BEELINK-188): posted is out for delivery, delivered is delivered.
   * Only ever forward — a "posted" that arrives after the "delivered" moves nothing — and never out of
   * a cancellation. Null when it moved nothing.
   */
  async moveByCarrier(storeId: string, number: number, status: Extract<OrderStatus, 'OUT_FOR_DELIVERY' | 'DELIVERED'>): Promise<Order | null> {
    return this.move(storeId, number, status, { actor: 'CARRIER', userId: null }, (current) => CARRIER_ORDER.indexOf(current) >= 0 && CARRIER_ORDER.indexOf(current) < CARRIER_ORDER.indexOf(status));
  }

  /**
   * An order charged online that nobody paid in time (BEELINK-206), cancelled in the system's name:
   * the same move as any cancellation — the stock, the coupon and the cashback back, the line in the
   * conversation, the customer's e-mail, its charge taken out of Asaas. The caller has just heard
   * Asaas say it is not paid; under the lock it is checked again that the order still waits, is
   * still past its time — a fee agreed meanwhile gives it three more days — and holds no money.
   * One already out for delivery or delivered is left to the shop: its goods are gone. Null when
   * it moved nothing.
   */
  async cancelUnpaid(storeId: string, number: number, now: Date): Promise<Order | null> {
    return this.move(
      storeId,
      number,
      'CANCELLED',
      { actor: 'SYSTEM', userId: null, heard: true },
      (current) => UNPAID_CANCELLABLE.includes(current),
      async (tx, orderId) => {
        const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, select: { paymentChannel: true, paymentDueAt: true, payments: { where: { status: { in: ['CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED', 'REFUNDED'] } }, select: { id: true } } } });
        return order.paymentChannel === 'ONLINE' && order.paymentDueAt !== null && order.paymentDueAt <= now && order.payments.length === 0;
      },
    );
  }

  /**
   * One move of an order's status, whoever makes it: under the shop's row lock, with what the move
   * owes — the stock back on a cancellation, the cashback after the delivery, the line in the
   * conversation, the customer's e-mail — and both sides told once it is committed. Null when the
   * order already stands there, or `allowed` says it does not move from where it stands.
   */
  private async move(
    storeId: string,
    number: number,
    status: OrderStatus,
    by: { actor: 'SHOPKEEPER' | 'CARRIER' | 'SYSTEM'; userId: string | null; heard?: boolean; refund?: { reason: string; refundableCents: number } },
    allowed: (current: OrderStatus) => boolean = () => true,
    stillSo: (tx: Tx, orderId: string) => Promise<boolean> = async () => true,
  ): Promise<Order | null> {
    // A charge paid since bee-link last asked must be known before the order is cancelled over it (BEELINK-204).
    if (status === 'CANCELLED' && !by.heard) await this.payments.hearOf(storeId, number);
    // Money first (BEELINK-208): given back and the order still standing can be mended; cancelled with the money kept cannot.
    if (status === 'CANCELLED' && by.actor === 'SHOPKEEPER') await this.refunds.refundBeforeCancelling(storeId, number, by.refund, by.userId);
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
      if (current.status === status || !allowed(current.status) || !(await stillSo(tx, current.id))) return null;
      // A paid order is cancelled only with the refund of what the shop still holds (BEELINK-208).
      if (status === 'CANCELLED') await refuseUnrefundedOrder(tx, current.id);

      await tx.order.update({ where: { id: current.id }, data: { status, events: { create: { status, actor: by.actor, userId: by.userId } } } });
      const now = new Date();
      if (status === 'CANCELLED') await settleCancellation(tx, current);
      // The cashback follows the delivery (BEELINK-239): made usable by it, taken back by leaving it.
      else if (current.status === 'DELIVERED') await revokeOrderCashback(tx, current.id, 'BACK', now);
      const cashbackCents = status === 'DELIVERED' ? await releaseOrderCashback(tx, current.id, now) : null;
      // Told to the customer in the conversation, before a move that closes it: the last line is why.
      // The system cancels for one reason alone, and the line says it (BEELINK-207).
      await noteOrderStatus(tx, { order: current, status, at: now, seen: false, cashbackCents, unpaid: by.actor === 'SYSTEM' });
      const owed = await oweStatusEmail(tx, { order: current, status, byCustomer: false });
      const conversation = await tx.orderConversation.count({ where: { orderId: current.id } });
      // Read once everything the move did is written: its cashback included.
      const order = await tx.order.findUniqueOrThrow({ where: { id: current.id }, include: ORDER_INCLUDE });
      return { order, owed, customerId: current.customerId, closes: conversation > 0 && isOpen(current.status) && !isOpen(status) };
    });
    if (!moved) return null;
    if (moved.owed) this.mailer.dispatch();
    // After the commit, and never undoing it: a charge still waiting must not be paid for a cancelled order.
    if (status === 'CANCELLED') await this.payments.release(storeId, moved.order.id);

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
      // The service chosen at checkout stays with a delivery that is still a carrier's: its label is bought with it (BEELINK-186).
      ...(dto.kind === 'CARRIER' ? {} : { carrierServiceId: null }),
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

  /** The fee the shop agreed for a delivery; see `agreeDeliveryFee`. */
  async setDeliveryFee(storeSlug: string, userId: string, number: number, { deliveryFeeCents }: SetOrderDeliveryFeeDto): Promise<Order> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    // Money that arrived at the total as it was must be known before the total changes.
    await this.payments.hearOf(storeId, number);
    const order = await agreeDeliveryFee(this.prisma, storeId, number, deliveryFeeCents);
    // A charge still waiting was made at the total as it was: it goes, and the next is made at this one.
    await this.payments.release(storeId, order.id);
    return toOrder(await this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE }));
  }

  private notFound(number: number): NotFoundException {
    return new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} in this shop`));
  }
}
