// Types
import type { Order, OrderCoupon, OrderCustomer, OrderSummary } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { toOrderCashback } from '../cashback/cashback.mapper.js';
import { toDeliveryAddress } from './order-delivery.js';
import { toShopDelivery } from './order-tracking.js';

const customerSelect = { id: true, name: true, phone: true } as const;

/**
 * What a full order is read with. Not the customer's address: an order says where it went, from its
 * own columns, and the record's address of today is not that.
 */
export const ORDER_INCLUDE = {
  customer: { select: customerSelect },
  items: { orderBy: { position: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
  delivery: true,
  cashbackCredit: true,
} as const satisfies Prisma.OrderInclude;

/** What a row of the list is read with: the units, not the lines. */
export const ORDER_SUMMARY_INCLUDE = {
  customer: { select: customerSelect },
  items: { select: { quantity: true } },
} as const satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;
type OrderSummaryRow = Prisma.OrderGetPayload<{ include: typeof ORDER_SUMMARY_INCLUDE }>;

function toCustomer(customer: { id: string; name: string; phone: string | null }): OrderCustomer {
  return { id: customer.id, name: customer.name, phone: customer.phone };
}

/** The coupon as the order photographed it; the two columns are set together or not at all. */
export function toOrderCoupon(row: { couponCode: string | null; couponKind: OrderCoupon['kind'] | null }): OrderCoupon | null {
  return row.couponCode !== null && row.couponKind !== null ? { code: row.couponCode, kind: row.couponKind } : null;
}

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customer: toCustomer(row.customer),
    fulfillment: row.fulfillment,
    deliveryAddress: toDeliveryAddress(row),
    paymentMethod: row.paymentMethod,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      productName: item.productName,
      variantLabel: item.variantLabel,
      sku: item.sku,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
      lineTotalCents: item.lineTotalCents,
      discountCents: item.discountCents,
      promotionName: item.promotionName,
    })),
    subtotalCents: row.subtotalCents,
    deliveryFeeCents: row.deliveryFeeCents,
    discountCents: row.discountCents,
    promotionDiscountCents: row.promotionDiscountCents,
    couponDiscountCents: row.couponDiscountCents,
    coupon: toOrderCoupon(row),
    cashback: toOrderCashback(row),
    cashbackUsedCents: row.cashbackUsedCents,
    totalCents: row.totalCents,
    note: row.note,
    placedAt: row.placedAt.toISOString(),
    events: row.events.map((event) => ({ status: event.status, actor: event.actor, at: event.createdAt.toISOString() })),
    delivery: row.delivery ? toShopDelivery(row.delivery) : null,
    createdAt: row.createdAt.toISOString(),
  } satisfies Order;
}

export function toOrderSummary(row: OrderSummaryRow): OrderSummary {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customer: toCustomer(row.customer),
    fulfillment: row.fulfillment,
    paymentMethod: row.paymentMethod,
    totalCents: row.totalCents,
    deliveryFeeCents: row.deliveryFeeCents,
    itemsCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    placedAt: row.placedAt.toISOString(),
  } satisfies OrderSummary;
}
