// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { CreateOrderItemInput, OrderActor, OrderFulfillment, OrderStatus, PaymentMethod, ShippingWindow } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { earningForOrder, holdOrderCashback } from '../cashback/cashback-orders.js';
import { redeemCashback } from '../cashback/cashback-redemption.js';
import { noteOrderStatus } from '../conversations/order-status-notice.js';
import { refreshBooks } from '../customers/customer-books.js';
import { lockCustomer } from '../customers/customer-lock.js';
import { redeemCoupon } from '../promotions/order-discounts.js';
import { deliveryOf, deliveryWindowColumnsOf } from './order-delivery.js';
import { readOrderLines } from './order-lines.js';
import { cashbackRefused, couponRefused, earningPartsOf, priceOrder } from './order-pricing.js';
import { oweStatusEmail } from './order-status-email.js';
import { OrderStatusMailer } from './order-status-mailer.js';
import { takeStock } from './order-stock.js';
import { orderError } from './orders.constants.js';
import { ORDER_INCLUDE } from './orders.mapper.js';

type Tx = Prisma.TransactionClient;

/** Everything an order is placed with, whoever places it. */
export interface Placement {
  storeId: string;
  items: readonly CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  /** The customer's saved address a delivery goes to; null is their default. */
  addressId: string | null;
  paymentMethod: PaymentMethod;
  /** Null for a delivery whose fee the shop has not told yet. */
  deliveryFeeCents: number | null;
  /** When the quote said a delivery would arrive (BEELINK-178); null where nothing was quoted. */
  deliveryWindow: ShippingWindow | null;
  /** What the shopkeeper typed, beyond the promotions and the coupon; zero from the cart. */
  discountCents: number;
  /** As it was typed; null is none. One that does not hold refuses the order. */
  couponCode: string | null;
  /** The customer's credit to spend, as the quote offered it; 0 is none. More than they can spend now refuses the order. */
  cashbackCents: number;
  note: string | null;
  placedAt: Date;
  /** The shopkeeper registers a sale they already agreed, `ACCEPTED`; a customer's order waits, `RECEIVED`. */
  status: Extract<OrderStatus, 'RECEIVED' | 'ACCEPTED'>;
  actor: Extract<OrderActor, 'SHOPKEEPER' | 'CUSTOMER'>;
  /** The account behind it. */
  userId: string;
  /**
   * Only what the shop window sells: a product put back in draft is off sale to a shopper. The
   * shopkeeper may still register a sale of one of their own drafts.
   */
  onSaleOnly: boolean;
  /** Who it is for, inside the transaction: a customer registered with the order goes back with a refusal. */
  customerOf: (tx: Tx) => Promise<string>;
}

export type PlacedOrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/**
 * Writing an order — the panel's and the cart's alike, so both refuse the same things.
 *
 * One transaction first bumps the shop's order counter, which holds the shop's row until the
 * commit: two orders placed at once wait for each other, get consecutive numbers, and see each
 * other's effect on a customer's books, on the stock and on a coupon's uses. A refusal anywhere
 * inside takes the number, the stock and a customer registered with it back together.
 *
 * The order is priced inside it (`priceOrder`), at the instant it is placed: the promotions running
 * then, and the coupon read under its row's lock, so its limit is the one the use is written against.
 * A first purchase is said under the customer's own lock (BEELINK-245): of two orders of one
 * customer placed at once, the second reads the first, and only one is priced as a first purchase.
 */
