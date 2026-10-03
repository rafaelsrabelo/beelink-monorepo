// Libs
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerFavorite, CustomerFavoriteListQuery, CustomerFavoritePage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { storefrontRoutes } from "@/lib/storefront-routes"
import { AccountFavoritesRail } from "./account-favorites-rail"

const read = vi.hoisted(() => ({ page: null as CustomerFavoritePage | null, asked: [] as CustomerFavoriteListQuery[] }))
vi.mock("@/lib/customer-favorites", () => ({
  customerFavoritesAt: async (_slug: string, query: CustomerFavoriteListQuery) => {
    read.asked.push(query)
    return read.page
  },
}))

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

const whey: CustomerFavorite = {
  productId: "p1",
  slug: "whey",
  name: "Whey",
  imageUrl: null,
  variant: null,
  hasOptions: false,
  priceCents: 16990,
  compareAtPriceCents: null,
  likedPriceCents: 18990,
  likedAt: "2026-09-20T12:00:00.000Z",
  priceDropCents: 2000,
  onSale: false,
  soldOut: false,
}

async function mount() {
  return render(<>{await AccountFavoritesRail({ slug: "loja", routes, locale: "pt-BR", messages: ui })}</>)
}

afterEach(() => {
  read.page = null
  read.asked = []
})

describe("Seus favoritos, on the account's front", () => {
  it("reads the menu's own page, and counts every favourite and every drop, not only those shown", async () => {
    read.page = { favorites: [whey], total: 9, page: 1, pageSize: 6, counts: { ALL: 9, PRICE_DROPPED: 3, ON_SALE: 0, SOLD_OUT: 1 } }
    await mount()

    expect(read.asked).toEqual([{ pageSize: 6 }])
    expect(screen.getByText("9 produtos · 3 baixaram de preço")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todos (9)" })).toHaveAttribute("href", "/loja/conta/favoritos")
    expect(screen.getByRole("link", { name: /Whey/ })).toHaveAttribute("href", "/loja/produtos/whey")
  })

  it("draws nothing with no favourite, or when the read failed", async () => {
    read.page = { favorites: [], total: 0, page: 1, pageSize: 6, counts: { ALL: 0, PRICE_DROPPED: 0, ON_SALE: 0, SOLD_OUT: 0 } }
    expect((await mount()).container).toBeEmptyDOMElement()
    read.page = null
    expect((await mount()).container).toBeEmptyDOMElement()
  })
})
