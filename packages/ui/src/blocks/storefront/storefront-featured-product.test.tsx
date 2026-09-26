// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFeaturedProduct } from "./storefront-featured-product"

const product = {
  name: "Whey Baunilha 900 g",
  href: "/loja/produtos/whey",
  imageUrl: "https://cdn.example/whey.png",
  priceCents: 12990,
  compareAtPriceCents: 15990,
  soldOut: false,
}

describe("StorefrontFeaturedProduct", () => {
  it("heads the block with its title and names the product under it, with its price", () => {
    render(<StorefrontFeaturedProduct layout="IMAGE_LEFT" title="Oferta relâmpago" product={product} locale="pt-BR" />)

    expect(screen.getByRole("heading", { level: 2, name: "Oferta relâmpago" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Whey Baunilha 900 g" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Whey Baunilha 900 g" })).toHaveAttribute("href", "/loja/produtos/whey")
    expect(screen.getByText("R$ 129,90")).toHaveClass("sr-only")
  })

  it("lets the product's name head the block when it has no title", () => {
    render(<StorefrontFeaturedProduct layout="IMAGE_LARGE" product={product} locale="pt-BR" />)

    expect(screen.getByRole("heading", { level: 2, name: "Whey Baunilha 900 g" })).toBeInTheDocument()
  })

  it("says it is sold out, which is why there is no button to buy", () => {
    render(<StorefrontFeaturedProduct layout="IMAGE_LEFT" product={{ ...product, soldOut: true }} locale="pt-BR" />)

    expect(screen.getByText("Esgotado")).toBeInTheDocument()
  })

  it("draws the action it is given, and none otherwise", () => {
    const { rerender } = render(<StorefrontFeaturedProduct layout="IMAGE_LEFT" product={product} locale="pt-BR" action={<button type="button">Comprar</button>} />)
    expect(screen.getByRole("button", { name: "Comprar" })).toBeInTheDocument()

    rerender(<StorefrontFeaturedProduct layout="IMAGE_LEFT" product={product} locale="pt-BR" />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <main>
        <StorefrontFeaturedProduct layout="IMAGE_LEFT" title="Oferta relâmpago" subtitle="Estoque limitado" product={product} locale="pt-BR" />
      </main>,
    )

    await expectNoA11yViolations(container)
  })
})
