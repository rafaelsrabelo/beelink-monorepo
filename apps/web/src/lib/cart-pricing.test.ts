// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerProfile, OrderQuote } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { cartPricingOf, cartQuoteOf, firstFulfillmentOf, sameCart } from "./cart-pricing"
import type { CartRow, CartView } from "./cart-view"

const row = (over: Partial<CartRow>): CartRow => ({
  productId: "p-whey",
  variantId: "v-whey",
  orderVariantId: "v-whey",
  name: "Whey",
  slug: "whey",
  variantLabel: null,
  imageUrl: null,
  unitPriceCents: 8750,
  compareAtPriceCents: 10000,
  qty: 2,
  lineTotalCents: 17500,
  available: true,
  ...over,
})
const creatine = row({ productId: "p-creatine", variantId: "v-creatine", orderVariantId: "v-creatine", name: "Creatina", unitPriceCents: 5990, compareAtPriceCents: null, qty: 1, lineTotalCents: 5990 })
const viewOf = (rows: CartRow[]): CartView => {
  const orderable = rows.filter((each) => each.available)
  return { rows, gone: [], subtotalCents: orderable.reduce((sum, each) => sum + each.lineTotalCents, 0), count: orderable.reduce((sum, each) => sum + each.qty, 0) }
}
const context = { fulfillment: "DELIVERY" as const, locale: "pt-BR", messages: ptBR }
const spaced = (text: string | null) => text?.replace(/\s/g, " ")

/** Two wheys at R$ 100,00 with 12,5% off, and a creatine nothing reaches. */
const quote: OrderQuote = {
  lines: [
    { variantId: "v-creatine", productId: "p-creatine", quantity: 1, unitPriceCents: 5990, lineTotalCents: 5990, discountCents: 0, promotion: null },
    { variantId: "v-whey", productId: "p-whey", quantity: 2, unitPriceCents: 10000, lineTotalCents: 20000, discountCents: 2500, promotion: { id: "pr1", name: "Semana do Whey" } },
  ],
  subtotalCents: 25990,
  promotionDiscountCents: 2500,
  firstPurchase: null,
  coupon: null,
  couponDiscountCents: 0,
  manualDiscountCents: 0,
  discountCents: 2500,
  deliveryFeeCents: null,
  shipping: null,
  totalCents: 23490,
  cashback: null,
  cashbackUse: null,
}

describe("the cart as its price is asked for", () => {
  it("is one question however its lines were added: sorted, a sold-out line left out, twins added up", () => {
    const twin = row({ variantId: null, qty: 1, lineTotalCents: 8750 })
    const soldOut = row({ productId: "p-bar", variantId: "v-bar", orderVariantId: "v-bar", available: false })

    expect(cartQuoteOf([row({}), creatine, twin, soldOut], "DELIVERY", null)).toEqual({
      items: [
        { variantId: "v-creatine", quantity: 1 },
        { variantId: "v-whey", quantity: 3 },
      ],
      fulfillment: "DELIVERY",
    })
    expect(sameCart(cartQuoteOf([row({}), creatine], "PICKUP", null), cartQuoteOf([creatine, row({})], "PICKUP", null))).toBe(true)
  })

  it("carries a coupon only when one is typed, and is another question with it or with another way to leave", () => {
    const plain = cartQuoteOf([row({})], "DELIVERY", null)

    expect(plain).not.toHaveProperty("couponCode")
    expect(cartQuoteOf([row({})], "DELIVERY", "BEMVINDO10")).toMatchObject({ couponCode: "BEMVINDO10" })
    expect(sameCart(plain, cartQuoteOf([row({})], "DELIVERY", "BEMVINDO10"))).toBe(false)
    expect(sameCart(plain, cartQuoteOf([row({})], "PICKUP", null))).toBe(false)
    expect(sameCart(plain, cartQuoteOf([row({ qty: 3 })], "DELIVERY", null))).toBe(false)
  })

  it("starts on a delivery only for a shopper with somewhere to deliver", () => {
    const address = { id: "a1", label: null, recipientName: null, zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: null, city: "São Paulo", state: "SP", isDefault: true }
    const shopper = { name: "Bia", addresses: [address] } as Pick<CustomerProfile, "name" | "addresses">

    expect(firstFulfillmentOf(shopper)).toBe("DELIVERY")
    expect(firstFulfillmentOf({ ...shopper, addresses: [{ ...address, street: null }] })).toBe("PICKUP")
    expect(firstFulfillmentOf(null)).toBe("PICKUP")
  })
})

