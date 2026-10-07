// Libs
import { describe, expect, it } from "vitest"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"

// Lib
import { originLinesOf } from "@harness-monorepo/ui/lib/order-origin"

// Block
import type { SalesByOriginRowView } from "./report-types"
import { revenueShareOf, salesOriginLabelOf } from "./sales-origin-label"

const row = (over: Partial<SalesByOriginRowView>): SalesByOriginRowView => ({ kind: "CAMPAIGN", source: null, medium: null, campaign: null, orders: 3, metaAdOrders: 0, revenueCents: 1000, ...over })
const origin = defaultMessages.orders.detail.origin

describe("salesOriginLabelOf", () => {
  it("names a campaign exactly as its order's page does", () => {
    const labels = { source: "facebook", medium: "cpc", campaign: "teste" }

    expect(salesOriginLabelOf(row(labels), defaultMessages).line).toBe(originLinesOf({ ...labels, content: null, term: null, metaAd: false }, origin).line)
    expect(salesOriginLabelOf(row({ kind: "DIRECT" }), defaultMessages).line).toBe(originLinesOf(null, origin).line)
  })

  it("says how many of a campaign's orders came by a kept ad click, under its name and not in it", () => {
    expect(salesOriginLabelOf(row({ source: "facebook", medium: "cpc", campaign: "teste", metaAdOrders: 1 }), defaultMessages)).toEqual({
      line: "facebook / cpc · campanha teste",
      detail: "1 de 3 pedidos com clique em anúncio da Meta",
    })
    expect(salesOriginLabelOf(row({ source: "facebook" }), defaultMessages)).toEqual({ line: "facebook", detail: null })
  })

  it("names a line with no label by the ad click that made it", () => {
    expect(salesOriginLabelOf(row({ metaAdOrders: 3 }), defaultMessages)).toEqual({ line: "Anúncio da Meta", detail: null })
  })

  it("names the panel's sales and the direct ones, whatever else the line carries", () => {
    expect(salesOriginLabelOf(row({ kind: "PANEL", source: "facebook", metaAdOrders: 2 }), defaultMessages)).toEqual({ line: "Venda registrada no painel", detail: null })
    expect(salesOriginLabelOf(row({ kind: "DIRECT" }), defaultMessages)).toEqual({ line: "Direto / sem campanha", detail: null })
  })
})

describe("revenueShareOf", () => {
  it("says a part of the whole to one decimal, in the reader's notation", () => {
    expect(revenueShareOf(250000, 400000, "pt-BR")).toBe("62,5%")
    expect(revenueShareOf(1, 3, "en")).toBe("33.3%")
    expect(revenueShareOf(0, 400000, "pt-BR")).toBe("0%")
  })

  it("says none of a whole that is nothing", () => {
    expect(revenueShareOf(0, 0, "pt-BR")).toBeNull()
  })
})
