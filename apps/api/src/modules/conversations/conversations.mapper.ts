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

function toLastMessage(row: MessageRow): ConversationLastMessage {
  return { author: row.author, body: row.body, createdAt: row.createdAt.toISOString() };
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

/** What a list row is read with: the order, its last message, and the reader's unread count. */
export function summaryInclude(reader: 'CUSTOMER' | 'SHOP') {
  return {
    order: { select: { number: true, status: true, customer: { select: { id: true, name: true } } } },
    messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    _count: { select: { messages: { where: { author: reader === 'CUSTOMER' ? 'SHOP' : 'CUSTOMER', readAt: null } } } },
  } as const satisfies Prisma.OrderConversationInclude;
}

type SummaryRow = Prisma.OrderConversationGetPayload<{ include: ReturnType<typeof summaryInclude> }>;

export function toCustomerSummary(row: SummaryRow): CustomerConversationSummary {
  return { order: toOrderHead(row.order), lastMessage: toLastMessage(row.messages[0]!), unread: row._count.messages };
}

export function toShopSummary(row: SummaryRow): ShopConversationSummary {
  return {
    order: toOrderHead(row.order),
    customer: { id: row.order.customer.id, name: row.order.customer.name },
    lastMessage: toLastMessage(row.messages[0]!),
    unread: row._count.messages,
  };
}
