// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductBuy } from "./storefront-product-buy"

describe("StorefrontProductBuy", () => {
  it("is a region named for buying, that sticks under the header only on a wide, tall window", () => {
    render(
      <StorefrontProductBuy>
        <button type="button">Adicionar ao carrinho</button>
      </StorefrontProductBuy>,
    )

    const region = screen.getByRole("region", { name: "Comprar" })
    expect(region).toContainElement(screen.getByRole("button"))
    expect(region.className).toContain("shop-xl:[@media(min-height:760px)]:sticky")
    expect(region.className).toContain("var(--shop-masthead-height,117px)")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontProductBuy>
        <p>R$ 119,90</p>
      </StorefrontProductBuy>,
    )

    await expectNoA11yViolations(container)
  })
})
