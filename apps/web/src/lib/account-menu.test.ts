// Libs
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { accountContactOf, accountMenuOf, accountShortcutsOf, accountTabTitleOf } from "./account-menu"
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

describe("the account's menu", () => {
  it("lists the overview and only the tabs delivered, each at its own address", () => {
    expect(accountMenuOf(routes)).toEqual([
      { key: "overview", href: "/loja/conta" },
      { key: "profile", href: "/loja/conta/perfil" },
    ])
    expect(accountShortcutsOf(routes, ptBR.storefront)).toEqual([{ key: "profile", href: "/loja/conta/perfil", hint: "Seus dados e o endereço de entrega" }])
    expect(accountTabTitleOf("profile", ptBR.storefront)).toBe("Perfil e endereços")
  })

  it("writes the phone as a person does, and falls back to the e-mail", () => {
    expect(accountContactOf({ phone: "5585999994321", email: "r@x.dev" })).toBe("(85) 99999-4321")
    expect(accountContactOf({ phone: "551133334444", email: "r@x.dev" })).toBe("(11) 3333-4444")
    expect(accountContactOf({ phone: "+351912345678", email: "r@x.dev" })).toBe("+351912345678")
    expect(accountContactOf({ phone: null, email: "r@x.dev" })).toBe("r@x.dev")
  })
})
