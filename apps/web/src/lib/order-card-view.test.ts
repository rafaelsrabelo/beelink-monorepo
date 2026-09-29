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
    signIn: "entrar",
    account: "conta",
    accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" },
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
  itemsCount: 3,
  items: [
    { productId: "p1", productSlug: "haze-300", productName: "Pré-Treino Haze", variantLabel: "Sabor: Uva", imageUrl: "https://img.test/haze.jpg", unitPriceCents: 11990, quantity: 1, lineTotalCents: 11990 },
    { productId: null, productSlug: null, productName: "Creatina", variantLabel: null, imageUrl: null, unitPriceCents: 5866, quantity: 2, lineTotalCents: 11732 },
  ],
  moreItems: 1,
  placedAt: "2026-09-21T17:02:00.000Z",
}

describe("orderCardViewOf", () => {
  it("writes the card's facts and lines in the shopper's words, linking a product that still exists", () => {
    const view = orderCardViewOf(order, context)

    expect(view).toMatchObject({ number: 12, placedOn: "21 de set. de 2026", shipTo: "Bia Cliente", moreItems: 1, tone: "progress" })
    expect(view.total.replace(/ /g, " ")).toBe("R$ 237,22 · Pix")
    expect(view.items).toEqual([
      { name: "Pré-Treino Haze", href: "/loja/produtos/haze-300", imageUrl: "https://img.test/haze.jpg", meta: "Sabor: Uva · Qtd. 1" },
      { name: "Creatina", href: null, imageUrl: null, meta: "Qtd. 2" },
    ])
  })

  it("says a pick-up is picked up", () => {
    expect(orderCardViewOf({ ...order, fulfillment: "PICKUP", recipientName: null }, context).shipTo).toBe("Retirada na loja")
  })
})

describe("orderStatusLineOf", () => {
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
