// Libs
import { describe, expect, it } from "vitest"

// Locales
import { en } from "../locales/en"
import { ptBR } from "../locales/pt-BR"

// App
import { cartCouponCallOf, cartCouponRowsOf, highlightedCouponOf, offerBenefitWords, offerMinimumSentence, type OfferBenefitValue, type OfferedCouponValue } from "./shop-offers"

const text = ptBR.storefront.offers
const plain = (words: string | null) => words?.replace(/ /g, " ") ?? null

const percent: OfferBenefitValue = { kind: "PERCENT", percentBps: 1000, amountCents: null, minSubtotalCents: 0 }
const fixed: OfferBenefitValue = { kind: "FIXED", percentBps: null, amountCents: 1500, minSubtotalCents: 5000 }
const freeShipping: OfferBenefitValue = { kind: "FREE_SHIPPING", percentBps: null, amountCents: null, minSubtotalCents: 0 }

describe("offerBenefitWords", () => {
  it("says a share, an amount and a free delivery from the numbers it is given", () => {
    expect(offerBenefitWords(percent, "pt-BR", text)).toBe("10% de desconto")
    expect(offerBenefitWords({ ...percent, percentBps: 1250 }, "pt-BR", text)).toBe("12,5% de desconto")
    expect(plain(offerBenefitWords(fixed, "pt-BR", text))).toBe("R$ 15,00 de desconto")
    expect(offerBenefitWords(freeShipping, "pt-BR", text)).toBe("frete grátis")
  })

  it("capitalises the one that stands as a line of its own", () => {
    expect(offerBenefitWords(freeShipping, "pt-BR", text, "row")).toBe("Frete grátis")
    expect(offerBenefitWords(percent, "pt-BR", text, "row")).toBe("10% de desconto")
  })

  it("writes them as an English reader does", () => {
    expect(offerBenefitWords({ ...percent, percentBps: 1250 }, "en", en.storefront.offers)).toBe("12.5% off")
    expect(offerBenefitWords(freeShipping, "en", en.storefront.offers)).toBe("free delivery")
  })
})

describe("offerMinimumSentence", () => {
  it("is a sentence of its own for an offer that asks for a minimum, and nothing for one that does not", () => {
    expect(plain(offerMinimumSentence(fixed, "pt-BR", text))).toBe("Em compras a partir de R$ 50,00.")
    expect(offerMinimumSentence(percent, "pt-BR", text)).toBeNull()
  })
})

describe("cartCouponRowsOf", () => {
  const coupon: OfferedCouponValue = { ...percent, code: "DEZ", audience: "EVERYONE", missingCents: 0 }

  it("keeps the API's order, and says what each gives and asks for", () => {
    const rows = cartCouponRowsOf(
      [
        { ...coupon, code: "PRIMEIRA", audience: "FIRST_PURCHASE", minSubtotalCents: 5000 },
        { ...coupon, ...freeShipping, code: "FRETE" },
        coupon,
      ],
      "pt-BR",
      text,
    )

    expect(rows.map((row) => row.code)).toEqual(["PRIMEIRA", "FRETE", "DEZ"])
    expect(rows[0]).toMatchObject({ benefit: "10% de desconto", missing: null })
    expect(rows[0]!.conditions.map(plain)).toEqual(["Pedido mínimo de R$ 50,00", "Só no primeiro pedido"])
    expect(rows[1]).toEqual({ code: "FRETE", benefit: "Frete grátis", conditions: [], missing: null })
  })

  it("says what is missing of one the cart is below the minimum of", () => {
    const [row] = cartCouponRowsOf([{ ...coupon, minSubtotalCents: 15000, missingCents: 6000 }], "pt-BR", text)

    expect(plain(row!.missing)).toBe("Faltam R$ 60,00 em produtos para usar.")
  })
})

/** BEELINK-311: the one coupon the cart calls its customer to. */
describe("highlightedCouponOf", () => {
  const coupon: OfferedCouponValue = { ...percent, code: "DEZ", audience: "EVERYONE", missingCents: 0 }
  const first: OfferedCouponValue = { ...coupon, code: "PRIMEIRA", audience: "FIRST_PURCHASE" }

  it("is the first-order coupon when there is one, wherever it stands in the list", () => {
    expect(highlightedCouponOf([coupon, { ...coupon, code: "NOVO" }, first])?.code).toBe("PRIMEIRA")
    expect(highlightedCouponOf([first, coupon])?.code).toBe("PRIMEIRA")
  })

  it("is the first of the list — the newest — with no first-order coupon", () => {
    expect(highlightedCouponOf([{ ...coupon, code: "NOVO" }, coupon])?.code).toBe("NOVO")
  })

  // Applying it would be refused: it keeps its "Faltam R$ X…" row, and is never the call.
  it("is never one the cart is below the minimum of", () => {
    expect(highlightedCouponOf([{ ...first, missingCents: 3000 }, coupon])?.code).toBe("DEZ")
    expect(highlightedCouponOf([{ ...first, missingCents: 3000 }, { ...coupon, missingCents: 1 }])).toBeNull()
  })

  it("is none with no coupon listed", () => {
    expect(highlightedCouponOf([])).toBeNull()
  })
})

describe("cartCouponCallOf", () => {
  const coupon: OfferedCouponValue = { ...percent, percentBps: 1500, code: "SEJAMUTANTE", audience: "FIRST_PURCHASE", missingCents: 0 }

  it("says a first-order coupon's benefit from the API's numbers, and ends where the code goes", () => {
    expect(cartCouponCallOf([coupon], "pt-BR", text)).toEqual({ message: "Você tem 15% de desconto no primeiro pedido com o cupom", code: "SEJAMUTANTE" })
    expect(cartCouponCallOf([{ ...coupon, ...freeShipping }], "pt-BR", text)?.message).toBe("Você tem frete grátis no primeiro pedido com o cupom")
  })

  it("does not speak of a first order for a coupon that is for everyone", () => {
    expect(plain(cartCouponCallOf([{ ...coupon, ...fixed, minSubtotalCents: 0, audience: "EVERYONE", code: "QUINZE" }], "pt-BR", text)?.message ?? null)).toBe("Você tem R$ 15,00 de desconto com o cupom")
  })

  it("is nothing with no coupon to call to", () => {
    expect(cartCouponCallOf([], "pt-BR", text)).toBeNull()
    expect(cartCouponCallOf([{ ...coupon, missingCents: 500 }], "pt-BR", text)).toBeNull()
  })

  it("writes it as an English reader does", () => {
    expect(cartCouponCallOf([coupon], "en", en.storefront.offers)).toEqual({ message: "You have 15% off on your first order with the coupon", code: "SEJAMUTANTE" })
  })
})