describe("the cart as the API priced it", () => {
  it("reads as the shelf prices it while there is no price: one subtotal, no row, no line touched", () => {
    const view = viewOf([row({}), creatine])

    expect(cartPricingOf(null, view, context)).toEqual({ subtotalCents: 23490, discounts: [], delivery: null, deliveryFeeCents: undefined, shipping: null, total: null, lines: new Map(), offer: null, cashback: null })
  })

  it("says the subtotal before the promotion, what came off, the total, and the line the promotion reached", () => {
    const priced = cartPricingOf(quote, viewOf([row({}), creatine]), context)

    expect(priced.subtotalCents).toBe(25990)
    expect(priced.discounts.map((line) => [line.label, spaced(line.value)])).toEqual([["Promoção: Semana do Whey", "− R$ 25,00"]])
    expect(spaced(priced.total)).toBe("R$ 234,90 + frete")
    expect([...priced.lines]).toEqual([["p-whey:v-whey", { lineTotalCents: 17500, wasCents: 20000, promotion: "Semana do Whey" }]])
  })

  it("says no total with nothing taken off: the subtotal already is what is paid", () => {
    const plain = { ...quote, lines: quote.lines.map((line) => ({ ...line, discountCents: 0, promotion: null })), promotionDiscountCents: 0, discountCents: 0, totalCents: 25990 }

    expect(cartPricingOf(plain, viewOf([row({ unitPriceCents: 10000, lineTotalCents: 20000 }), creatine]), context)).toMatchObject({ subtotalCents: 25990, discounts: [], total: null })
  })

  it("names the coupon applied on its own row, and leaves a refused one out", () => {
    const withCoupon = { ...quote, coupon: { status: "APPLIED" as const, code: "BEMVINDO10", kind: "PERCENT" as const }, couponDiscountCents: 2349, discountCents: 4849, totalCents: 21141 }
    const refused = { ...quote, coupon: { status: "REFUSED" as const, code: "VENCIDO", reason: "EXPIRED" as const } }
    const view = viewOf([row({}), creatine])

    expect(cartPricingOf(withCoupon, view, context).discounts.map((line) => [line.label, spaced(line.value)])).toEqual([
      ["Promoção: Semana do Whey", "− R$ 25,00"],
      ["Cupom BEMVINDO10", "− R$ 23,49"],
    ])
    expect(cartPricingOf(refused, view, context).discounts.map((line) => line.label)).toEqual(["Promoção: Semana do Whey"])
  })

  it("writes a free delivery in words, and a total with no '+ frete' — and none on a pick-up either", () => {
    const free = { ...quote, coupon: { status: "APPLIED" as const, code: "FRETEGRATIS", kind: "FREE_SHIPPING" as const } }
    const view = viewOf([row({}), creatine])

    const priced = cartPricingOf(free, view, context)
    expect(priced.discounts.at(-1)).toEqual({ key: "coupon", label: "Cupom FRETEGRATIS", value: "Frete grátis" })
    expect(spaced(priced.total)).toBe("R$ 234,90")
    expect(spaced(cartPricingOf({ ...quote, deliveryFeeCents: 0 }, view, { ...context, fulfillment: "PICKUP" }).total)).toBe("R$ 234,90")
  })

  /** BEELINK-178: the fee the shop's rules quote has its row, and the total carries it. */
  it("says a delivery's quoted fee on its own row and in the total, free in words, and none on a pick-up", () => {
    const view = viewOf([row({}), creatine])
    const plain = { ...quote, discountCents: 0, promotionDiscountCents: 0, lines: quote.lines.map((line) => ({ ...line, discountCents: 0, promotion: null })) }

    const priced = cartPricingOf({ ...plain, deliveryFeeCents: 500, totalCents: 26490 }, view, context)
    expect([spaced(priced.delivery), priced.deliveryFeeCents, spaced(priced.total)]).toEqual(["R$ 5,00", 500, "R$ 264,90"])

    expect(cartPricingOf({ ...plain, deliveryFeeCents: 0, totalCents: 25990 }, view, context).delivery).toBe("Grátis")
    // A fee agreed afterwards has no row; the order is still sent saying so.
    expect(cartPricingOf({ ...plain, deliveryFeeCents: null, totalCents: 25990 }, view, context)).toMatchObject({ delivery: null, deliveryFeeCents: null, total: null })
    expect(cartPricingOf({ ...plain, deliveryFeeCents: 0, totalCents: 25990 }, view, { ...context, fulfillment: "PICKUP" })).toMatchObject({ delivery: null, deliveryFeeCents: undefined, total: null })
  })

  /** The price on screen may be the cart's of a moment ago: a line whose quantity moved follows the stepper at once. */
  it("prices a line whose quantity moved since from the catalogue's own numbers, keeping its promotion's name", () => {
    const three = row({ qty: 3, lineTotalCents: 26250 })

    expect(cartPricingOf(quote, viewOf([three, creatine]), context).lines.get("p-whey:v-whey")).toEqual({ lineTotalCents: 26250, wasCents: 30000, promotion: "Semana do Whey" })
  })

  it("leaves two cookie lines of one combination as the shelf prices them: neither can say its own share", () => {
    const twin = row({ variantId: null, qty: 1, lineTotalCents: 8750 })

    expect(cartPricingOf(quote, viewOf([row({}), twin, creatine]), context).lines.size).toBe(0)
  })

  it("takes nothing off a line that will not be ordered", () => {
    expect(cartPricingOf(quote, viewOf([row({ available: false }), creatine]), context).lines.size).toBe(0)
  })
})

