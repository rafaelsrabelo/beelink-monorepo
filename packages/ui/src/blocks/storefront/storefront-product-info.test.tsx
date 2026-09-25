// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductInfo } from "./storefront-product-info"

describe("StorefrontProductInfo", () => {
  it("puts the shop over the title, the title as the page's one h1, then what it is handed", () => {
    render(<StorefrontProductInfo shopName="Mutante Suplementos" homeHref="/mutante" name="Pré-Treino Haze" unavailable={false} price={<p>R$ 119,90</p>} picker={<p>Sabor</p>} />)

    const shop = screen.getByRole("link", { name: "Visite a loja Mutante Suplementos" })
    const heading = screen.getByRole("heading", { level: 1, name: "Pré-Treino Haze" })
    expect(shop).toHaveAttribute("href", "/mutante")
    expect(shop.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading).toHaveClass("text-[26px]", "font-bold")
    expect(heading.compareDocumentPosition(screen.getByText("R$ 119,90")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("says the shelf is empty above the price when nothing can be ordered", () => {
    render(<StorefrontProductInfo shopName="Loja" homeHref="/" name="Blusa" unavailable />)

    expect(screen.getByText("Esgotado")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontProductInfo shopName="Loja" homeHref="/" name="Blusa" unavailable={false} />)

    await expectNoA11yViolations(container)
  })
})
