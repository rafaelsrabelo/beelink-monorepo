// Types
import type { OrderErrorCode, OrderFulfillment, OrderStatus } from '@harness-monorepo/contracts';

export const ORDER_STATUSES = [
  'RECEIVED',
  'ACCEPTED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const satisfies readonly OrderStatus[];

export const ORDER_FULFILLMENTS = ['DELIVERY', 'PICKUP'] as const satisfies readonly OrderFulfillment[];

export const ORDERS_PAGE_SIZE = 20;
export const ORDERS_PAGE_SIZE_MAX = 100;

/** A shop's order, not a warehouse's: past these, a body is a mistake or an attack. */
export const ORDER_ITEMS_MAX = 100;
export const ORDER_QUANTITY_MAX = 999;
export const ORDER_NOTE_MAX_LENGTH = 500;
/** R$ 1.000.000,00 — a fee or a discount beyond it is a typo with too many zeros. */
export const ORDER_AMOUNT_MAX_CENTS = 100_000_000;

/** A clock a minute ahead of the server's is not an order placed in the future. */
export const PLACED_AT_SKEW_MS = 60_000;

export function orderError(errorCode: OrderErrorCode, message: string): { errorCode: OrderErrorCode; message: string } {
  return { errorCode, message };
}
