// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontRelatedRail } from "./storefront-related-rail"

const products = Array.from({ length: 8 }, (_, at) => ({
  id: `p${at}`,
  slug: `produto-${at}`,
  name: `Produto ${at}`,
  priceCents: 9990 + at * 1000,
  compareAtPriceCents: null,
  imageUrl: null,
}))

describe("StorefrontRelatedRail", () => {
  it("titles the rail 'Você também pode gostar' and draws each product as a compact card", () => {
    render(<StorefrontRelatedRail products={products} productHref={(slug) => `/loja/produtos/${slug}`} locale="pt-BR" />)

    expect(screen.getByRole("heading", { level: 2, name: "Você também pode gostar" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Você também pode gostar" })).toBeInTheDocument()
    expect(screen.getAllByRole("link")).toHaveLength(8)
    expect(screen.getByRole("link", { name: /Produto 3/ })).toHaveAttribute("href", "/loja/produtos/produto-3")
  })

  it("draws nothing without products", () => {
    const { container } = render(<StorefrontRelatedRail products={[]} productHref={(slug) => slug} locale="pt-BR" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontRelatedRail products={products} productHref={(slug) => `/${slug}`} locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
