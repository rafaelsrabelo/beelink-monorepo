// Types
import type { Order, OrderCustomer, OrderSummary } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

const customerSelect = { id: true, name: true, phone: true } as const;

/** What a full order is read with. */
export const ORDER_INCLUDE = {
  customer: { select: customerSelect },
  items: { orderBy: { position: 'asc' } },
  events: { orderBy: { createdAt: 'asc' } },
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

export function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    number: row.number,
    status: row.status,
    customer: toCustomer(row.customer),
    fulfillment: row.fulfillment,
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
    })),
    subtotalCents: row.subtotalCents,
    deliveryFeeCents: row.deliveryFeeCents,
    discountCents: row.discountCents,
    totalCents: row.totalCents,
    note: row.note,
    placedAt: row.placedAt.toISOString(),
    events: row.events.map((event) => ({ status: event.status, actor: event.actor, at: event.createdAt.toISOString() })),
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
    itemsCount: row.items.reduce((sum, item) => sum + item.quantity, 0),
    placedAt: row.placedAt.toISOString(),
  } satisfies OrderSummary;
}
