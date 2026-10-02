// Libs
import { describe, expect, it } from "vitest"

// Types
import type { CustomerFavorite, CustomerPendingReview } from "@harness-monorepo/contracts"

// App
import { favoritesRailItemsOf, OVERVIEW_REVIEWS, quickReviewsOf } from "./overview-parts"
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

const pendingOf = (count: number): CustomerPendingReview[] =>
  Array.from({ length: count }, (_, index) => ({ productId: `p${index + 1}`, slug: `produto-${index + 1}`, name: `Produto ${index + 1}`, imageUrl: null, variantLabel: null, orderNumber: 10, deliveredAt: "2026-09-20T12:00:00.000Z" }))

describe("the account front's parts", () => {
  it("offers the first few to rate, bringing a refused one beyond them to the front", () => {
    expect(quickReviewsOf(pendingOf(6), undefined).map((line) => line.productId)).toEqual(["p1", "p2", "p3", "p4"])
    expect(quickReviewsOf(pendingOf(6), "p6").map((line) => line.productId)).toEqual(["p6", "p1", "p2", "p3"])
    expect(quickReviewsOf(pendingOf(6), "p2").map((line) => line.productId)).toEqual(["p1", "p2", "p3", "p4"])
    expect(quickReviewsOf(pendingOf(2), "gone")).toHaveLength(2)
    expect(OVERVIEW_REVIEWS).toBe(4)
  })

  it("draws a favourite on the combination liked, with how much it dropped", () => {
    const favorite: CustomerFavorite = {
      productId: "p1",
      slug: "whey",
      name: "Whey",
      imageUrl: null,
      variant: { id: "v-1", label: "Sabor: Baunilha" },
      hasOptions: true,
      priceCents: 16990,
      compareAtPriceCents: null,
      likedPriceCents: 18990,
      likedAt: "2026-09-20T12:00:00.000Z",
      priceDropCents: 2000,
      onSale: false,
      soldOut: false,
    }
    expect(favoritesRailItemsOf([favorite], routes)).toEqual([
      { productId: "p1", href: "/loja/produtos/whey?variant=v-1", name: "Whey", imageUrl: null, priceCents: 16990, dropCents: 2000, soldOut: false },
    ])
  })
})
