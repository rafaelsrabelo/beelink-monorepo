// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { orderCancelRefusalOf } from "./order-cancel-refusal"

const text = ptBR.storefront

describe("orderCancelRefusalOf", () => {
  it("says why the shop refused, in the shopper's words", () => {
    expect(orderCancelRefusalOf("ORDER_NOT_CANCELLABLE", text)).toBe("A loja já aceitou este pedido. Para cancelar, fale com a loja.")
    expect(orderCancelRefusalOf("ORDER_CANCELLED", text)).toBe("Este pedido já foi cancelado.")
  })

  /** BEELINK-205: paid between the page being drawn and the press. */
  it("says an order paid meanwhile is not cancelled from here", () => {
    expect(orderCancelRefusalOf("ORDER_PAID", text)).toBe("Este pedido já foi pago, e por isso não pode ser cancelado por aqui. Fale com a loja.")
  })

  /** Not the checkout's sentence: the shopper was cancelling, not buying. */
  it("tells a shopper whose session ended to sign in again to cancel", () => {
    expect(orderCancelRefusalOf("AUTH_UNAUTHENTICATED", text)).toBe("Sua sessão terminou. Entre de novo para cancelar o pedido.")
  })

  it("falls back to trying again for anything else", () => {
    expect(orderCancelRefusalOf("RATE_LIMITED", text)).toBe("Não foi possível cancelar agora. Tente de novo.")
    expect(orderCancelRefusalOf(null, text)).toBe("Não foi possível cancelar agora. Tente de novo.")
  })
})
