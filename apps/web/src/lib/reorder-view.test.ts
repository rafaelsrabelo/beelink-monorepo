// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { reorderActionOf, reorderNoticeOf } from "./reorder-view"

describe("what the cart says after buying an order again", () => {
  it("posts to the shop's own handler", () => {
    expect(reorderActionOf("loja", 14)).toBe("/loja/api/orders/14/reorder")
  })

  it("says the lines are in, and names each one that stayed out and why", () => {
    const reorder = {
      number: 14,
      lines: [{ productId: "p1", variantId: "v1", quantity: 1 }],
      left: [
        { productName: "Whey", variantLabel: "Sabor: Uva", reason: "SOLD_OUT" as const, added: 0 },
        { productName: "Creatina", variantLabel: null, reason: "OFF_SALE" as const, added: 0 },
        { productName: "Boné", variantLabel: null, reason: "LIMITED" as const, added: 1 },
        { productName: "Meia", variantLabel: null, reason: "LIMITED" as const, added: 2 },
      ],
    }

    expect(reorderNoticeOf({ number: 14, failed: false, trimmed: true }, reorder, ptBR)).toEqual({
      number: 14,
      outcome: "added",
      left: ["Whey (Sabor: Uva) — esgotado", "Creatina — não está mais à venda", "Boné — só 1 disponível", "Meia — só 2 disponíveis"],
      trimmed: true,
    })
  })

  it("says nothing is on sale when no line went in, and that it failed only when the handler said so", () => {
    const mark = { number: 14, failed: false, trimmed: false }
    expect(reorderNoticeOf(mark, { number: 14, lines: [], left: [] }, ptBR)?.outcome).toBe("none")
    expect(reorderNoticeOf({ ...mark, failed: true }, { number: 14, lines: [{ productId: "p", variantId: "v", quantity: 1 }], left: [] }, ptBR)).toEqual({ number: 14, outcome: "failed", left: [] })
  })

  /** A second read that comes back empty is a hiccup, or a number that is not theirs: "try again" would add the lines twice. */
  it("says nothing when the order could not be read again", () => {
    expect(reorderNoticeOf({ number: 14, failed: false, trimmed: false }, null, ptBR)).toBeNull()
  })
})