@Injectable()
export class OrderPlacement {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: OrderStatusMailer,
  ) {}

  async place(placement: Placement): Promise<PlacedOrderRow> {
    const { storeId, status, actor, userId } = placement;
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { paymentMethods: true } });
    if (!store.paymentMethods.includes(placement.paymentMethod)) {
      throw new BadRequestException(orderError('ORDER_PAYMENT_NOT_ACCEPTED', 'The shop does not take that payment'));
    }

    const lines = await readOrderLines(this.prisma, storeId, placement.items, placement.onSaleOnly);

    const placed = await this.prisma.$transaction(async (tx) => {
      // One instant for the credit it counts and the credit it spends.
      const now = new Date();
      const number = await this.nextNumber(tx, storeId);
      const customerId = await placement.customerOf(tx);
      // The customer's row before the products', the order a like and a cancellation take them in:
      // a like holding the customer while it waits on a product this order holds would otherwise
      // deadlock against the order's own writes to the customer — their books, their credit.
      await lockCustomer(tx, customerId);
      // Before the order is written: a line the stock cannot cover refuses the whole order.
      await takeStock(tx, lines);
      const delivery = await deliveryOf(tx, customerId, placement.fulfillment, placement.addressId);
      const priced = await priceOrder(tx, {
        storeId,
        lines,
        fulfillment: placement.fulfillment,
        deliveryFeeCents: placement.deliveryFeeCents,
        manualDiscountCents: placement.discountCents,
        couponCode: placement.couponCode,
        customer: { id: customerId },
        at: placement.placedAt,
        lock: true,
        cashback: placement.cashbackCents,
        now,
      });
      if (priced.refusal) throw couponRefused(priced.refusal);
      if (priced.cashbackUse?.refusal) throw cashbackRefused(priced.cashbackUse.refusal);
      const cashbackUsedCents = priced.cashbackUse?.appliedCents ?? 0;
      // What it will earn, at the shop's rules as they are now (BEELINK-239).
      const cashback = await earningForOrder(tx, storeId, earningPartsOf(priced, cashbackUsedCents));

      const order = await tx.order.create({
        data: {
          storeId,
          number,
          customerId,
          status,
          fulfillment: placement.fulfillment,
          paymentMethod: placement.paymentMethod,
          ...delivery,
          ...deliveryWindowColumnsOf(placement.fulfillment === 'DELIVERY' ? placement.deliveryWindow : null),
          ...priced.totals,
          promotionDiscountCents: priced.promotionDiscountCents,
          couponDiscountCents: priced.couponDiscountCents,
          couponCode: priced.coupon?.code ?? null,
          couponKind: priced.coupon?.kind ?? null,
          cashbackEarnedCents: cashback?.earnedCents ?? 0,
          cashbackRateBps: cashback?.rateBps ?? null,
          note: placement.note,
          placedAt: placement.placedAt,
          stockTaken: true,
          items: {
            create: lines.map(({ categoryIds: _categories, ...line }, position) => ({
              ...line,
              lineTotalCents: line.unitPriceCents * line.quantity,
              discountCents: priced.lineDiscounts[position]!.discountCents,
              promotionId: priced.lineDiscounts[position]!.promotion?.id ?? null,
              promotionName: priced.lineDiscounts[position]!.promotion?.name ?? null,
              position,
            })),
          },
          events: { create: { status, actor, userId } },
        },
        select: { id: true },
      });

      if (priced.coupon) await redeemCoupon(tx, priced.coupon.id, order.id, priced.couponDiscountCents);
      if (cashbackUsedCents > 0) await redeemCashback(tx, { storeId, customerId, orderId: order.id, cents: cashbackUsedCents, now });
      if (cashback) await holdOrderCashback(tx, { storeId, customerId, orderId: order.id, earnedCents: cashback.earnedCents, validityDays: cashback.validityDays });
      await refreshBooks(tx, customerId);
      // The conversation is born with the order, its first status the first line. Told now, whatever
      // day the shopkeeper dated the sale; not news to a customer who placed it themselves.
      await noteOrderStatus(tx, { order: { id: order.id, customerId }, status, at: new Date(), seen: actor === 'CUSTOMER' });
      // A sale the shopkeeper registers is born accepted, which the customer hears of like any move.
      const owed = await oweStatusEmail(tx, { order: { id: order.id, customerId }, status, byCustomer: actor === 'CUSTOMER' });
      // Read once everything placing it did is written: its cashback's lot included.
      return { order: await tx.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE }), owed };
    });
    if (placed.owed) this.mailer.dispatch();
    return placed.order;
  }

  /**
   * The shop's next order number, taken under the lock of the shop's row until the commit. Raw SQL
   * so the shop's `updatedAt` stays the shopkeeper's: an order is not an edit of the shop.
   */
  private async nextNumber(tx: Tx, storeId: string): Promise<number> {
    const [row] = await tx.$queryRaw<{ orderSequence: number }[]>`
      UPDATE "stores" SET "orderSequence" = "orderSequence" + 1 WHERE "id" = ${storeId}::uuid RETURNING "orderSequence"`;
    return row!.orderSequence;
  }
}
