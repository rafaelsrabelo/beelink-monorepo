// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import type { CartRow } from "./cart-view"
import { checkoutRefusalOf, rereadsTheCart } from "./checkout-refusal"

const row = (over: Partial<CartRow>): CartRow => ({
  productId: "p",
  variantId: null,
  orderVariantId: "v1",
  name: "Whey",
  slug: "whey",
  variantLabel: "Sabor: Uva",
  imageUrl: null,
  unitPriceCents: 8990,
  compareAtPriceCents: null,
  qty: 2,
  lineTotalCents: 17980,
  available: true,
  ...over,
})
const rows = [row({}), row({ orderVariantId: "v2", name: "Coqueteleira", variantLabel: null })]
const text = ptBR.storefront

describe("checkoutRefusalOf", () => {
  it("names every short line, with how many are left or that none is", () => {
    const details = { shortages: [{ variantId: "v1", available: 1 }, { variantId: "v2", available: 0 }] }

    expect(checkoutRefusalOf({ errorCode: "ORDER_STOCK_INSUFFICIENT", details }, rows, text)).toBe(
      "Não há estoque para tudo — Whey (Sabor: Uva): só restam 1; Coqueteleira: esgotado. Ajuste o carrinho e tente de novo.",
    )
  })

  it("names the lines no longer sold", () => {
    expect(checkoutRefusalOf({ errorCode: "ORDER_VARIANT_INVALID", details: { variantIds: ["v2"] } }, rows, text)).toBe(
      "Saiu de venda: Coqueteleira. Tire do carrinho e tente de novo.",
    )
  })

  it("says it plainly when nothing it names is in the cart, or it names nothing", () => {
    expect(checkoutRefusalOf({ errorCode: "ORDER_STOCK_INSUFFICIENT", details: { shortages: [{ variantId: "v9", available: 0 }] } }, rows, text)).toBe(text.checkoutStockShortAny)
    expect(checkoutRefusalOf({ errorCode: "ORDER_VARIANT_INVALID" }, rows, text)).toBe(text.checkoutProductGoneAny)
    expect(checkoutRefusalOf({ errorCode: "SOMETHING_ELSE" }, rows, text)).toBe(text.checkoutFailed)
  })

  it("reads the page again only for what the page read and has moved", () => {
    expect(["AUTH_UNAUTHENTICATED", "ORDER_DELIVERY_ADDRESS_MISSING", "ORDER_PAYMENT_NOT_ACCEPTED"].every(rereadsTheCart)).toBe(true)
    expect(rereadsTheCart("ORDER_STOCK_INSUFFICIENT")).toBe(false)
  })
})
