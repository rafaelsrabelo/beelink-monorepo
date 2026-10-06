// Types
import type {
  ConversationCustomer,
  ConversationLastMessage,
  ConversationMessage,
  ConversationOrder,
  CustomerConversation,
  CustomerConversationSummary,
  OrderFulfillment,
  OrderStatus,
  ShopConversation,
  ShopConversationSummary,
} from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { isOpen, UNREAD_AUTHORS, type ConversationReader } from './conversations.constants.js';

type MessageRow = Prisma.OrderMessageGetPayload<object>;

/** The head a conversation is read with: enough of the order to word it. */
interface OrderHeadRow {
  number: number;
  status: OrderStatus;
  fulfillment: OrderFulfillment;
}

/** A message as both sides read it: never the account that wrote it. A notice is what it tells of alone. */
export function toMessage(row: MessageRow): ConversationMessage {
  const readAt = row.readAt?.toISOString() ?? null;
  const createdAt = row.createdAt.toISOString();
  if (row.author === 'SYSTEM' && row.notice === 'PAYMENT_APPROVED') return { kind: 'PAYMENT', id: row.id, createdAt, readAt };
  // The CHECK on the table holds a notice's status; the fallback only keeps the type honest.
  if (row.author === 'SYSTEM') return { kind: 'STATUS', id: row.id, status: row.status ?? 'RECEIVED', unpaid: row.notice === 'CANCELLED_UNPAID', cashbackCents: row.cashbackCents, createdAt, readAt };
  return { kind: 'MESSAGE', id: row.id, author: row.author, body: row.body, createdAt, readAt };
}

export function toOrderHead(order: OrderHeadRow): ConversationOrder {
  return { number: order.number, status: order.status, fulfillment: order.fulfillment, open: isOpen(order.status) };
}

/** Unread, from where the reader sits: what is theirs to read and they have not. */
function unreadOf(messages: readonly MessageRow[], reader: ConversationReader): number {
  return messages.filter((message) => UNREAD_AUTHORS[reader].includes(message.author) && message.readAt === null).length;
}

export function toCustomerConversation(order: OrderHeadRow, messages: readonly MessageRow[]): CustomerConversation {
  return { order: toOrderHead(order), messages: messages.map(toMessage), unread: unreadOf(messages, 'CUSTOMER') };
}

/** The customer as the shop names them, and whether an answer still has someone to reach. */
function toConversationCustomer(customer: { id: string; name: string; userId: string | null }): ConversationCustomer {
  return { id: customer.id, name: customer.name, hasAccount: customer.userId !== null };
}

export function toShopConversation(order: OrderHeadRow & { customer: { id: string; name: string; userId: string | null } }, messages: readonly MessageRow[]): ShopConversation {
  return {
    order: toOrderHead(order),
    customer: toConversationCustomer(order.customer),
    messages: messages.map(toMessage),
    unread: unreadOf(messages, 'SHOP'),
  };
}

/** What a list row is read with: the conversation and its order. Its last message and unread count are read apart, bounded to the page. */
export const summarySelect = {
  id: true,
  lastMessageAt: true,
  order: { select: { number: true, status: true, fulfillment: true, customer: { select: { id: true, name: true, userId: true } } } },
} as const satisfies Prisma.OrderConversationSelect;

export type SummaryRow = Prisma.OrderConversationGetPayload<{ select: typeof summarySelect }>;

/** A conversation's last message, as the list query reads it. */
export interface LastMessageRow {
  conversationId: string;
  author: 'CUSTOMER' | 'SHOP' | 'SYSTEM';
  body: string;
  status: OrderStatus | null;
  notice: 'PAYMENT_APPROVED' | 'CANCELLED_UNPAID' | null;
  createdAt: Date;
}

function toLastMessage(row: LastMessageRow): ConversationLastMessage {
  const createdAt = row.createdAt.toISOString();
  if (row.author === 'SYSTEM' && row.notice === 'PAYMENT_APPROVED') return { kind: 'PAYMENT', createdAt };
  if (row.author === 'SYSTEM') return { kind: 'STATUS', status: row.status ?? 'RECEIVED', unpaid: row.notice === 'CANCELLED_UNPAID', createdAt };
  return { kind: 'MESSAGE', author: row.author, body: row.body, createdAt };
}

export function toCustomerSummary(row: SummaryRow, last: LastMessageRow, unread: number): CustomerConversationSummary {
  return { order: toOrderHead(row.order), lastMessage: toLastMessage(last), unread };
}

export function toShopSummary(row: SummaryRow, last: LastMessageRow, unread: number): ShopConversationSummary {
  return { order: toOrderHead(row.order), customer: toConversationCustomer(row.order.customer), lastMessage: toLastMessage(last), unread };
}