/** BEELINK-245: a first-purchase promotion the price left out is said under it, never added to it. */
describe("the cart's first-purchase offer", () => {
  const view = viewOf([row({}), creatine])
  const offerOf = (firstPurchase: OrderQuote["firstPurchase"]) => {
    const offer = cartPricingOf({ ...quote, firstPurchase }, view, context).offer
    return offer && { ...offer, text: offer.text.replace(/\s/g, " ") }
  }

  it("tells a visitor what it would take off, and that signing in confirms it", () => {
    expect(offerOf({ status: "UNIDENTIFIED", promotionName: "Boas-vindas", discountCents: 2349 })).toEqual({
      tone: "open",
      text: "Boas-vindas: − R$ 23,49 na sua primeira compra. Entre na sua conta para confirmar.",
    })
    // Several would apply, and none of them alone is the one.
    expect(offerOf({ status: "UNIDENTIFIED", promotionName: null, discountCents: 2349 })).toEqual({
      tone: "open",
      text: "Desconto de primeira compra: − R$ 23,49. Entre na sua conta para confirmar.",
    })
  })

  it("tells a customer who has bought before that it is not theirs, with no amount to want", () => {
    expect(offerOf({ status: "NOT_FIRST", promotionName: "Boas-vindas", discountCents: 2349 })).toEqual({ tone: "closed", text: "Boas-vindas vale só na primeira compra." })
    expect(offerOf({ status: "NOT_FIRST", promotionName: null, discountCents: 2349 })).toEqual({
      tone: "closed",
      text: "A promoção de primeira compra vale só para quem ainda não comprou na loja.",
    })
  })

  it("says nothing with none, and leaves the totals as the API priced them", () => {
    expect(offerOf(null)).toBeNull()

    const offered = cartPricingOf({ ...quote, firstPurchase: { status: "UNIDENTIFIED", promotionName: "Boas-vindas", discountCents: 2349 } }, view, context)
    expect(spaced(offered.total)).toBe("R$ 234,90 + frete")
    expect(offered.discounts.map((line) => line.label)).toEqual(["Promoção: Semana do Whey"])
  })

  /** BEELINK-243: what the order would earn, as the quote worked it out; below the minimum, what is missing. */
  it("says the cashback the cart would earn, and what is missing below the shop's minimum", () => {
    const view = viewOf([row({}), creatine])
    const earns = cartPricingOf({ ...quote, cashback: { status: "EARNS", earnedCents: 1174, rateBps: 500 } }, view, context)
    expect(earns.cashback?.replace(/\s/g, " ")).toBe("Você ganha R$ 11,74 de cashback com este pedido, para usar nas próximas compras.")

    const short = cartPricingOf({ ...quote, cashback: { status: "BELOW_MINIMUM", missingCents: 2510, rateBps: 500 } }, view, context)
    expect(short.cashback?.replace(/\s/g, " ")).toBe("Faltam R$ 25,10 para ganhar 5% de cashback.")
    expect(cartPricingOf(quote, view, context).cashback).toBeNull()
  })
})
