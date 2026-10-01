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
  coupon: null,
  couponDiscountCents: 0,
  manualDiscountCents: 0,
  discountCents: 2500,
  deliveryFeeCents: null,
  totalCents: 23490,
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

    expect(cartPricingOf(null, view, context)).toEqual({ subtotalCents: 23490, discounts: [], total: null, lines: new Map() })
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
