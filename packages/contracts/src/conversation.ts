import type { OrderFulfillment, OrderStatus } from "./order.js";

/* ── an order's conversation: its customer and the shop, about that order (BEELINK-160) ── */

/** Who wrote a message: the order's customer, or the shop. */
export type ConversationAuthor = "CUSTOMER" | "SHOP";

/** One message, as written. Never who at the shop wrote it: to the customer, the shop is the shop. */
export interface ConversationWrittenMessage {
  kind: "MESSAGE";
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
 * The order moved (BEELINK-236): the status it moved to, never a sentence — each side words it for
 * its own reader. Unread for the customer until they read it; never unread for the shop.
 */
export interface ConversationStatusNotice {
  kind: "STATUS";
  id: string;
  status: OrderStatus;
  /** On a cancellation's notice: bee-link cancelled it because nobody paid it in time (BEELINK-207). False on every other. */
  unpaid: boolean;
  /** On a delivery's notice, the cashback it made usable (BEELINK-239), as it was then; null otherwise. */
  cashbackCents: number | null;
  /** ISO-8601. */
  createdAt: string;
  /** When the customer read it; null while they have not. ISO-8601. */
  readAt: string | null;
}

/**
 * The order's online payment was approved (BEELINK-207): told once an order, with no sentence — each
 * side words it. Unread for the customer until they read it; never unread for the shop.
 */
export interface ConversationPaymentNotice {
  kind: "PAYMENT";
  id: string;
  /** ISO-8601. */
  createdAt: string;
  /** When the customer read it; null while they have not. ISO-8601. */
  readAt: string | null;
}

/**
 * Money of the order's payment was given back (BEELINK-208): told once a refund, when Asaas takes
 * it, with the amount and no sentence. Unread for the customer until they read it.
 */
export interface ConversationRefundNotice {
  kind: "REFUND";
  id: string;
  /** Whole cents. */
  amountCents: number;
  /** ISO-8601. */
  createdAt: string;
  /** When the customer read it; null while they have not. ISO-8601. */
  readAt: string | null;
}

export type ConversationMessage = ConversationWrittenMessage | ConversationStatusNotice | ConversationPaymentNotice | ConversationRefundNotice;

/**
 * A conversation's head: the order it is about, and whether it takes messages — while the order is
 * on its way; once delivered or cancelled it is history, readable by both sides.
 */
export interface ConversationOrder {
  number: number;
  status: OrderStatus;
  /** How it is handed over: a pick-up's end is "picked up", not "delivered". */
  fulfillment: OrderFulfillment;
  open: boolean;
}

/** A conversation as its customer reads it: every message, oldest first, and how many from the shop they have not read. */
export interface CustomerConversation {
  order: ConversationOrder;
  messages: ConversationMessage[];
  unread: number;
}

/** The last message, for a list: written, the notice of a status, or of a payment approved. */
export type ConversationLastMessage =
  | { kind: "MESSAGE"; author: ConversationAuthor; body: string; createdAt: string }
  | { kind: "STATUS"; status: OrderStatus; unpaid: boolean; createdAt: string }
  | { kind: "PAYMENT"; createdAt: string }
  | { kind: "REFUND"; amountCents: number; createdAt: string };

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
  /**
   * Whether they still have an account at the shop to read an answer. False once they deleted it
   * (BEELINK-152): the conversation stays the shop's history, and takes no answer.
   */
  hasAccount: boolean;
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
  /** There is no conversation on this order: its customer has no account at the shop to read one. */
  | "ORDER_CONVERSATION_NOT_FOUND";
