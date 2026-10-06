// Types
import type {
  OrderCashback,
  CustomerOrder,
  CustomerOrderItem,
  CustomerOrderSummary,
  OrderCancelledBy,
  OrderPlacedBy,
  OrderStatus,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { toOrderCashback } from '../cashback/cashback.mapper.js';
import { toOrderPayment, toPaymentBrief } from '../payments/payment.mapper.js';
import { toDeliveryAddress, toDeliveryWindow } from './order-delivery.js';
import { toCustomerDelivery } from './order-tracking.js';
import { toOrderCoupon } from './orders.mapper.js';

/** How many lines a card of the customer's list shows; the rest are "+ N itens". */
export const CUSTOMER_ORDER_CARD_ITEMS = 3;

/**
 * A line, with the photo it has today — the combination's own, else the product's first — and the
 * product's status: its page opens only while it is on sale, so a line leads there only then.
 */
const itemInclude = {
  variant: { select: { imageUrl: true } },
  product: { select: { slug: true, status: true, images: { orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 1, select: { url: true } } } },
} as const satisfies Prisma.OrderItemInclude;

/**
 * What an order is read with for its customer: never the customer record, whose books are the
 * shop's. The events are read for when and — for "cancelled by" and "placed by" — whose side, which
 * is all of the actor the customer is told.
 */
export const CUSTOMER_ORDER_INCLUDE = {
  items: { orderBy: { position: 'asc' }, include: itemInclude },
  events: { orderBy: { createdAt: 'asc' }, select: { status: true, actor: true, createdAt: true } },
  delivery: true,
  cashbackCredit: true,
  payments: true,
  refunds: true,
} as const satisfies Prisma.OrderInclude;

type CustomerOrderRow = Prisma.OrderGetPayload<{ include: typeof CUSTOMER_ORDER_INCLUDE }>;
type EventRow = CustomerOrderRow['events'][number];

function toItem(item: CustomerOrderRow['items'][number]): CustomerOrderItem {
  return {
    productId: item.productId,
    productSlug: item.product?.status === 'ACTIVE' ? item.product.slug : null,
    productName: item.productName,
    variantLabel: item.variantLabel,
    imageUrl: item.variant?.imageUrl ?? item.product?.images[0]?.url ?? null,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    lineTotalCents: item.lineTotalCents,
    discountCents: item.discountCents,
    promotionName: item.promotionName,
  };
}

/** The window a delivery should arrive in, for the list's card: only once the shop told both days. */
function estimateOf(delivery: CustomerOrderRow['delivery']): CustomerOrderSummary['estimate'] {
  const told = delivery ? toCustomerDelivery(delivery) : null;
  return told?.estimateFrom && told.estimateTo ? { from: told.estimateFrom, to: told.estimateTo } : null;
}

/** The customer's side or the shop's: the courier and the system speak for the shop. */
function sideOf(actor: EventRow['actor']): OrderPlacedBy {
  return actor === 'CUSTOMER' ? 'CUSTOMER' : 'SHOP';
}

/** Who cancelled: bee-link itself is told apart — it cancels for want of payment alone (BEELINK-208). */
function cancellerOf(actor: EventRow['actor']): OrderCancelledBy {
  return actor === 'SYSTEM' ? 'SYSTEM' : sideOf(actor);
}

/** The facts the customer is told about who acted: who placed it, and who cancelled it. */
function sidesOf(status: OrderStatus, events: readonly EventRow[]): { placedBy: OrderPlacedBy; cancelledBy: OrderCancelledBy | null } {
  const cancelled = status === 'CANCELLED' ? events.findLast((event) => event.status === 'CANCELLED') : undefined;
  return { placedBy: events[0] ? sideOf(events[0].actor) : 'SHOP', cancelledBy: cancelled ? cancellerOf(cancelled.actor) : null };
}

/** The order's cashback as its customer reads it: the shop's reading, less what the shop did not get back. */
function customerCashbackOf(row: CustomerOrderRow): OrderCashback | null {
  const cashback = toOrderCashback(row);
  if (!cashback) return null;
  const { unrecoveredCents: _shops, ...theirs } = cashback;
  return theirs;
}

export function toCustomerOrder(row: CustomerOrderRow): CustomerOrder {
  return {
    number: row.number,
    status: row.status,
    ...sidesOf(row.status, row.events),
    fulfillment: row.fulfillment,
    deliveryAddress: toDeliveryAddress(row),
    paymentMethod: row.paymentMethod,
    paymentChannel: row.paymentChannel,
    installments: row.paymentInstallments,
    payment: toOrderPayment(row.payments, row.refunds),
    items: row.items.map(toItem),
    subtotalCents: row.subtotalCents,
    deliveryFeeCents: row.deliveryFeeCents,
    discountCents: row.discountCents,
    promotionDiscountCents: row.promotionDiscountCents,
    couponDiscountCents: row.couponDiscountCents,
    coupon: toOrderCoupon(row),
    cashback: customerCashbackOf(row),
    cashbackUsedCents: row.cashbackUsedCents,
    totalCents: row.totalCents,
    placedAt: row.placedAt.toISOString(),
    events: row.events.map((event) => ({ status: event.status, at: event.createdAt.toISOString() })),
    delivery: row.delivery ? toCustomerDelivery(row.delivery) : null,
    deliveryWindow: toDeliveryWindow(row),
  } satisfies CustomerOrder;
}

export function toCustomerOrderSummary(row: CustomerOrderRow): CustomerOrderSummary {
  const reached = row.events.findLast((event) => event.status === row.status);

  return {
    number: row.number,
    status: row.status,
    ...sidesOf(row.status, row.events),
    statusAt: (reached?.createdAt ?? row.placedAt).toISOString(),
    fulfillment: row.fulfillment,
    recipientName: toDeliveryAddress(row)?.recipientName ?? null,
    paymentMethod: row.paymentMethod,
    paymentChannel: row.paymentChannel,
    payment: toPaymentBrief(row.payments),
    totalCents: row.totalCents,
    deliveryFeeCents: row.deliveryFeeCents,
    discountCents: row.discountCents,
    coupon: toOrderCoupon(row),
    cashback: customerCashbackOf(row),
    cashbackUsedCents: row.cashbackUsedCents,
    itemsCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    items: row.items.slice(0, CUSTOMER_ORDER_CARD_ITEMS).map(toItem),
    moreItems: Math.max(row.items.length - CUSTOMER_ORDER_CARD_ITEMS, 0),
    placedAt: row.placedAt.toISOString(),
    estimate: estimateOf(row.delivery),
  } satisfies CustomerOrderSummary;
}
