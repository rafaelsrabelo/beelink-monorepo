// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFeaturedBuy, type StorefrontFeaturedBuyProps } from "./storefront-featured-buy"

function renderBuy(over: Partial<StorefrontFeaturedBuyProps> = {}) {
  const props: StorefrontFeaturedBuyProps = {
    name: "Whey",
    productHref: "/loja/produtos/whey",
    cartHref: "/loja/carrinho",
    hasOptions: false,
    soldOut: false,
    onBuy: vi.fn(),
    ...over,
  }
  return { ...render(<StorefrontFeaturedBuy {...props} />), props }
}

describe("StorefrontFeaturedBuy", () => {
  it("puts a product with no choice to make in the cart, on the way to it, and says so", async () => {
    const { props } = renderBuy()

    const link = screen.getByRole("link", { name: "Comprar agora" })
    expect(link).toHaveAttribute("href", "/loja/carrinho")
    link.addEventListener("click", (event) => event.preventDefault())
    await userEvent.click(link)

    expect(props.onBuy).toHaveBeenCalledTimes(1)
    expect(screen.getByRole("status")).toHaveTextContent("Whey foi adicionado ao carrinho.")
  })

  it("sends a product with options to its page to choose", () => {
    renderBuy({ hasOptions: true })

    expect(screen.getByRole("link", { name: "Ver opções" })).toHaveAttribute("href", "/loja/produtos/whey")
  })

  it("sends a sold-out product to its page, where Avise-me is", () => {
    renderBuy({ soldOut: true })

    expect(screen.getByRole("link", { name: "Ver produto" })).toHaveAttribute("href", "/loja/produtos/whey")
  })

  it("buys on the product's page where no cart can be reached", () => {
    const { props } = renderBuy({ cartHref: null })

    expect(screen.getByRole("link", { name: "Comprar agora" })).toHaveAttribute("href", "/loja/produtos/whey")
    expect(props.onBuy).not.toHaveBeenCalled()
  })

  it("has no accessibility violations", async () => {
    const { container } = renderBuy()

    await expectNoA11yViolations(container)
  })
})
