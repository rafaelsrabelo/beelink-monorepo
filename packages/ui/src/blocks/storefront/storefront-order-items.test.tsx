// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderItems } from "./storefront-order-items"

const items = [
  { name: "Whey", href: "/loja/produtos/whey", imageUrl: null, meta: "Sabor: Uva · Qtd. 1", price: "R$ 189,90", reviewHref: "/loja/conta/avaliacoes?produto=p-1#avaliar-p-1" },
  { name: "Coqueteleira", href: null, imageUrl: null, meta: "Qtd. 1", price: "R$ 29,90" },
]

describe("StorefrontOrderItems", () => {
  it("lists the order's lines, and leads one still on sale to its rating", () => {
    render(<StorefrontOrderItems items={items} count={2} />)

    expect(screen.getByRole("link", { name: "Whey" })).toHaveAttribute("href", "/loja/produtos/whey")
    expect(screen.getByText("Coqueteleira")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Avaliar produto: Whey" })).toHaveAttribute("href", "/loja/conta/avaliacoes?produto=p-1#avaliar-p-1")
    expect(screen.queryByRole("link", { name: /Coqueteleira/ })).not.toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderItems items={items} count={2} />)
    await expectNoA11yViolations(container)
  })
})
