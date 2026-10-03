// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOrderSummary } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { isOrderInProgress, orderActionOf, orderCardViewOf, orderStatusLineOf } from "./order-card-view"
import { storefrontRoutes } from "./storefront-routes"

const routes = storefrontRoutes({
  slug: "loja",
  routeWords: {
    products: "produtos",
    categories: "categorias",
    search: "busca",
    cart: "carrinho",
    signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha",
    account: "conta",
    accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" },
  },
})
const context = { routes, locale: "pt-BR", messages: ptBR }

const order: CustomerOrderSummary = {
  number: 12,
  status: "RECEIVED",
  placedBy: "CUSTOMER",
  cancelledBy: null,
  statusAt: "2026-09-21T17:02:00.000Z",
  fulfillment: "DELIVERY",
  recipientName: "Bia Cliente",
  paymentMethod: "PIX",
  totalCents: 23722,
  deliveryFeeCents: 1000,
  discountCents: 0,
  coupon: null,
  cashback: null,
  cashbackUsedCents: 0,
  itemsCount: 3,
  items: [
    { productId: "p1", productSlug: "haze-300", productName: "Pré-Treino Haze", variantLabel: "Sabor: Uva", imageUrl: "https://img.test/haze.jpg", unitPriceCents: 11990, quantity: 1, lineTotalCents: 11990, discountCents: 0, promotionName: null },
    { productId: null, productSlug: null, productName: "Creatina", variantLabel: null, imageUrl: null, unitPriceCents: 5866, quantity: 2, lineTotalCents: 11732, discountCents: 0, promotionName: null },
  ],
  moreItems: 1,
  placedAt: "2026-09-21T17:02:00.000Z",
  estimate: null,
}

describe("orderCardViewOf", () => {
  it("writes the card's facts and lines in the shopper's words, linking a product that still exists", () => {
    const view = orderCardViewOf(order, context)

    expect(view).toMatchObject({ number: 12, placedOn: "21 de set. de 2026", shipTo: "Bia Cliente", moreItems: 1, tone: "progress" })
    expect(view.total.replace(/ /g, " ")).toBe("R$ 237,22 · Pix")
    expect(view.items).toEqual([
      { name: "Pré-Treino Haze", href: "/loja/produtos/haze-300", imageUrl: "https://img.test/haze.jpg", meta: "Sabor: Uva · Qtd. 1", reviewHref: null },
      { name: "Creatina", href: null, imageUrl: null, meta: "Qtd. 2", reviewHref: null },
    ])
  })

  it("adds '+ frete a combinar' to the total while a delivery's fee is not agreed — not once the order is cancelled", () => {
    expect(orderCardViewOf({ ...order, deliveryFeeCents: null }, context).total.replace(/\s/g, " ")).toBe("R$ 237,22 + frete a combinar · Pix")
    expect(orderCardViewOf({ ...order, deliveryFeeCents: null, status: "CANCELLED", cancelledBy: "CUSTOMER" }, context).total.replace(/\s/g, " ")).toBe("R$ 237,22 · Pix")
  })

  /** BEELINK-194: the list says what came off each order, and the coupon it took. */
  it("says what was taken off under the total, with the coupon's code — and nothing for an order with no discount", () => {
    expect(orderCardViewOf(order, context).saving).toBeNull()
    expect(orderCardViewOf({ ...order, discountCents: 2500 }, context).saving?.replace(/\s/g, " ")).toBe("Desconto de R$ 25,00")
    expect(orderCardViewOf({ ...order, discountCents: 4250, coupon: { code: "BEMVINDO10", kind: "PERCENT" } }, context).saving?.replace(/\s/g, " ")).toBe(
      "Desconto de R$ 42,50 · cupom BEMVINDO10",
    )
  })

  it("names a free delivery coupon that took nothing yet, and drops '+ frete' from its total", () => {
    const free = orderCardViewOf({ ...order, deliveryFeeCents: null, coupon: { code: "FRETEGRATIS", kind: "FREE_SHIPPING" } }, context)

    expect(free.saving).toBe("Cupom FRETEGRATIS")
    expect(free.total.replace(/\s/g, " ")).toBe("R$ 237,22 · Pix")
  })

  it("says a pick-up is picked up", () => {
    expect(orderCardViewOf({ ...order, fulfillment: "PICKUP", recipientName: null }, context).shipTo).toBe("Retirada na loja")
  })
})

describe("orderStatusLineOf", () => {
  it("leads a delivered order's lines still on sale to their rating, and nothing else", () => {
    const delivered = orderCardViewOf({ ...order, status: "DELIVERED" }, context)
    expect(delivered.items.map((item) => item.reviewHref)).toEqual([`/loja/conta/avaliacoes?produto=${order.items[0]!.productId}#avaliar-${order.items[0]!.productId}`, null])
  })

  it("names each status as the customer reads it, with when it was placed and by whom", () => {
    expect(orderStatusLineOf(order, context)).toEqual({
      headline: "Aguardando a loja confirmar",
      detail: "Feito por você na loja em 21 de set., 14:02. A loja confirma o pedido e o prazo.",
      tone: "progress",
    })
    expect(orderStatusLineOf({ ...order, status: "DELIVERED", statusAt: "2026-09-25T13:00:00.000Z", placedBy: "SHOP" }, context)).toEqual({
      headline: "Entregue em 25 de set. de 2026",
      detail: "Lançado pela loja em 21 de set., 14:02.",
      tone: "done",
    })
    expect(orderStatusLineOf({ ...order, status: "CANCELLED", cancelledBy: "CUSTOMER", statusAt: "2026-09-22T12:00:00.000Z" }, context)).toMatchObject({
      headline: "Cancelado em 22 de set. de 2026",
      detail: expect.stringContaining("Cancelado por você"),
      tone: "cancelled",
    })
  })
})

describe("isOrderInProgress", () => {
  it("follows an order from received to out for delivery, and not once it ended", () => {
    expect(["RECEIVED", "ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"].every((status) => isOrderInProgress(status as CustomerOrderSummary["status"]))).toBe(true)
    expect(isOrderInProgress("DELIVERED")).toBe(false)
    expect(isOrderInProgress("CANCELLED")).toBe(false)
  })
})

describe("orderActionOf", () => {
  it("offers the cancel while received, buying again once it ended, and nothing on its way", () => {
    expect(orderActionOf("RECEIVED")).toBe("cancel")
    expect(["ACCEPTED", "PREPARING", "OUT_FOR_DELIVERY"].map((status) => orderActionOf(status as CustomerOrderSummary["status"]))).toEqual([null, null, null])
    expect(orderActionOf("DELIVERED")).toBe("reorder")
    expect(orderActionOf("CANCELLED")).toBe("reorder")
  })
})

describe("the card's line once the shop told the window", () => {
  it("says when it should arrive rather than when it was placed, while on its way", () => {
    const told = { ...order, status: "PREPARING" as const, estimate: { from: "2026-09-24", to: "2026-09-25" } }

    expect(orderStatusLineOf(told, context).detail).toBe("Chega entre qui., 24 e sex., 25 de set.")
    // Delivered, the window has nothing more to say.
    expect(orderStatusLineOf({ ...told, status: "DELIVERED" }, context).detail).toMatch(/^Feito por você/)
  })
})
