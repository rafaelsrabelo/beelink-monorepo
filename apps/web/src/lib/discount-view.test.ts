// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Coupon, CouponRedemption, Promotion } from "@harness-monorepo/contracts"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { couponRowsOf, couponsAddressOf, couponsHrefOf, discountQueryOf, promotionRowsOf, promotionsAddressOf, promotionsHrefOf, redemptionRowsOf } from "./discount-view"

const text = { locale: "pt-BR", messages: ptBR }
const plain = (value: string) => value.replace(/ /g, " ")

const promotion: Promotion = {
  id: "p1",
  name: "Semana do Consumidor",
  scope: "CART",
  discountKind: "PERCENT",
  percentBps: 1000,
  amountCents: null,
  startsAt: "2026-10-01T12:00:00.000Z",
  endsAt: "2026-10-16T02:59:00.000Z",
  active: true,
  status: "ACTIVE",
  products: [],
  categories: [],
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
}

const coupon: Coupon = {
  id: "c1",
  code: "BEMVINDO10",
  kind: "PERCENT",
  percentBps: 1250,
  amountCents: null,
  minSubtotalCents: 5000,
  startsAt: "2026-10-01T12:00:00.000Z",
  endsAt: null,
  maxUses: 100,
  maxUsesPerCustomer: 1,
  usedCount: 3,
  active: true,
  status: "ACTIVE",
  createdAt: "2026-10-01T12:00:00.000Z",
  updatedAt: "2026-10-01T12:00:00.000Z",
}

describe("the lists' address", () => {
  it("reads the status in each list's own words, and ignores what it does not know", () => {
    expect(promotionsAddressOf(new URLSearchParams("situacao=ativas&pagina=3"))).toEqual({ status: "ACTIVE", page: 3 })
    expect(couponsAddressOf(new URLSearchParams("situacao=esgotados"))).toEqual({ status: "EXHAUSTED", page: 1 })
    // A coupon's word on the promotions' list is no status there.
    expect(promotionsAddressOf(new URLSearchParams("situacao=esgotados&pagina=0"))).toEqual({ status: undefined, page: 1 })
    expect(promotionsAddressOf(new URLSearchParams("situacao=toString"))).toEqual({ status: undefined, page: 1 })
  })

  it("writes it back with the defaults left out, and a changed status at page one", () => {
    const address = promotionsAddressOf(new URLSearchParams("situacao=ativas&pagina=3"))
    expect(promotionsHrefOf("loja", address, { status: "PAUSED" })).toBe("/admin/loja/promotions?situacao=pausadas")
    expect(promotionsHrefOf("loja", address, { status: undefined })).toBe("/admin/loja/promotions")
    expect(promotionsHrefOf("loja", address, { page: 4 })).toBe("/admin/loja/promotions?situacao=ativas&pagina=4")
    expect(couponsHrefOf("loja", { status: undefined, page: 1 }, { status: "EXHAUSTED" })).toBe("/admin/loja/coupons?situacao=esgotados")
  })

  it("asks the API only for what the address says", () => {
    expect(discountQueryOf({ status: undefined, page: 1 })).toEqual({})
    expect(discountQueryOf({ status: "ENDED", page: 2 })).toEqual({ status: "ENDED", page: 2 })
  })
})

