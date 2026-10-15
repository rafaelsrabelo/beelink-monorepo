// Libs
import { describe, expect, it, vi } from "vitest"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { storefrontRoutes } from "@/lib/storefront-routes"
import { shopHeaderOf } from "./shop-header"

// next/font runs only in Next's compiler, and the conversations' panel draws in the shop's face.
vi.mock("@/components/storefront/shop-font", () => ({ figtree: { variable: "font-figtree", style: {} }, shopFontStyle: {} }))

const routeWords = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }
const shop = { slug: "mutante", routeWords, socialNetworks: { whatsapp: "5585999998888" } } as unknown as PublicStore
const routes = storefrontRoutes(shop)
const options = { scopes: [], scope: "", messages: ptBR }

describe("shopHeaderOf", () => {
  it("gives a shop its search, its CEP for the quote, its basket and the visitor's way to sign in", () => {
    const header = shopHeaderOf(shop, routes, options)

    expect(header.searchSlot).toBeTruthy()
    expect(header.deliverTo).toBeTruthy()
    expect(header.searchAction).toBe("/mutante/busca")
    expect(header.cartHref).toBe("/mutante/carrinho")
    expect(header.cartSlot).toBeTruthy()
    expect(header.accountHref).toBe("/mutante/entrar")
    expect(header.conversationsSlot).toBeUndefined()
  })

  it("offers nothing to buy at a shop off the air, and keeps a signed-in customer's account and conversations (BEELINK-296)", () => {
    const header = shopHeaderOf({ ...shop, unavailable: true }, routes, { ...options, shopper: { name: "Ana" } })

    expect(Object.keys(header).sort()).toEqual(["accountHref", "accountMenu", "accountName", "conversationsSlot"])
    expect(header.accountHref).toBe("/mutante/conta")
    expect(header.accountName).toBe("Ana")
    expect(header.accountMenu).toBeTruthy()
    expect(header.conversationsSlot).toBeTruthy()
  })

  it("still leads a visitor at a shop off the air to sign in, where a customer reads their orders", () => {
    const header = shopHeaderOf({ ...shop, unavailable: true }, routes, options)

    expect(header.searchSlot).toBeUndefined()
    expect(header.cartHref).toBeUndefined()
    expect(header.deliverTo).toBeUndefined()
    expect(header.accountHref).toBe("/mutante/entrar")
  })
})
