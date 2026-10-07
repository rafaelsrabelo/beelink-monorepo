// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Types
import type { PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StorefrontSectionBand } from "./storefront-section-band"
import { storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionPlace } from "@/lib/storefront-section"

const store = {
  slug: "loja",
  name: "Loja",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
} as unknown as PublicStore

const category = (slug: string, bannerUrl: string | null, parentSlug: string | null = null): PublicProductCategory => ({
  id: slug,
  slug,
  name: slug === "whey" ? "Whey" : "Proteínas",
  description: null,
  imageUrl: null,
  bannerUrl,
  parentSlug,
  productCount: 1,
})

/** A category's own page, as `placeOf` would hand it over. No shelf: the band's count streams apart. */
function draw(own: PublicProductCategory, parent: PublicProductCategory | null = null, section: SectionPlace["section"] = { kind: "category", slug: own.slug }) {
  const place = { store, section, category: section.kind === "category" ? own : null, parentCategory: parent, navigation: { categories: [own], onSale: false }, messages: ptBR, term: "", page: 1, filters: {} } as unknown as SectionPlace

  return render(<StorefrontSectionBand place={place} routes={storefrontRoutes(store)} locale="pt-BR" />)
}

describe("StorefrontSectionBand — a category's banner (BEELINK-307)", () => {
  it("draws the category's banner between the trail and the title, as decoration", () => {
    const { container } = draw(category("proteinas", "https://cdn.example/proteinas.png"))

    const [trail, picture, title] = [screen.getByRole("navigation"), container.querySelector("img")!, screen.getByRole("heading", { level: 1, name: "Proteínas" })]
    expect(picture).toHaveAttribute("src", "https://cdn.example/proteinas.png")
    expect(picture).toHaveAttribute("alt", "")
    expect(trail.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(picture.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("draws a subcategory with none under its parent's", () => {
    const { container } = draw(category("whey", null, "proteinas"), category("proteinas", "https://cdn.example/proteinas.png"))

    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example/proteinas.png")
    expect(screen.getByRole("heading", { level: 1, name: "Whey" })).toBeInTheDocument()
  })

  it("draws no picture, and the band as it always was, for a category with none", () => {
    const { container } = draw(category("proteinas", null))

    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByRole("navigation").nextElementSibling).toContainElement(screen.getByRole("heading", { level: 1 }))
  })

  it("draws none on the whole catalogue", () => {
    const { container } = draw(category("proteinas", "https://cdn.example/proteinas.png"), null, { kind: "catalog" })

    expect(container.querySelector("img")).toBeNull()
  })
})
