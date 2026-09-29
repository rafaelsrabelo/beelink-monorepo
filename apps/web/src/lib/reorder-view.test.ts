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

    expect(reorderNoticeOf(14, reorder, false, ptBR)).toEqual({
      number: 14,
      outcome: "added",
      left: ["Whey (Sabor: Uva) — esgotado", "Creatina — não está mais à venda", "Boné — só 1 disponível", "Meia — só 2 disponíveis"],
    })
  })

  it("says nothing is on sale when no line went in, and that it failed when it did", () => {
    expect(reorderNoticeOf(14, { number: 14, lines: [], left: [] }, false, ptBR).outcome).toBe("none")
    expect(reorderNoticeOf(14, { number: 14, lines: [{ productId: "p", variantId: "v", quantity: 1 }], left: [] }, true, ptBR)).toEqual({ number: 14, outcome: "failed", left: [] })
    expect(reorderNoticeOf(14, null, false, ptBR).outcome).toBe("failed")
  })
})
