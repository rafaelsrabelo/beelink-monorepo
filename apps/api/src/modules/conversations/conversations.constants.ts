// Types
import type { ConversationErrorCode, OrderErrorCode, OrderStatus, ShopConversationFilter } from '@harness-monorepo/contracts';

// App
import { OPEN_ORDER_STATUSES } from '../orders/orders.constants.js';

/** A message's text, at most: the column's length, counted as Postgres counts it. */
export const MESSAGE_MAX_LENGTH = 2000;

export const SHOP_CONVERSATIONS_PAGE_SIZE = 20;
/** Far past any shop's conversations; past it, an offset that would only strain the database. */
export const SHOP_CONVERSATIONS_PAGE_MAX = 10_000;
/** The customer's list is short by nature — their orders at one shop — and read whole. */
export const CUSTOMER_CONVERSATIONS_MAX = 50;

export const SHOP_CONVERSATION_FILTERS = ['OPEN', 'UNREAD', 'ALL'] as const satisfies readonly ShopConversationFilter[];

/** A conversation takes messages while its order is open: on its way. Delivered or cancelled, it is history. */
export function isOpen(status: OrderStatus): boolean {
  return OPEN_ORDER_STATUSES.includes(status);
}

/** Who reads a conversation: its customer, or the shop. */
export type ConversationReader = 'CUSTOMER' | 'SHOP';

/**
 * What is unread for a reader, by author: the customer is told of the shop's answers and of the
 * order's moves; the shop only of the customer's messages — a move is the shop's own doing.
 */
export const UNREAD_AUTHORS: Record<ConversationReader, readonly ('CUSTOMER' | 'SHOP' | 'SYSTEM')[]> = {
  CUSTOMER: ['SHOP', 'SYSTEM'],
  SHOP: ['CUSTOMER'],
};

/** Written by someone: the shop's list shows a conversation only once a person has said something in it. */
export const WRITTEN_AUTHORS = ['CUSTOMER', 'SHOP'] as const;

export function conversationError(
  errorCode: ConversationErrorCode | Extract<OrderErrorCode, 'ORDER_NOT_FOUND'>,
  message: string,
): { errorCode: string; message: string } {
  return { errorCode, message };
}
