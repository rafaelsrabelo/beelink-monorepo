// Types
import type {
  ConversationLastMessage,
  ConversationMessage,
  ConversationOrder,
  CustomerConversation,
  CustomerConversationSummary,
  OrderStatus,
  ShopConversation,
  ShopConversationSummary,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { isOpen } from './conversations.constants.js';

type MessageRow = Prisma.OrderMessageGetPayload<object>;

/** A message as both sides read it: never the account that wrote it. */
export function toMessage(row: MessageRow): ConversationMessage {
  return { id: row.id, author: row.author, body: row.body, createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null };
}

export function toOrderHead(order: { number: number; status: OrderStatus }): ConversationOrder {
  return { number: order.number, status: order.status, open: isOpen(order.status) };
}

/** Unread, from where the reader sits: the other side's messages they have not read. */
function unreadOf(messages: readonly MessageRow[], reader: 'CUSTOMER' | 'SHOP'): number {
  return messages.filter((message) => message.author !== reader && message.readAt === null).length;
}

export function toCustomerConversation(order: { number: number; status: OrderStatus }, messages: readonly MessageRow[]): CustomerConversation {
  return { order: toOrderHead(order), messages: messages.map(toMessage), unread: unreadOf(messages, 'CUSTOMER') };
}

export function toShopConversation(
  order: { number: number; status: OrderStatus; customer: { id: string; name: string } },
  messages: readonly MessageRow[],
): ShopConversation {
  return {
    order: toOrderHead(order),
    customer: { id: order.customer.id, name: order.customer.name },
    messages: messages.map(toMessage),
    unread: unreadOf(messages, 'SHOP'),
  };
}

/** What a list row is read with: the conversation and its order. Its last message and unread count are read apart, bounded to the page. */
export const summarySelect = {
  id: true,
  lastMessageAt: true,
  order: { select: { number: true, status: true, customer: { select: { id: true, name: true } } } },
} as const satisfies Prisma.OrderConversationSelect;

export type SummaryRow = Prisma.OrderConversationGetPayload<{ select: typeof summarySelect }>;

/** A conversation's last message, as the list query reads it. */
export interface LastMessageRow {
  conversationId: string;
  author: 'CUSTOMER' | 'SHOP';
  body: string;
  createdAt: Date;
}

function toLastMessage(row: LastMessageRow): ConversationLastMessage {
  return { author: row.author, body: row.body, createdAt: row.createdAt.toISOString() };
}

export function toCustomerSummary(row: SummaryRow, last: LastMessageRow, unread: number): CustomerConversationSummary {
  return { order: toOrderHead(row.order), lastMessage: toLastMessage(last), unread };
}

export function toShopSummary(row: SummaryRow, last: LastMessageRow, unread: number): ShopConversationSummary {
  return { order: toOrderHead(row.order), customer: { id: row.order.customer.id, name: row.order.customer.name }, lastMessage: toLastMessage(last), unread };
}
