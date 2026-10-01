// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Coupon, Promotion } from "@harness-monorepo/contracts"
import type { CouponFormValues, PromotionFormValues } from "@harness-monorepo/ui/lib/discount-form"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { couponFormOf, couponPayloadOf, emptyCoupon, emptyPromotion, percentFrom, promotionFormOf, promotionPayloadOf } from "./discount-form"

const text = ptBR.discounts.issues
const NOW = new Date("2026-10-01T12:00:00.000Z")

const promotion: PromotionFormValues = { ...emptyPromotion(NOW), name: "  Semana do Consumidor ", percent: "12,5" }
const coupon: CouponFormValues = { ...emptyCoupon(NOW), code: " bemvindo10 ", percent: "10" }

describe("a promotion's form", () => {
  it("starts as a percentage off the whole cart, from now on the shop's clock", () => {
    expect(emptyPromotion(NOW)).toMatchObject({ scope: "CART", kind: "PERCENT", startsAt: "2026-10-01T09:00", endsAt: "", products: [], categoryIds: [] })
  })

  it("sends basis points, an instant and no switch — a save never puts a paused promotion back on", () => {
    expect(promotionPayloadOf(promotion, text)).toEqual({
      payload: { name: "Semana do Consumidor", scope: "CART", discountKind: "PERCENT", percentBps: 1250, amountCents: null, startsAt: "2026-10-01T12:00:00.000Z", endsAt: null, productIds: [], categoryIds: [] },
    })
  })

  it("sends cents for a fixed amount, and only the list its scope asks for", () => {
    const value: PromotionFormValues = { ...promotion, scope: "CATEGORIES", kind: "FIXED", percent: "10", amount: "15,00", endsAt: "2026-10-15T23:59", products: [{ id: "p1", name: "Whey" }], categoryIds: ["k1"] }
    expect(promotionPayloadOf(value, text)).toEqual({
      payload: expect.objectContaining({ discountKind: "FIXED", percentBps: null, amountCents: 1500, endsAt: "2026-10-16T02:59:00.000Z", productIds: [], categoryIds: ["k1"] }),
    })
    expect(promotionPayloadOf({ ...value, scope: "PRODUCTS" }, text)).toEqual({ payload: expect.objectContaining({ productIds: ["p1"], categoryIds: [] }) })
  })

  it("names every field to correct, and sends nothing", () => {
    expect(promotionPayloadOf({ ...promotion, name: " ", percent: "0", startsAt: "", endsAt: "2026-10-01" }, text)).toEqual({
      issues: { name: text.required, percent: text.percent, startsAt: text.date, endsAt: text.date },
    })
    expect(promotionPayloadOf({ ...promotion, percent: "100,01" }, text)).toEqual({ issues: { percent: text.percent } })
    expect(promotionPayloadOf({ ...promotion, kind: "FIXED", amount: "0" }, text)).toEqual({ issues: { amount: text.amount } })
    expect(promotionPayloadOf({ ...promotion, endsAt: "2026-10-01T09:00" }, text)).toEqual({ issues: { endsAt: text.endsBeforeStart } })
    expect(promotionPayloadOf({ ...promotion, scope: "PRODUCTS" }, text)).toEqual({ issues: { products: text.products } })
    expect(promotionPayloadOf({ ...promotion, scope: "CATEGORIES" }, text)).toEqual({ issues: { categories: text.categories } })
  })

  it("fills the form from a promotion, in the shopkeeper's units", () => {
    const stored: Promotion = {
      id: "p1",
      name: "Proteínas",
      scope: "PRODUCTS",
      discountKind: "FIXED",
      percentBps: null,
      amountCents: 1550,
      startsAt: "2026-10-01T12:00:00.000Z",
      endsAt: "2026-10-16T02:59:00.000Z",
      active: false,
      status: "PAUSED",
      products: [{ id: "w1", name: "Whey", slug: "whey" }],
      categories: [],
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }
    expect(promotionFormOf(stored)).toEqual({ name: "Proteínas", scope: "PRODUCTS", kind: "FIXED", percent: "", amount: "15,50", startsAt: "2026-10-01T09:00", endsAt: "2026-10-15T23:59", products: [{ id: "w1", name: "Whey" }], categoryIds: [] })
    // And what it sends back is what was stored.
    expect(promotionPayloadOf(promotionFormOf(stored), text)).toEqual({ payload: expect.objectContaining({ amountCents: 1550, startsAt: stored.startsAt, endsAt: stored.endsAt, productIds: ["w1"] }) })
  })
})