describe("a promotion's row", () => {
  const summaryOf = (overrides: Partial<Promotion>) => plain(promotionRowsOf([{ ...promotion, ...overrides }], text)[0]!.summary)
  const target = (id: string) => ({ id, name: id, slug: id })

  it("says what it takes off and where", () => {
    expect(summaryOf({})).toBe("10% no carrinho inteiro")
    expect(summaryOf({ discountKind: "FIXED", percentBps: null, amountCents: 2000 })).toBe("R$ 20,00 no carrinho inteiro")
    expect(summaryOf({ scope: "PRODUCTS", products: [target("a")] })).toBe("10% em 1 produto")
    expect(summaryOf({ scope: "PRODUCTS", percentBps: 1250, products: [target("a"), target("b")] })).toBe("12,5% em 2 produtos")
    // A fixed amount off named products is off each unit.
    expect(summaryOf({ scope: "CATEGORIES", discountKind: "FIXED", percentBps: null, amountCents: 1500, categories: [target("k")] })).toBe("R$ 15,00 por unidade em 1 categoria")
    expect(summaryOf({ scope: "CATEGORIES", categories: [target("k"), target("l"), target("m")] })).toBe("10% em 3 categorias")
    // Every product it named was deleted.
    expect(summaryOf({ scope: "PRODUCTS", products: [] })).toBe("10%, sem nenhum produto ou categoria")
  })

  it("says its period on the shop's clock, with or without an end", () => {
    const [row] = promotionRowsOf([promotion], text)
    expect(row).toMatchObject({ id: "p1", name: "Semana do Consumidor", status: "ACTIVE", active: true })
    expect(row!.period).toMatch(/^De 1 de out\. de 2026,? 09:00 a 15 de out\. de 2026,? 23:59$/)
    expect(promotionRowsOf([{ ...promotion, endsAt: null }], text)[0]!.period).toMatch(/^Desde 1 de out\. de 2026,? 09:00, sem data para acabar$/)
  })
})

describe("a coupon's row", () => {
  const rowOf = (overrides: Partial<Coupon>) => couponRowsOf([{ ...coupon, ...overrides }], text)[0]!

  it("says what it gives, what it asks for and how many times it was used", () => {
    expect(rowOf({})).toMatchObject({ code: "BEMVINDO10", discount: "12,5%", uses: "Usos: 3 de 100", status: "ACTIVE", active: true })
    expect(plain(rowOf({}).minimum ?? "")).toBe("Pedido mínimo de R$ 50,00")
    expect(plain(rowOf({ kind: "FIXED", percentBps: null, amountCents: 2000 }).discount)).toBe("R$ 20,00")
    expect(rowOf({ kind: "FREE_SHIPPING", percentBps: null, minSubtotalCents: 0 })).toMatchObject({ discount: "Frete grátis", minimum: null })
  })

  it("writes a percentage as its reader does", () => {
    const [row] = couponRowsOf([coupon], { locale: "en", messages: en })
    expect(row).toMatchObject({ discount: "12.5%", uses: "Uses: 3 of 100" })
    expect(promotionRowsOf([{ ...promotion, percentBps: 1250 }], { locale: "en", messages: en })[0]!.summary).toBe("12.5% off the whole cart")
  })

  it("counts the uses in words when there is no limit", () => {
    expect(rowOf({ maxUses: null, usedCount: 0 }).uses).toBe("Nenhum uso")
    expect(rowOf({ maxUses: null, usedCount: 1 }).uses).toBe("1 uso")
    expect(rowOf({ maxUses: null, usedCount: 12 }).uses).toBe("12 usos")
  })
})

describe("a coupon's uses", () => {
  it("lead to each order, say what the coupon took off and mark a cancelled order", () => {
    const uses: CouponRedemption[] = [
      { id: "u1", order: { number: 12, status: "ACCEPTED", totalCents: 17091, placedAt: "2026-10-01T12:00:00.000Z" }, customer: { id: "c1", name: "Bia Souza" }, discountCents: 1899, redeemedAt: "2026-10-01T12:00:00.000Z" },
      { id: "u2", order: { number: 9, status: "CANCELLED", totalCents: 5000, placedAt: "2026-09-30T12:00:00.000Z" }, customer: { id: "c2", name: "Caio" }, discountCents: 500, redeemedAt: "2026-09-30T12:00:00.000Z" },
    ]
    const rows = redemptionRowsOf(uses, "loja", "pt-BR")
    expect(rows[0]).toMatchObject({ id: "u1", orderNumber: 12, orderHref: "/admin/loja/orders/12", customerName: "Bia Souza", cancelled: false })
    expect(plain(rows[0]!.discount)).toBe("R$ 18,99")
    expect(rows[1]).toMatchObject({ orderNumber: 9, cancelled: true })
  })
})
