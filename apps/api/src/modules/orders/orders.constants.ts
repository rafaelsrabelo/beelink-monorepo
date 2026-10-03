// Types
import type { CustomerOrderSituation, OrderDeliveryKind, OrderErrorCode, OrderFulfillment, OrderShippingChoice, OrderStatus } from '@harness-monorepo/contracts';

export const ORDER_STATUSES = [
  'RECEIVED',
  'ACCEPTED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const satisfies readonly OrderStatus[];

export const ORDER_FULFILLMENTS = ['DELIVERY', 'PICKUP'] as const satisfies readonly OrderFulfillment[];
export const SHIPPING_CHOICE_KINDS = ['OWN_DELIVERY', 'CARRIER'] as const satisfies readonly OrderShippingChoice['kind'][];

export const ORDER_DELIVERY_KINDS = ['OWN', 'CARRIER'] as const satisfies readonly OrderDeliveryKind[];

export const ORDERS_PAGE_SIZE = 20;
/** The customer's list is cards, not rows: fewer to a page. */
export const CUSTOMER_ORDERS_PAGE_SIZE = 10;
export const CUSTOMER_ORDERS_PAGE_SIZE_MAX = 50;

/** The customer's tabs, and the statuses each one holds. */
export const CUSTOMER_ORDER_SITUATIONS = {
  ACTIVE: ['RECEIVED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'],
  DELIVERED: ['DELIVERED'],
  CANCELLED: ['CANCELLED'],
} as const satisfies Record<CustomerOrderSituation, readonly OrderStatus[]>;
export const ORDERS_PAGE_SIZE_MAX = 100;
/** Far past any shop's history; past it, an offset that would only strain the database. */
export const ORDERS_PAGE_MAX = 10_000;

/** The largest order number a column holds (INT4). A number past it names no order. */
export const ORDER_NUMBER_MAX = 2_147_483_647;

/** A shop's order, not a warehouse's: past these, a body is a mistake or an attack. */
export const ORDER_ITEMS_MAX = 100;
export const ORDER_QUANTITY_MAX = 999;
export const ORDER_NOTE_MAX_LENGTH = 500;
/** R$ 1.000.000,00 — a fee or a discount beyond it is a typo with too many zeros. */
export const ORDER_AMOUNT_MAX_CENTS = 100_000_000;

/** As a coupon's code is bounded, with room for what a person pastes around it; past it, not a code. */
export const ORDER_COUPON_CODE_MAX_LENGTH = 60;

/** A clock a minute ahead of the server's is not an order placed in the future. */
export const PLACED_AT_SKEW_MS = 60_000;

export function orderError(errorCode: OrderErrorCode, message: string): { errorCode: OrderErrorCode; message: string } {
  return { errorCode, message };
}
