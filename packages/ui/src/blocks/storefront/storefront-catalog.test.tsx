// Libs
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCatalog } from "./storefront-catalog"

const products = [
  { id: "p1", slug: "bolsa-amora", name: "Bolsa Amora", priceCents: 18900, compareAtPriceCents: 24900, imageUrl: "https://cdn/1.png" },
  { id: "p2", slug: "bolsa-serena", name: "Bolsa Serena", priceCents: 22500, compareAtPriceCents: null, imageUrl: null },
]

function renderCatalog(overrides: Partial<Parameters<typeof StorefrontCatalog>[0]> = {}) {
  return render(
    <StorefrontCatalog
      products={products}
      productHref={(slug) => `/lessari/produtos/${slug}`}
      locale="pt-BR"
      {...overrides}
    />,
  )
}

describe("StorefrontCatalog", () => {
  /** One link per product, the name, stretched over its card — never a button inside it. */
  it("draws each product as a card with one link, its name, and its price and saving beside it", () => {
    renderCatalog()

    const link = screen.getByRole("link", { name: /Bolsa Amora/ })
    expect(link).toHaveAttribute("href", "/lessari/produtos/bolsa-amora")
    const card = link.closest("article")!
    expect(within(card).getByText(/189,00/)).toBeInTheDocument()
    expect(within(card).getByText("-24%")).toBeInTheDocument()
  })

  it("says so plainly when a product has no photograph yet", () => {
    renderCatalog()

    expect(screen.getByText("Sem foto")).toBeInTheDocument()
  })

  /** Someone who filtered into a corner needs the door more than an explanation. */
  it("offers the whole catalogue when a category or a search found nothing", () => {
    renderCatalog({ products: [], clearHref: "/lessari/produtos" })

    expect(screen.getByText("Nada encontrado por aqui.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver todos os produtos" })).toHaveAttribute("href", "/lessari/produtos")
  })

  it("says the filters left nothing, and offers 'Ver tudo' at the address of 'Limpar tudo'", () => {
    renderCatalog({ products: [], clearHref: "/lessari/produtos?ordenar=menor-preco", filtered: true })

    expect(screen.getByText("Nenhum produto com esses filtros.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver tudo" })).toHaveAttribute("href", "/lessari/produtos?ordenar=menor-preco")
  })

  // An outage read as "nothing found" sends a visitor away for good.
  it("says the shelf could not be read, and offers the same address again", () => {
    renderCatalog({ products: [], clearHref: "/lessari/produtos", retryHref: "/lessari/produtos?pagina=2" })

    expect(screen.getByText("Não conseguimos carregar os produtos agora.")).toBeInTheDocument()
    expect(screen.queryByText("Nada encontrado por aqui.")).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tentar de novo" })).toHaveAttribute("href", "/lessari/produtos?pagina=2")
  })

  it("says nothing more than the sentence when there is nowhere to send them", () => {
    renderCatalog({ products: [] })

    expect(screen.getByText("Nada encontrado por aqui.")).toBeInTheDocument()
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("can be told to hide prices, for a shop that quotes instead", () => {
    renderCatalog({ showPrice: false })

    expect(screen.queryByText(/189,00/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bolsa Amora/ })).toBeInTheDocument()
  })

  /** line-clamp truncates the picture and not the DOM, so a reader hears the whole name once. */
  it("keeps a long title whole for a reader, clamped to two lines for the eye", () => {
    const name = "Bolsa Amora em crochê com alça de couro, forro interno e bolso lateral"
    renderCatalog({ products: [{ ...products[0], name }] })

    const link = screen.getByRole("link", { name })
    expect(link).toHaveClass("line-clamp-2")
    expect(screen.getAllByText(name)).toHaveLength(1)
  })

  it("has no accessibility violations", async () => {
    const { container } = renderCatalog()

    await expectNoA11yViolations(container)
  })
})
