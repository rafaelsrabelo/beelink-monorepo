// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerFirstPurchaseOffer, CustomerOffers } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { cartFirstOrderOf, firstOrderOfferOf, offerStripOf, type OfferStripAsk } from "./offer-strip"

const benefit = { kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null } as const
const coupon: CustomerFirstPurchaseOffer = { ...benefit, source: "COUPON", code: "PRIMEIRA10", minSubtotalCents: 5000 }
const promotion: CustomerFirstPurchaseOffer = { ...benefit, source: "PROMOTION", wholeCart: true, percentBps: 1500 }
const never: CustomerOffers = { hasOrder: false, firstPurchase: null, coupons: [] }

const stripOf = (ask: Partial<OfferStripAsk>) => offerStripOf({ offer: null, cartHref: "/loja/carrinho", locale: "pt-BR", messages: ptBR, ...ask })
const plain = (words: string | null | undefined) => words?.replace(/\u00a0/g, " ")

describe("offerStripOf — the first-order benefit, to whoever has no order", () => {
  it("shows the first-order coupon: its benefit, its code, and the way to the cart that applies it", () => {
    const strip = stripOf({ offer: coupon })

    expect(strip).toMatchObject({ message: "Seu primeiro pedido tem 10% de desconto com o cupom", code: "PRIMEIRA10", action: { label: "Usar no carrinho", href: "/loja/carrinho?cupom=PRIMEIRA10" } })
    expect(plain(strip?.detail)).toBe("Em compras a partir de R$ 50,00.")
  })

  it("says a promotion applies by itself, with nothing to press", () => {
    expect(stripOf({ offer: promotion })).toEqual({ message: "Seu primeiro pedido tem 15% de desconto, aplicado automaticamente.", detail: null, code: null, action: null })
    expect(stripOf({ offer: { ...promotion, source: "PROMOTION", wholeCart: false } })?.message).toBe(
      "Seu primeiro pedido tem 15% de desconto em produtos selecionados, aplicado automaticamente.",
    )
  })

  // Buying asks no account: nothing invites anyone to open one.
  it("shows nothing without a benefit — there is no strip that invites to open an account", () => {
    expect(stripOf({})).toBeNull()
  })

  it("never names an account, whatever the benefit", () => {
    for (const offer of [coupon, promotion]) expect(JSON.stringify(stripOf({ offer }))).not.toMatch(/conta|entrar/i)
  })
})

/** BEELINK-310: the one rule the strip and the pop-up's notice ask of a signed-in shopper. */
describe("firstOrderOfferOf", () => {
  it("is the shopper's first-order benefit while no order of theirs stands", () => {
    expect(firstOrderOfferOf({ hasOrder: false, firstPurchase: coupon, coupons: [] })).toEqual(coupon)
  })

  it("is nothing once an order stands, at a shop with nothing for a first order, and when their offers could not be read", () => {
    expect(firstOrderOfferOf({ hasOrder: true, firstPurchase: coupon, coupons: [] })).toBeNull()
    expect(firstOrderOfferOf(never)).toBeNull()
    expect(firstOrderOfferOf(null)).toBeNull()
  })
})

/** BEELINK-311: what a visitor's cart says of the shop's first-order coupon. */
describe("cartFirstOrderOf", () => {
  it("is the strip's sentence with the code, and its minimum — nothing about an account", () => {
    expect(cartFirstOrderOf({ ...coupon, minSubtotalCents: 0 }, "pt-BR", ptBR)).toBe("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10.")
    expect(plain(cartFirstOrderOf(coupon, "pt-BR", ptBR))).toBe("Seu primeiro pedido tem 10% de desconto com o cupom PRIMEIRA10. Em compras a partir de R$ 50,00.")
  })

  // The cart announces a first-purchase promotion by itself, over its totals (BEELINK-245).
  it("is nothing for a promotion, which the cart already announces, and nothing with no benefit", () => {
    expect(cartFirstOrderOf(promotion, "pt-BR", ptBR)).toBeNull()
    expect(cartFirstOrderOf(null, "pt-BR", ptBR)).toBeNull()
  })
})
