// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCatalog } from "./storefront-catalog"

const categories = [
  { id: "1", slug: "mais-vendidos", name: "Mais vendidos", imageUrl: "https://cdn/mv.png" },
  { id: "2", slug: "promocoes", name: "Promoções", imageUrl: null },
]

const products = [
  { id: "p1", slug: "bolsa-amora", name: "Bolsa Amora", priceCents: 18900, compareAtPriceCents: 24900, imageUrl: "https://cdn/1.png" },
  { id: "p2", slug: "bolsa-serena", name: "Bolsa Serena", priceCents: 22500, compareAtPriceCents: null, imageUrl: null },
]

function renderCatalog(overrides: Partial<Parameters<typeof StorefrontCatalog>[0]> = {}) {
  return render(
    <StorefrontCatalog
      categories={categories}
      products={products}
      searchAction="/lessari"
      categoryHref={(slug) => (slug ? `/lessari?categoria=${slug}` : "/lessari")}
      productHref={(slug) => `/lessari/produtos/${slug}`}
      locale="pt-BR"
      {...overrides}
    />,
  )
}

describe("StorefrontCatalog", () => {
  /**
   * A GET form and links, never handlers. The address is what says which catalogue you are
   * looking at, so a filtered shop is bookmarkable, shareable and indexable — and the whole thing
   * works before any JavaScript arrives.
   */
  it("filters through the address, so a filtered shop can be shared", () => {
    renderCatalog()

    const form = screen.getByRole("search")
    expect(form).toHaveAttribute("method", "get")
    expect(form).toHaveAttribute("action", "/lessari")
    expect(screen.getByRole("searchbox")).toHaveAttribute("name", "busca")
    expect(screen.getByRole("link", { name: /Promoções/ })).toHaveAttribute(
      "href",
      "/lessari?categoria=promocoes",
    )
  })

  it("carries the open category through a search, instead of dropping it", () => {
    const { container } = renderCatalog({ activeCategory: "promocoes" })

    expect(container.querySelector('input[name="categoria"]')).toHaveValue("promocoes")
  })

  // Navigation that disappears when you use it is navigation you cannot get back out of.
  it("keeps every category listed while one of them is filtering", () => {
    renderCatalog({ activeCategory: "promocoes", products: [products[0]] })

    expect(screen.getByRole("link", { name: /Mais vendidos/ })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Tudo/ })).toHaveAttribute("href", "/lessari")
  })

  it("marks the open category for a reader who cannot see the ring", () => {
    renderCatalog({ activeCategory: "promocoes" })

    expect(screen.getByRole("link", { name: /Promoções/ })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: /Mais vendidos/ })).not.toHaveAttribute("aria-current")
  })

  it("makes the whole card the link, not a button inside it", () => {
    renderCatalog()

    const card = screen.getByRole("link", { name: /Bolsa Amora/ })
    expect(card).toHaveAttribute("href", "/lessari/produtos/bolsa-amora")
    expect(within(card).getByText(/189,00/)).toBeInTheDocument()
  })

  it("says so plainly when a product has no photograph yet", () => {
    renderCatalog()

    expect(screen.getByText("Sem foto")).toBeInTheDocument()
  })

  /** An empty result is a sentence and a way out, never a blank page. */
  it("offers a way back when nothing matched", () => {
    renderCatalog({ products: [] })

    expect(screen.getByText("Nada encontrado por aqui.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /^Tudo/ })).toBeInTheDocument()
  })

  it("can be told to hide prices, for a shop that quotes instead", () => {
    renderCatalog({ showPrice: false })

    expect(screen.queryByText(/189,00/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bolsa Amora/ })).toBeInTheDocument()
  })

  it("keeps what the shopkeeper typed in the box after a search", async () => {
    renderCatalog({ search: "bolsa" })

    expect(screen.getByRole("searchbox")).toHaveValue("bolsa")
    await userEvent.clear(screen.getByRole("searchbox"))
    expect(screen.getByRole("searchbox")).toHaveValue("")
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCatalog({ activeCategory: "promocoes", search: "bolsa" })

    await expectNoA11yViolations(container)
  })
})
