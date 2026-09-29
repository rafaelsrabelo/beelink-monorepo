import type { OrderStatus } from "./order.js";

/* ── an order's conversation: its customer and the shop, about that order (BEELINK-160) ── */

/** Who wrote a message: the order's customer, or the shop. */
export type ConversationAuthor = "CUSTOMER" | "SHOP";

/** One message, as written. Never who at the shop wrote it: to the customer, the shop is the shop. */
export interface ConversationMessage {
  id: string;
  author: ConversationAuthor;
  /** Plain text, drawn as text — never as HTML. */
  body: string;
  /** ISO-8601. */
  createdAt: string;
  /** When the other side read it; null while they have not. ISO-8601. */
  readAt: string | null;
}

/**
 * A conversation's head: the order it is about, and whether it takes messages — while the order is
 * on its way; once delivered or cancelled it is history, readable by both sides.
 */
export interface ConversationOrder {
  number: number;
  status: OrderStatus;
  open: boolean;
}

/** A conversation as its customer reads it: every message, oldest first, and how many from the shop they have not read. */
export interface CustomerConversation {
  order: ConversationOrder;
  messages: ConversationMessage[];
  unread: number;
}

/** The last message, for a list. */
export interface ConversationLastMessage {
  author: ConversationAuthor;
  body: string;
  createdAt: string;
}

/** A row of the customer's conversations at a shop. */
export interface CustomerConversationSummary {
  order: ConversationOrder;
  lastMessage: ConversationLastMessage;
  unread: number;
}

/** The customer, as the shop's side of a conversation names them. */
export interface ConversationCustomer {
  id: string;
  name: string;
}

/** A conversation as the shop reads it: the customer, every message, and how many from the customer it has not read. */
export interface ShopConversation {
  order: ConversationOrder;
  customer: ConversationCustomer;
  messages: ConversationMessage[];
  unread: number;
}

/** A row of the shop's conversations. */
export interface ShopConversationSummary {
  order: ConversationOrder;
  customer: ConversationCustomer;
  lastMessage: ConversationLastMessage;
  unread: number;
}

/** Which of the shop's conversations: on an order still on its way, with unread messages, or every one. */
export type ShopConversationFilter = "OPEN" | "UNREAD" | "ALL";

/** How the panel asks for a page of conversations. Absent means all, most recent message first. */
export interface ShopConversationQuery {
  filter?: ShopConversationFilter;
  /** An order number, or part of the customer's name. */
  q?: string;
  page?: number;
}

export interface ShopConversationPage {
  conversations: ShopConversationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

/** What the panel's bell counts: unread messages, and the conversations they are in. */
export interface ShopConversationUnread {
  messages: number;
  conversations: number;
}

/** A message to send: plain text, 1 to 2000 characters once trimmed. */
export interface SendConversationMessagePayload {
  body: string;
}

export type ConversationErrorCode =
  /** The order was delivered or cancelled: its conversation is history now, and takes no message. */
  | "ORDER_CONVERSATION_CLOSED"
  /** The shop answers a conversation its customer opened; there is none on this order yet. */
  | "ORDER_CONVERSATION_NOT_FOUND";
