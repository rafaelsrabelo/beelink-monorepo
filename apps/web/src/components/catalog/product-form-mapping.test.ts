// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Product } from "@harness-monorepo/contracts"

// App
import { cashbackRateOf, EMPTY_FORM, fieldsOf, kitIssuesOf, toForm } from "./product-form-mapping"

/** BEELINK-313: the product's own cashback, a percentage as typed, sent in basis points. */
describe("the product's cashback as the wire takes it", () => {
  it("reads a percentage as basis points, and an empty field as none", () => {
    expect(cashbackRateOf("5")).toBe(500)
    expect(cashbackRateOf("2,5")).toBe(250)
    expect(cashbackRateOf("100")).toBe(10_000)
    expect(cashbackRateOf("  ")).toBeNull()
  })

  it("refuses what is not a share of the price, rather than guess", () => {
    expect(cashbackRateOf("0")).toBeUndefined()
    expect(cashbackRateOf("100,01")).toBeUndefined()
    expect(cashbackRateOf("-5")).toBeUndefined()
    expect(cashbackRateOf("cinco")).toBeUndefined()
  })

  it("goes with the product's own fields, whatever its variations: a rate, or null to clear it", () => {
    expect(fieldsOf({ ...EMPTY_FORM, name: "Whey", cashback: "7,5" }).cashbackRateBps).toBe(750)
    expect(fieldsOf({ ...EMPTY_FORM, name: "Whey" }).cashbackRateBps).toBeNull()
  })
})

/** Plan 2026-11-10--kits-monte-seu-kit: a kit is put together from a category, at the product's price. */
describe("a kit, as the editor holds it and the wire takes it", () => {
  const text = { sizeInvalid: "Informe um número de 2 a 99.", categoryMissing: "Escolha a categoria de onde vêm os itens do kit." }

  it("reads a kit into the form, and a product like any other as no kit", () => {
    const product = { name: "Kit Festa", slug: "kit-festa", description: null, priceCents: 13980, compareAtPriceCents: null, costCents: null, cashbackRateBps: null, category: null, status: "ACTIVE", origin: null, images: [], sku: null, barcode: null, trackStock: false, stockQuantity: null, weightGrams: null, lengthMm: null, widthMm: null, heightMm: null }
    expect(toForm({ ...product, kit: { size: 20, categoryId: "c1" } } as unknown as Product)).toMatchObject({ isKit: true, kitSize: "20", kitCategoryId: "c1" })
    expect(toForm(product as unknown as Product)).toMatchObject({ isKit: false, kitSize: "", kitCategoryId: "" })
  })

  it("sends the kit's size and category, and null for a product that is no kit", () => {
    expect(fieldsOf({ ...EMPTY_FORM, name: "Kit Festa", isKit: true, kitSize: "20", kitCategoryId: "c1" }).kit).toEqual({ size: 20, categoryId: "c1" })
    expect(fieldsOf({ ...EMPTY_FORM, name: "Whey" }).kit).toBeNull()
  })

  it("says what a kit is missing before anything is sent", () => {
    expect(kitIssuesOf({ ...EMPTY_FORM, isKit: true }, text)).toEqual({ kitSize: { message: text.sizeInvalid }, kitCategoryId: { message: text.categoryMissing } })
    for (const size of ["1", "100", "0", "2,5"]) expect(kitIssuesOf({ ...EMPTY_FORM, isKit: true, kitSize: size, kitCategoryId: "c1" }, text)).toEqual({ kitSize: { message: text.sizeInvalid } })
    expect(kitIssuesOf({ ...EMPTY_FORM, isKit: true, kitSize: "20", kitCategoryId: "c1" }, text)).toBeNull()
    expect(kitIssuesOf({ ...EMPTY_FORM, kitSize: "1" }, text)).toBeNull()
  })
})
