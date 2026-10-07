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

  describe("with the shop's action on each card", () => {
    const withAction = () =>
      render(
        <StorefrontRelatedRail
          products={products}
          productHref={(slug) => `/loja/produtos/${slug}`}
          locale="pt-BR"
          cardAction={(product) => <button type="button">{`Adicionar ${product.name} ao carrinho`}</button>}
        />,
      )

    it("draws one per product, named for it", () => {
      withAction()

      expect(screen.getAllByRole("button", { name: /^Adicionar Produto \d ao carrinho$/ })).toHaveLength(8)
    })

    // A button inside an anchor is one control inside another: a press would be both, and axe fails it.
    it("keeps the action beside the card's link, never inside it", () => {
      withAction()

      const plus = screen.getByRole("button", { name: "Adicionar Produto 3 ao carrinho" })
      const link = screen.getByRole("link", { name: /Produto 3/ })
      expect(link).not.toContainElement(plus)
      expect(plus.closest("li")).toBe(link.closest("li"))
    })

    // Over the photo, in a layer of the photo's own height: the card is as tall as it was without it.
    it("stands the action on the photo's lower corner, in a layer that lets every other press through", () => {
      withAction()

      const layer = screen.getByRole("button", { name: "Adicionar Produto 0 ao carrinho" }).parentElement!
      expect(layer).toHaveClass("absolute", "top-0", "h-[180px]", "items-end", "justify-end", "pointer-events-none")
    })

    it("has no accessibility violations", async () => {
      const { container } = withAction()

      await expectNoA11yViolations(container)
    })
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
