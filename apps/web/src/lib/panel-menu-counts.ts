// Types
import type { PanelCounts } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

/** A menu item's live number: where it is read in the counts, and how it is said in words. */
export interface PanelMenuCount {
  of: (counts: PanelCounts) => number
  /** After the item's title, for its accessible name: "Pedidos, 3 em aberto" — a number alone says nothing. */
  label: (count: number, messages: UiMessages) => string
}

const said = (count: number, one: string, many: string) => (count === 1 ? one : format(many, { count: String(count) }))

/**
 * The menu items that carry a number (BEELINK-309), each specific to its area — the bell is the
 * general feed. Another area joins with one entry here, a field in `PanelCounts`, and its name on
 * the item in the shell.
 */
export const PANEL_MENU_COUNTS = {
  /** Orders still on the shop's hands: every status but delivered and cancelled. */
  orders: { of: (counts) => counts.openOrders, label: (count, messages) => said(count, messages.orders.navOpenOne, messages.orders.navOpen) },
  /** Conversations with a customer's message nobody at the shop read. */
  conversations: { of: (counts) => counts.unreadConversations, label: (count, messages) => said(count, messages.conversations.navUnreadOne, messages.conversations.navUnread) },
  /** Reviews written since the owner last opened their list. */
  reviews: { of: (counts) => counts.unseenReviews, label: (count, messages) => said(count, messages.reviews.navNewOne, messages.reviews.navNew) },
} as const satisfies Record<string, PanelMenuCount>

export type PanelMenuArea = keyof typeof PANEL_MENU_COUNTS

/**
 * What an item of that area shows: the number and its words, or nothing — at zero, and while the
 * counts have not arrived. Nothing rather than a skeleton or a "0": a badge is the presence of
 * something waiting, and until the answer is in, saying either would be a guess.
 */
export function menuBadgeOf(area: PanelMenuArea, counts: PanelCounts | undefined, messages: UiMessages): { badge?: number; badgeLabel?: string } {
  const count = counts ? PANEL_MENU_COUNTS[area].of(counts) : 0
  return count > 0 ? { badge: count, badgeLabel: PANEL_MENU_COUNTS[area].label(count, messages) } : {}
}
