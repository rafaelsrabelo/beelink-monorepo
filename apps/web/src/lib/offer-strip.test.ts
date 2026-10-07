// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOffers, FirstPurchaseHeadline } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { firstOrderOfferOf, offerStripOf, pathWithQuery, type OfferStripAsk } from "./offer-strip"

const benefit = { kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null } as const
const promotion: FirstPurchaseHeadline = { ...benefit, source: "PROMOTION", wholeCart: true }
const couponHeadline: FirstPurchaseHeadline = { ...benefit, source: "COUPON", wholeCart: true, minSubtotalCents: 5000 }
const never: CustomerOffers = { hasOrder: false, firstPurchase: null, coupons: [] }

const SIGN_UP = "/loja/entrar?modo=criar&voltar=%2Floja%2Fprodutos"
const stripOf = (ask: Partial<OfferStripAsk>) => offerStripOf({ headline: null, viewer: "visitor", signUpHref: SIGN_UP, cartHref: "/loja/carrinho", locale: "pt-BR", messages: ptBR, ...ask })
const plain = (words: string | null | undefined) => words?.replace(/ /g, " ")

describe("offerStripOf", () => {
  describe("for a visitor", () => {
    it("invites plainly at a shop with nothing for a first purchase, with what an account gives there", () => {
      expect(stripOf({})).toEqual({
        message: "Crie sua conta para acompanhar seus pedidos, salvar favoritos e comprar mais rápido.",
        detail: null,
        code: null,
        action: { label: "Criar conta", href: SIGN_UP },
      })
    })

    it("says the shop's first-purchase benefit, from the API's numbers", () => {
      expect(stripOf({ headline: promotion })?.message).toBe("Crie sua conta e ganhe 10% de desconto no primeiro pedido.")
      expect(plain(stripOf({ headline: { ...promotion, kind: "FIXED", percentBps: null, amountCents: 1500 } })?.message)).toBe("Crie sua conta e ganhe R$ 15,00 de desconto no primeiro pedido.")
      expect(stripOf({ headline: { ...promotion, kind: "FREE_SHIPPING", percentBps: null } })?.message).toBe("Crie sua conta e ganhe frete grátis no primeiro pedido.")
    })

    it("does not promise the whole cart for a promotion over named products", () => {
      expect(stripOf({ headline: { ...promotion, wholeCart: false } })?.message).toBe("Crie sua conta e ganhe 10% de desconto em produtos selecionados no primeiro pedido.")
    })

    it("says the minimum a benefit asks for", () => {
      expect(plain(stripOf({ headline: couponHeadline })?.detail)).toBe("Em compras a partir de R$ 50,00.")
    })

    // Whether a code exists is told only to an identified customer — and the headline carries none to tell.
    it("never carries a code, whatever the benefit comes from", () => {
      for (const headline of [null, promotion, couponHeadline]) expect(stripOf({ headline })?.code).toBeNull()
    })
  })

  describe("for a signed-in shopper with no order that stands", () => {
    const withCoupon: CustomerOffers = { ...never, firstPurchase: { ...benefit, source: "COUPON", code: "PRIMEIRA10", minSubtotalCents: 5000 } }

    it("shows the first-order coupon: its benefit, its code, and the way to the cart that applies it", () => {
      const strip = stripOf({ headline: couponHeadline, viewer: { offers: withCoupon } })

      expect(strip).toMatchObject({ message: "Seu primeiro pedido tem 10% de desconto com o cupom", code: "PRIMEIRA10", action: { label: "Usar no carrinho", href: "/loja/carrinho?cupom=PRIMEIRA10" } })
      expect(plain(strip?.detail)).toBe("Em compras a partir de R$ 50,00.")
    })

    it("says a promotion applies by itself, with nothing to press", () => {
      const offers: CustomerOffers = { ...never, firstPurchase: { ...benefit, source: "PROMOTION", wholeCart: true, percentBps: 1500 } }

      expect(stripOf({ headline: promotion, viewer: { offers } })).toEqual({ message: "Seu primeiro pedido tem 15% de desconto, aplicado automaticamente.", detail: null, code: null, action: null })
      expect(stripOf({ headline: promotion, viewer: { offers: { ...offers, firstPurchase: { ...offers.firstPurchase!, source: "PROMOTION", wholeCart: false } } } })?.message).toBe(
        "Seu primeiro pedido tem 15% de desconto em produtos selecionados, aplicado automaticamente.",
      )
    })

    it("shows nothing at a shop with nothing for them: there is no generic strip", () => {
      expect(stripOf({ headline: promotion, viewer: { offers: never } })).toBeNull()
    })
  })

  it("shows nothing to a shopper with an order that stands, whatever the shop offers", () => {
    const ordered: CustomerOffers = { hasOrder: true, firstPurchase: null, coupons: [] }

    expect(stripOf({ headline: promotion, viewer: { offers: ordered } })).toBeNull()
    // Even an answer that named a benefit beside it would not be shown.
    expect(stripOf({ headline: promotion, viewer: { offers: { ...ordered, firstPurchase: { ...benefit, source: "COUPON", code: "PRIMEIRA10" } } } })).toBeNull()
  })

  // Nothing is said of a first order to somebody who may already have ordered.
  it("shows nothing to a shopper whose offers could not be read — never the visitor's invitation", () => {
    expect(stripOf({ headline: promotion, viewer: { offers: null } })).toBeNull()
  })
})

/** BEELINK-310: the one rule the strip and the pop-up's customer notice both ask. */
describe("firstOrderOfferOf", () => {
  const theirs = { source: "COUPON", code: "PRIMEIRA10", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null } as const

  it("is the shopper's first-order benefit while no order of theirs stands", () => {
    expect(firstOrderOfferOf({ hasOrder: false, firstPurchase: theirs, coupons: [] })).toEqual(theirs)
  })

  it("is nothing once an order stands, at a shop with nothing for a first order, and when their offers could not be read", () => {
    expect(firstOrderOfferOf({ hasOrder: true, firstPurchase: theirs, coupons: [] })).toBeNull()
    expect(firstOrderOfferOf({ hasOrder: false, firstPurchase: null, coupons: [] })).toBeNull()
    expect(firstOrderOfferOf(null)).toBeNull()
  })

  it("agrees with the strip, always: an offer exactly where the strip says something to a shopper", () => {
    const ask = { headline: null, signUpHref: "/loja/entrar", cartHref: "/loja/carrinho", locale: "pt-BR", messages: ptBR }
    for (const offers of [{ hasOrder: false, firstPurchase: theirs, coupons: [] }, { hasOrder: true, firstPurchase: theirs, coupons: [] }, { hasOrder: false, firstPurchase: null, coupons: [] }, null]) {
      expect(firstOrderOfferOf(offers) !== null).toBe(offerStripOf({ ...ask, viewer: { offers } }) !== null)
    }
  })
})

describe("pathWithQuery", () => {
  it("is the page's own address with what it was asked with, so a sign-up comes back to the same shelf", () => {
    expect(pathWithQuery("/loja/busca", { q: "creatina 300g", categoria: "forca" })).toBe("/loja/busca?q=creatina+300g&categoria=forca")
    expect(pathWithQuery("/loja/produtos", { opcao: ["Sabor:Uva", "Sabor:Limão"], pagina: undefined })).toBe("/loja/produtos?opcao=Sabor%3AUva&opcao=Sabor%3ALim%C3%A3o")
    expect(pathWithQuery("/loja/produtos", {})).toBe("/loja/produtos")
  })
})
