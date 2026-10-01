// Libs
import { describe, expect, it } from "vitest"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/index"

// App
import { couponRefusalTextOf, discountLinesOf, discountRowsOf, linePromotionOf, type DiscountParts } from "./order-discounts"

const money = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`
const rows = ptBR.orders.discountRows
const none: DiscountParts = { discountCents: 0, promotionDiscountCents: 0, couponDiscountCents: 0, coupon: null }

describe("an order's discount, part by part", () => {
  it("has no row with nothing taken off", () => {
    expect(discountRowsOf(none)).toEqual([])
  })

  it("lists the promotion, the coupon and what was typed, in the order they were taken", () => {
    const order: DiscountParts = {
      discountCents: 4098,
      promotionDiscountCents: 2598,
      couponDiscountCents: 1000,
      coupon: { code: "BEMVINDO10", kind: "PERCENT" },
      items: [
        { discountCents: 2598, promotionName: "Semana do Whey" },
        { discountCents: 0, promotionName: null },
      ],
    }

    expect(discountRowsOf(order)).toEqual([
      { kind: "promotion", cents: 2598, name: "Semana do Whey", several: false },
      { kind: "coupon", cents: 1000, code: "BEMVINDO10", freeDelivery: false },
      { kind: "manual", cents: 500 },
    ])
    expect(discountLinesOf(order, money, rows)).toEqual([
      { key: "promotion", label: "Promoção: Semana do Whey", value: "− R$ 25,98" },
      { key: "coupon", label: "Cupom BEMVINDO10", value: "− R$ 10,00" },
      { key: "manual", label: "Desconto", value: "− R$ 5,00" },
    ])
  })

  it("names the promotion only when one took it all: several are 'Promoções', and no lines is 'Promoção'", () => {
    const two = { ...none, discountCents: 900, promotionDiscountCents: 900, items: [{ discountCents: 500, promotionName: "Whey" }, { discountCents: 400, promotionName: "Creatina" }] }
    const shared = { ...none, discountCents: 900, promotionDiscountCents: 900, items: [{ discountCents: 500, promotionName: "Loja toda" }, { discountCents: 400, promotionName: "Loja toda" }] }

    expect(discountLinesOf(two, money, rows)[0]!.label).toBe("Promoções")
    expect(discountLinesOf(shared, money, rows)[0]!.label).toBe("Promoção: Loja toda")
    expect(discountLinesOf({ ...none, discountCents: 900, promotionDiscountCents: 900 }, money, rows)[0]!.label).toBe("Promoção")
  })

  it("keeps a free delivery coupon's row while its fee is not agreed, in words — and as an amount once it is", () => {
    const waiting = { ...none, coupon: { code: "FRETEGRATIS", kind: "FREE_SHIPPING" as const } }

    expect(discountLinesOf(waiting, money, rows)).toEqual([{ key: "coupon", label: "Cupom FRETEGRATIS", value: "Frete grátis" }])
    expect(discountLinesOf({ ...waiting, discountCents: 1500, couponDiscountCents: 1500 }, money, rows)[0]!.value).toBe("− R$ 15,00")
  })

  it("says under a line what a promotion took off it, and nothing under a line it did not reach", () => {
    expect(linePromotionOf({ discountCents: 2598, promotionName: "Semana do Whey" }, money, rows)).toBe("Promoção: Semana do Whey (− R$ 25,98)")
    expect(linePromotionOf({ discountCents: 0, promotionName: null }, money, rows)).toBeNull()
  })
})

describe("why a coupon is not taken", () => {
  const text = ptBR.storefront
  const delivery = { pickup: false, money }

  it("says each reason in the shopper's words", () => {
    expect(couponRefusalTextOf({ reason: "NOT_FOUND" }, delivery, text)).toBe("Esse cupom não existe nesta loja. Confira o código.")
    expect(couponRefusalTextOf({ reason: "EXPIRED" }, delivery, text)).toBe("Esse cupom venceu.")
    expect(couponRefusalTextOf({ reason: "EXHAUSTED" }, delivery, text)).toBe("Esse cupom já foi usado o número máximo de vezes.")
    expect(couponRefusalTextOf({ reason: "INACTIVE" }, delivery, text)).toBe("Esse cupom não está valendo agora.")
    expect(couponRefusalTextOf({ reason: "CUSTOMER_LIMIT" }, delivery, text)).toBe("Você já usou esse cupom.")
  })

  it("says what the products have to add up to", () => {
    expect(couponRefusalTextOf({ reason: "BELOW_MINIMUM", minSubtotalCents: 10000 }, delivery, text)).toBe("Esse cupom vale para compras a partir de R$ 100,00 em produtos.")
  })

  it("adds the one remedy there is to a coupon that does not apply to a pick-up", () => {
    expect(couponRefusalTextOf({ reason: "NOT_APPLICABLE" }, delivery, text)).toBe("Esse cupom não se aplica a este pedido.")
    expect(couponRefusalTextOf({ reason: "NOT_APPLICABLE" }, { pickup: true, money }, text)).toBe("Esse cupom não se aplica a este pedido. Cupom de frete grátis vale só para entrega.")
  })
})
