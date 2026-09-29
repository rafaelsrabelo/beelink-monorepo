// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerOrder, CustomerOrderSummary } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { accountDetailsViewOf, lastOrderViewOf, orderNowViewOf } from "./account-overview"
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

const order: CustomerOrder = {
  number: 1042,
  status: "PREPARING",
  placedBy: "CUSTOMER",
  cancelledBy: null,
  fulfillment: "DELIVERY",
  deliveryAddress: { recipientName: "Marina Souza", zipCode: "60160-230", street: "Rua Tibúrcio Cavalcante", number: "1200", complement: "apto 302", neighborhood: "Meireles", city: "Fortaleza", state: "CE" },
  paymentMethod: "PIX",
  items: [],
  subtotalCents: 23722,
  deliveryFeeCents: 0,
  discountCents: 0,
  totalCents: 23722,
  placedAt: "2026-09-27T17:02:00.000Z",
  events: [
    { status: "RECEIVED", at: "2026-09-27T17:02:00.000Z" },
    { status: "ACCEPTED", at: "2026-09-27T18:10:00.000Z" },
    { status: "PREPARING", at: "2026-09-28T12:00:00.000Z" },
  ],
}

describe("the account's front", () => {
  it("tells the order on its way: number and total, where it stands, where it goes and its steps", () => {
    const view = orderNowViewOf(order, 0, context)

    expect(view.eyebrow).toMatch(/^Pedido nº 1042 · R\$\s237,22 · Pix$/)
    expect(view.headline).toBe("Em preparo")
    expect(view.destination).toBe("Para Marina Souza · Rua Tibúrcio Cavalcante, 1200, apto 302 — Fortaleza/CE")
    expect(view.note).toBeNull()
    expect(view.steps.map((step) => step.state)).toEqual(["done", "done", "current", "todo", "todo"])
    expect(view.href).toBe("/loja/conta/pedidos/1042")
    expect(view.more).toBeNull()
  })

  it("says a pick-up is one, adds the shop's promise while it waits, and counts the others on their way", () => {
    const view = orderNowViewOf({ ...order, status: "RECEIVED", fulfillment: "PICKUP", deliveryAddress: null, events: order.events.slice(0, 1) }, 2, context)

    expect(view.headline).toBe("Aguardando a loja confirmar")
    expect(view.destination).toBe("Retirada na loja")
    expect(view.note).toBe("A loja confirma o pedido e o prazo.")
    expect(view.more).toEqual({ label: "Você tem mais 2 pedidos em andamento", href: "/loja/conta/pedidos?situacao=em-andamento" })
    expect(orderNowViewOf(order, 1, context).more?.label).toBe("Você tem mais 1 pedido em andamento")
  })

  it("draws no destination for a delivery that recorded no address", () => {
    expect(orderNowViewOf({ ...order, deliveryAddress: null }, 0, context).destination).toBeNull()
  })

  it("tells how the last order ended, as the list's card does", () => {
    const last: CustomerOrderSummary = {
      number: 12,
      status: "CANCELLED",
      placedBy: "CUSTOMER",
      cancelledBy: "CUSTOMER",
      statusAt: "2026-09-27T20:00:00.000Z",
      fulfillment: "DELIVERY",
      recipientName: "Marina Souza",
      paymentMethod: "PIX",
      totalCents: 5000,
      itemsCount: 1,
      items: [],
      moreItems: 0,
      placedAt: "2026-09-27T17:02:00.000Z",
    }

    expect(lastOrderViewOf(last, context)).toEqual({
      number: 12,
      headline: "Cancelado em 27 de set. de 2026",
      detail: "Cancelado por você · Feito por você na loja em 27 de set., 14:02.",
      tone: "cancelled",
    })
  })

  it("writes the shopper's details as the checkout will use them, and null for what is not on file", () => {
    const nothing = { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null }

    expect(accountDetailsViewOf({ id: "c1", name: "Bia", email: "bia@exemplo.com", phone: "5585999994321", address: { ...nothing, street: "Rua A", number: "10", city: "Fortaleza", state: "CE" } })).toEqual({
      phone: "(85) 99999-4321",
      email: "bia@exemplo.com",
      address: "Rua A, 10 — Fortaleza/CE",
      addressIncomplete: false,
    })
    expect(accountDetailsViewOf({ id: "c1", name: "Bia", email: "bia@exemplo.com", phone: null, address: nothing })).toEqual({ phone: null, email: "bia@exemplo.com", address: null, addressIncomplete: false })
    // A CEP alone is on file, and still nowhere to deliver.
    expect(accountDetailsViewOf({ id: "c1", name: "Bia", email: "bia@exemplo.com", phone: null, address: { ...nothing, zipCode: "60323231" } })).toMatchObject({ address: "CEP 60323-231", addressIncomplete: true })
  })
})