describe("a percentage", () => {
  it("is shown as a person writes it", () => {
    expect(percentFrom(1000)).toBe("10")
    expect(percentFrom(1250)).toBe("12,5")
    expect(percentFrom(1)).toBe("0,01")
    expect(percentFrom(null)).toBe("")
  })
})

describe("a coupon's form", () => {
  it("sends the code as typed, the limits as numbers or none, and a blank minimum as zero", () => {
    expect(couponPayloadOf(coupon, text)).toEqual({
      payload: { code: "bemvindo10", kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0, startsAt: "2026-10-01T12:00:00.000Z", endsAt: null, maxUses: null, maxUsesPerCustomer: null },
    })
    expect(couponPayloadOf({ ...coupon, minSubtotal: "50", maxUses: "100", maxUsesPerCustomer: " 1 " }, text)).toEqual({
      payload: expect.objectContaining({ minSubtotalCents: 5000, maxUses: 100, maxUsesPerCustomer: 1 }),
    })
  })

  it("sends no value for a free delivery, whatever was typed before the kind changed", () => {
    expect(couponPayloadOf({ ...coupon, kind: "FREE_SHIPPING", percent: "10", amount: "5" }, text)).toEqual({ payload: expect.objectContaining({ kind: "FREE_SHIPPING", percentBps: null, amountCents: null }) })
  })

  it("names every field to correct, and sends nothing", () => {
    expect(couponPayloadOf({ ...coupon, code: "" }, text)).toEqual({ issues: { code: text.required } })
    for (const code of ["ab", "bem vindo", "promoção", "-dez"]) expect(couponPayloadOf({ ...coupon, code }, text), code).toEqual({ issues: { code: text.code } })
    expect(couponPayloadOf({ ...coupon, percent: "", minSubtotal: "abc", maxUses: "0", maxUsesPerCustomer: "1,5", endsAt: "2026-09-30T09:00" }, text)).toEqual({
      issues: { percent: text.percent, minSubtotal: text.amount, maxUses: text.limit, maxUsesPerCustomer: text.limit, endsAt: text.endsBeforeStart },
    })
    expect(couponPayloadOf({ ...coupon, maxUsesPerCustomer: "1001" }, text)).toEqual({ issues: { maxUsesPerCustomer: text.limit } })
  })

  it("fills the form from a coupon: no minimum and no limits are blanks", () => {
    const stored: Coupon = {
      id: "c1",
      code: "BEMVINDO10",
      kind: "PERCENT",
      percentBps: 1000,
      amountCents: null,
      minSubtotalCents: 0,
      startsAt: "2026-10-01T12:00:00.000Z",
      endsAt: null,
      maxUses: null,
      maxUsesPerCustomer: 2,
      usedCount: 3,
      active: true,
      status: "ACTIVE",
      createdAt: "2026-10-01T12:00:00.000Z",
      updatedAt: "2026-10-01T12:00:00.000Z",
    }
    expect(couponFormOf(stored)).toEqual({ code: "BEMVINDO10", kind: "PERCENT", percent: "10", amount: "", minSubtotal: "", startsAt: "2026-10-01T09:00", endsAt: "", maxUses: "", maxUsesPerCustomer: "2" })
  })
})
