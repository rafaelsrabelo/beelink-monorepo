// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCardCartButton } from "./storefront-card-cart-button"
import { StorefrontCartUpsell } from "./storefront-cart-upsell"

const products = Array.from({ length: 4 }, (_, at) => ({
  id: `p${at}`,
  slug: `produto-${at}`,
  name: `Produto ${at}`,
  priceCents: 9990 + at * 1000,
  compareAtPriceCents: null,
  imageUrl: null,
  hasOptions: false,
}))

describe("StorefrontCartUpsell", () => {
  it("titles the section 'Você também pode gostar' and draws each product as a card with its own way into the cart", () => {
    render(
      <StorefrontCartUpsell
        products={products}
        productHref={(slug) => `/loja/produtos/${slug}`}
        locale="pt-BR"
        cardAction={(product) => <StorefrontCardCartButton name={product.name} hasOptions={false} onAdd={() => {}} />}
      />,
    )

    expect(screen.getByRole("region", { name: "Você também pode gostar" })).toBeInTheDocument()
    expect(screen.getAllByRole("listitem")).toHaveLength(4)
    expect(screen.getByRole("link", { name: /Produto 2/ })).toHaveAttribute("href", "/loja/produtos/produto-2")
    expect(screen.getAllByRole("button", { name: /Adicionar ao carrinho/ })).toHaveLength(4)
  })

  it("draws nothing with nothing to suggest", () => {
    const { container } = render(<StorefrontCartUpsell products={[]} productHref={(slug) => slug} locale="pt-BR" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCartUpsell products={products} productHref={(slug) => `/loja/produtos/${slug}`} locale="pt-BR" />)

    await expectNoA11yViolations(container)
  })
})
