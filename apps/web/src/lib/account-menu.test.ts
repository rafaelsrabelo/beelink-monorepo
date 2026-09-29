// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { accountContactOf, accountMenuOf, accountTabTitleOf, deliveredAccountTabOf, headerAccountMenuOf, phoneLineOf } from "./account-menu"
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

describe("the header's account menu", () => {
  it("offers the orders, the profile and the conversation, in that order, and signs out at the shop's door", () => {
    expect(headerAccountMenuOf(routes, "loja")).toEqual({
      items: [
        { key: "orders", href: "/loja/conta/pedidos" },
        { key: "profile", href: "/loja/conta/perfil" },
        { key: "messages", href: "/loja/conta/conversas" },
      ],
      signOutAction: "/loja/api/customer/sair",
    })
  })
})

describe("the account's menu", () => {
  it("lists the overview and only the tabs delivered, each at its own address", () => {
    expect(accountMenuOf(routes, { orders: 2 })).toEqual([
      { key: "overview", href: "/loja/conta" },
      { key: "orders", href: "/loja/conta/pedidos", count: 2 },
      { key: "profile", href: "/loja/conta/perfil", count: null },
      { key: "messages", href: "/loja/conta/conversas", count: null },
    ])
    expect(accountTabTitleOf("profile", ptBR.storefront)).toBe("Perfil e endereços")
  })

  it("opens a delivered tab by its word, and nothing for a tab still to come or a word that is none", () => {
    const routeWords = {
      products: "produtos",
      categories: "categorias",
      search: "busca",
      cart: "carrinho",
      signIn: "entrar",
      account: "conta",
      accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", profile: "perfil", messages: "conversas" },
    }
    expect(deliveredAccountTabOf("perfil", routeWords)).toBe("profile")
    expect(deliveredAccountTabOf("pedidos", routeWords)).toBe("orders")
    expect(deliveredAccountTabOf("conversas", routeWords)).toBe("messages")
    // Spelled and routed already, delivered by its own ticket: until then, a 404.
    expect(deliveredAccountTabOf("favoritos", routeWords)).toBeNull()
    expect(deliveredAccountTabOf("qualquer", routeWords)).toBeNull()
  })

  it("writes the phone as a person does, and falls back to the e-mail", () => {
    expect(accountContactOf({ phone: "5585999994321", email: "r@x.dev" })).toBe("(85) 99999-4321")
    expect(accountContactOf({ phone: "551133334444", email: "r@x.dev" })).toBe("(11) 3333-4444")
    expect(accountContactOf({ phone: "+351912345678", email: "r@x.dev" })).toBe("+351912345678")
    expect(accountContactOf({ phone: null, email: "r@x.dev" })).toBe("r@x.dev")
    expect(phoneLineOf(null)).toBeNull()
    expect(phoneLineOf("5585999994321")).toBe("(85) 99999-4321")
  })
})
