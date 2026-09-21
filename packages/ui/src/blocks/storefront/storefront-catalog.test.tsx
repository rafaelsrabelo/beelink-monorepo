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
  /** A card where only part of it is clickable teaches a visitor that clicking does nothing. */
  it("makes the whole card the link, not a button inside it", () => {
    renderCatalog()

    const card = screen.getByRole("link", { name: /Bolsa Amora/ })
    expect(card).toHaveAttribute("href", "/lessari/produtos/bolsa-amora")
    expect(within(card).getByText(/189,00/)).toBeInTheDocument()
    expect(within(card).getByText("-24%")).toBeInTheDocument()
  })

  it("says so plainly when a product has no photograph yet", () => {
    renderCatalog()

    expect(screen.getByText("Sem foto")).toBeInTheDocument()
  })

  /** Someone who filtered into a corner needs the door more than an explanation. */
  it("offers a way out when nothing matched", () => {
    renderCatalog({ products: [], clearHref: "/lessari" })

    expect(screen.getByText("Nada encontrado por aqui.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tudo" })).toHaveAttribute("href", "/lessari")
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

  it("has no accessibility violations", async () => {
    const { container } = renderCatalog()

    await expectNoA11yViolations(container)
  })
})
