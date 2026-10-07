// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PanelCounts } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { menuBadgeOf, PANEL_MENU_COUNTS } from "./panel-menu-counts"

const counts: PanelCounts = { openOrders: 3, unreadConversations: 1, unreadMessages: 5, unseenReviews: 120 }

describe("a menu item's live number", () => {
  it("is its own area's count, said in words for the item's name", () => {
    expect(menuBadgeOf("orders", counts, ptBR)).toEqual({ badge: 3, badgeLabel: "3 em aberto" })
    expect(menuBadgeOf("conversations", counts, ptBR)).toEqual({ badge: 1, badgeLabel: "1 conversa com mensagens não lidas" })
    // The words keep the real number; "99+" is the badge's way of drawing it, not of saying it.
    expect(menuBadgeOf("reviews", counts, ptBR)).toEqual({ badge: 120, badgeLabel: "120 avaliações novas" })
  })

  it("has a sentence of its own for one, in each language", () => {
    expect(menuBadgeOf("orders", { ...counts, openOrders: 1 }, ptBR).badgeLabel).toBe("1 em aberto")
    expect(menuBadgeOf("orders", { ...counts, openOrders: 1 }, en).badgeLabel).toBe("1 open")
    expect(menuBadgeOf("orders", counts, en).badgeLabel).toBe("3 open")
  })

  it("is nothing at zero: no badge and no words", () => {
    expect(menuBadgeOf("orders", { ...counts, openOrders: 0 }, ptBR)).toEqual({})
  })

  // Loading is neither a "0" nor a skeleton: nothing is known to be waiting yet.
  it("is nothing while the counts have not arrived", () => {
    expect(menuBadgeOf("orders", undefined, ptBR)).toEqual({})
  })

  it("conversations counts conversations, not the messages in them — those are the bell's", () => {
    expect(PANEL_MENU_COUNTS.conversations.of(counts)).toBe(1)
  })
})
