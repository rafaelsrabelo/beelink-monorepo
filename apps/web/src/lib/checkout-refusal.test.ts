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
const context = { pickup: false, money: (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}` }

describe("checkoutRefusalOf", () => {
  it("names every short line, with how many are left or that none is", () => {
    const details = { shortages: [{ variantId: "v1", available: 1 }, { variantId: "v2", available: 0 }] }

    expect(checkoutRefusalOf({ errorCode: "ORDER_STOCK_INSUFFICIENT", details }, rows, text, context)).toBe(
      "Não há estoque para tudo — Whey (Sabor: Uva): só restam 1; Coqueteleira: esgotado. Ajuste o carrinho e tente de novo.",
    )
  })

  /** BEELINK-244: the credit was spent elsewhere, or a part of it expired, between the price on screen and the order. */
  it("says the cashback balance moved, and that the amount was updated", () => {
    expect(checkoutRefusalOf({ errorCode: "ORDER_CASHBACK_REFUSED", details: { requestedCents: 1500, maxCents: 400 } }, rows, text, context)).toBe(
      "Seu saldo de cashback mudou e o pedido não foi feito. Atualizamos o valor: confira o total e faça o pedido de novo.",
    )
    // The page asks the cart's price again for this one: what it read of the shopper has not moved.
    expect(rereadsTheCart("ORDER_CASHBACK_REFUSED")).toBe(false)
  })

  /** BEELINK-194: the coupon ran out between the price on screen and the order. */
  it("says why the order's coupon was not taken, with the reason the coupon field would give", () => {
    expect(checkoutRefusalOf({ errorCode: "ORDER_COUPON_REFUSED", details: { reason: "EXHAUSTED" } }, rows, text, context)).toBe(
      "O cupom não entrou no pedido. Esse cupom já foi usado o número máximo de vezes. Confira o total e faça o pedido de novo.",
    )
    expect(checkoutRefusalOf({ errorCode: "ORDER_COUPON_REFUSED", details: { reason: "BELOW_MINIMUM", minSubtotalCents: 10000 } }, rows, text, context)).toContain(
      "a partir de R$ 100,00 em produtos",
    )
    expect(checkoutRefusalOf({ errorCode: "ORDER_COUPON_REFUSED", details: { reason: "NOT_APPLICABLE" } }, rows, text, { ...context, pickup: true })).toContain(
      "Cupom de frete grátis vale só para entrega.",
    )
    // BEELINK-245: an order placed meanwhile, in another tab, ended the first purchase.
    expect(checkoutRefusalOf({ errorCode: "ORDER_COUPON_REFUSED", details: { reason: "NOT_FIRST_PURCHASE" } }, rows, text, context)).toBe(
      "O cupom não entrou no pedido. Esse cupom vale só na primeira compra. Confira o total e faça o pedido de novo.",
    )
    // A reason this app does not know is not guessed at.
    expect(checkoutRefusalOf({ errorCode: "ORDER_COUPON_REFUSED", details: { reason: "SOMETHING_NEW" } }, rows, text, context)).toBe(text.checkoutFailed)
    expect(checkoutRefusalOf({ errorCode: "ORDER_COUPON_REFUSED" }, rows, text, context)).toBe(text.checkoutFailed)
  })

  it("names the lines no longer sold", () => {
    expect(checkoutRefusalOf({ errorCode: "ORDER_VARIANT_INVALID", details: { variantIds: ["v2"] } }, rows, text, context)).toBe(
      "Saiu de venda: Coqueteleira. Tire do carrinho e tente de novo.",
    )
  })

  it("says it plainly when nothing it names is in the cart, or it names nothing", () => {
    expect(checkoutRefusalOf({ errorCode: "ORDER_STOCK_INSUFFICIENT", details: { shortages: [{ variantId: "v9", available: 0 }] } }, rows, text, context)).toBe(text.checkoutStockShortAny)
    expect(checkoutRefusalOf({ errorCode: "ORDER_VARIANT_INVALID" }, rows, text, context)).toBe(text.checkoutProductGoneAny)
    expect(checkoutRefusalOf({ errorCode: "SOMETHING_ELSE" }, rows, text, context)).toBe(text.checkoutFailed)
    // An address removed in another tab since the cart drew it: chosen, and gone.
    expect(checkoutRefusalOf({ errorCode: "ORDER_ADDRESS_NOT_FOUND" }, rows, text, context)).toBe(text.checkoutAddressChosenGone)
  })

  it("reads the page again only for what the page read and has moved", () => {
    expect(["AUTH_UNAUTHENTICATED", "ORDER_DELIVERY_ADDRESS_MISSING", "ORDER_ADDRESS_NOT_FOUND", "ORDER_PAYMENT_NOT_ACCEPTED"].every(rereadsTheCart)).toBe(true)
    expect(rereadsTheCart("ORDER_STOCK_INSUFFICIENT")).toBe(false)
  })
})
