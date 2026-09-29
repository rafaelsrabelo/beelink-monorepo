import type { ConversationAuthor } from "./conversation.js";
import type { OrderStatus } from "./order.js";

/* ── the real-time channel: it only says what changed; the REST says how (BEELINK-161) ── */

/**
 * What the channel tells a room. The least that names what to read again — never the content,
 * which comes from the REST with the checks it always has.
 */
export type RealtimeEvent =
  | { type: "order.created"; orderNumber: number }
  | { type: "order.status"; orderNumber: number; status: OrderStatus }
  | { type: "conversation.message"; orderNumber: number; author: ConversationAuthor }
  | { type: "conversation.read"; orderNumber: number; reader: ConversationAuthor }
  | { type: "conversation.closed"; orderNumber: number };

/** A pass to the channel: short and single-use, asked for by the web's server with the session in its cookies. */
export interface RealtimeTicket {
  ticket: string;
  /** ISO-8601. */
  expiresAt: string;
}
