/* ── the panel's menu: what waits in each area of a shop, as numbers (BEELINK-309) ── */

/**
 * What the panel's menu counts beside its items, in one answer. Each is the count of its own area —
 * the bell is the general feed; these say how much is still on the shop's hands, area by area.
 * Another area joins as one more field here.
 */
export interface PanelCounts {
  /** Orders still asking something of the shop: every status but delivered and cancelled. */
  openOrders: number;
  /** Conversations holding a customer's message the shop has not read. */
  unreadConversations: number;
  /** Those messages themselves, which is what the bell adds up. */
  unreadMessages: number;
  /** Reviews written since the owner last opened their list, hidden or not. */
  unseenReviews: number;
}
