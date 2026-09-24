// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductGrid } from "./storefront-product-grid"

const products = [
  { id: "p1", slug: "bolsa-amora", name: "Bolsa Amora", priceCents: 18900, compareAtPriceCents: 24900, imageUrl: "https://cdn/1.png" },
  { id: "p2", slug: "bolsa-serena", name: "Bolsa Serena", priceCents: 22500, compareAtPriceCents: null, imageUrl: null },
]

function renderGrid(overrides: Partial<Parameters<typeof StorefrontProductGrid>[0]> = {}) {
  return render(
    <StorefrontProductGrid
      products={products}
      productHref={(slug) => `/lessari/produtos/${slug}`}
      locale="pt-BR"
      title="Lançamentos"
      {...overrides}
    />,
  )
}

describe("StorefrontProductGrid", () => {
  it("draws every product as a card that leads to it, under the shelf's title", () => {
    renderGrid()

    expect(screen.getByRole("heading", { name: "Lançamentos" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Bolsa Amora/ })).toHaveAttribute("href", "/lessari/produtos/bolsa-amora")
    expect(screen.getAllByRole("listitem")).toHaveLength(2)
  })

  /**
   * The owner's count is where the grid ends up, at the cell's widest: jsdom has no layout, so what
   * this pins is the class of the last step. Two on a phone, whatever the count.
   */
  it("reaches the owner's column count as the cell widens, from two on a phone", () => {
    const { container, rerender } = renderGrid({ columns: 6 })
    const list = () => container.querySelector("ul")!.className.split(" ")

    expect(list()).toEqual(expect.arrayContaining(["grid-cols-2", "@6xl:grid-cols-6"]))

    rerender(
      <StorefrontProductGrid products={products} productHref={(slug) => slug} locale="pt-BR" title="x" columns={2} />,
    )
    expect(list()).toContain("grid-cols-2")
    expect(list().some((name) => name.startsWith("@"))).toBe(false)
  })

  it("names its way to the rest by the shelf", () => {
    renderGrid({ seeAllHref: "/lessari/produtos" })

    expect(screen.getByRole("link", { name: "Ver tudo em Lançamentos" })).toHaveAttribute("href", "/lessari/produtos")
  })

  it("draws nothing for a shelf with no products", () => {
    const { container } = renderGrid({ products: [] })

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderGrid({ seeAllHref: "/lessari/produtos" })

    await expectNoA11yViolations(container)
  })
})
