import type { ConversationAuthor } from "./conversation.js";
import type { OrderPlacedBy, OrderStatus } from "./order.js";
import type { OrderPaymentStatus, StrayPaymentReason } from "./payment.js";

/* ── the real-time channel: it only says what changed; the REST says how (BEELINK-161) ── */

/**
 * What the channel tells a room. The least that names what to read again — never the content,
 * which comes from the REST with the checks it always has.
 */
export type RealtimeEvent =
  /** Who placed it: the panel tells only of what came from outside (BEELINK-163). */
  | { type: "order.created"; orderNumber: number; placedBy: OrderPlacedBy }
  | { type: "order.status"; orderNumber: number; status: OrderStatus }
  /**
   * Where the order's charge stands changed, as Asaas told it (BEELINK-206). `stray` names money
   * that arrived and is not the order's payment — the one thing here the shop must act on.
   */
  | { type: "order.payment"; orderNumber: number; status: OrderPaymentStatus; stray: StrayPaymentReason | null }
  | { type: "conversation.message"; orderNumber: number; author: ConversationAuthor }
  | { type: "conversation.read"; orderNumber: number; reader: ConversationAuthor }
  | { type: "conversation.closed"; orderNumber: number };

/** A pass to the channel: short and single-use, asked for by the web's server with the session in its cookies. */
export interface RealtimeTicket {
  ticket: string;
  /** ISO-8601. */
  expiresAt: string;
}

/**
 * The refusal a socket reads in `connect_error`: a ticket unknown, taken already, past its minute,
 * or of a session that has ended since.
 */
export type RealtimeErrorCode = "REALTIME_TICKET_INVALID";
