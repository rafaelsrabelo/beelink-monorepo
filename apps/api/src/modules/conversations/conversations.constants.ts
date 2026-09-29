// Types
import type { ConversationErrorCode, OrderErrorCode, OrderStatus, ShopConversationFilter } from '@harness-monorepo/contracts';

// App
import { CUSTOMER_ORDER_SITUATIONS } from '../orders/orders.constants.js';

/** A message's text, at most: the column's length, counted as Postgres counts it. */
export const MESSAGE_MAX_LENGTH = 2000;

export const SHOP_CONVERSATIONS_PAGE_SIZE = 20;
/** Far past any shop's conversations; past it, an offset that would only strain the database. */
export const SHOP_CONVERSATIONS_PAGE_MAX = 10_000;
/** The customer's list is short by nature — their orders at one shop — and read whole. */
export const CUSTOMER_CONVERSATIONS_MAX = 50;

export const SHOP_CONVERSATION_FILTERS = ['OPEN', 'UNREAD', 'ALL'] as const satisfies readonly ShopConversationFilter[];

/** The statuses a conversation takes messages in: the order on its way. Delivered or cancelled, it is history. */
export const OPEN_ORDER_STATUSES: readonly OrderStatus[] = CUSTOMER_ORDER_SITUATIONS.ACTIVE;

export function isOpen(status: OrderStatus): boolean {
  return OPEN_ORDER_STATUSES.includes(status);
}

export function conversationError(
  errorCode: ConversationErrorCode | Extract<OrderErrorCode, 'ORDER_NOT_FOUND'>,
  message: string,
): { errorCode: string; message: string } {
  return { errorCode, message };
}
