// Libs
import { describe, expect, it } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { originLinesOf, type OrderOriginView } from "./order-origin"

const text = ptBR.orders.detail.origin
const none: OrderOriginView = { source: null, medium: null, campaign: null, content: null, term: null, metaAd: false }

describe("where an order's buyer came from, in words (BEELINK-275)", () => {
  it("reads no origin as a direct visit", () => {
    expect(originLinesOf(null, text)).toEqual({ line: "Direto / sem campanha", detail: null })
    expect(originLinesOf(none, text)).toEqual({ line: "Direto / sem campanha", detail: null })
  })

  it("says the source, the medium and the campaign", () => {
    expect(originLinesOf({ ...none, source: "facebook", medium: "cpc", campaign: "teste" }, text).line).toBe("facebook / cpc · campanha teste")
    expect(originLinesOf({ ...none, source: "newsletter" }, text).line).toBe("newsletter")
    expect(originLinesOf({ ...none, medium: "email", campaign: "Dia das Mães" }, text).line).toBe("email · campanha Dia das Mães")
  })

  it("says an ad of Meta's brought them when its click was kept, with or without labels", () => {
    expect(originLinesOf({ ...none, source: "facebook", medium: "cpc", campaign: "teste", metaAd: true }, text).line).toBe("Anúncio da Meta · facebook / cpc · campanha teste")
    expect(originLinesOf({ ...none, metaAd: true }, text).line).toBe("Anúncio da Meta")
  })

  it("puts the content and the term on a line of their own", () => {
    expect(originLinesOf({ ...none, source: "facebook", content: "vídeo 1", term: "whey" }, text).detail).toBe("Conteúdo: vídeo 1 · Termo: whey")
    expect(originLinesOf({ ...none, source: "facebook", term: "whey" }, text).detail).toBe("Termo: whey")
  })

  it("hands a label back as it is, markup and all, for the page to draw as text", () => {
    expect(originLinesOf({ ...none, campaign: "<b>x</b> {name}" }, text).line).toBe("campanha <b>x</b> {name}")
  })

  it("has the English twin", () => {
    expect(originLinesOf({ ...none, source: "facebook", medium: "cpc", campaign: "test", metaAd: true }, en.orders.detail.origin).line).toBe("Meta ad · facebook / cpc · campaign test")
    expect(originLinesOf(null, en.orders.detail.origin).line).toBe("Direct / no campaign")
  })
})
