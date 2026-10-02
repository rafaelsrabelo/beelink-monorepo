// Libs
import { describe, expect, it } from "vitest"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { storefrontRoutes } from "@/lib/storefront-routes"
import { shopFooterColumnsOf } from "./shop-chrome"

const routes = storefrontRoutes({
  slug: "mutante",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
})

describe("shopFooterColumnsOf", () => {
  it("lists the shop's own pages, then its landings, and a way to order when it has a WhatsApp", () => {
    const store = { socialNetworks: { whatsapp: "5585999998888" } } as unknown as PublicStore

    const [shop, contact] = shopFooterColumnsOf(store, routes, ptBR, [{ id: "page-ofertas", label: "Ofertas", href: "/mutante/lp/ofertas" }])

    expect(shop?.items.map((item) => item.href)).toEqual(["/mutante/produtos", "/mutante/categorias", "/mutante/carrinho", "/mutante/lp/ofertas"])
    expect(contact?.id).toBe("contact")
  })

  it("has no contact column for a shop no one can message", () => {
    const store = { socialNetworks: { whatsapp: null } } as unknown as PublicStore

    expect(shopFooterColumnsOf(store, routes, ptBR).map((column) => column.id)).toEqual(["shop", "legal"])
  })

  it("ends with bee-link's terms and privacy policy, which every shop account is opened under (BEELINK-171)", () => {
    const store = { socialNetworks: { whatsapp: "5585999998888" } } as unknown as PublicStore

    const legal = shopFooterColumnsOf(store, routes, ptBR).at(-1)

    expect(legal).toEqual({
      id: "legal",
      title: "Termos e privacidade",
      items: [
        { label: "Termos de uso", href: "/termos" },
        { label: "Política de privacidade", href: "/privacidade" },
      ],
    })
  })
})
