// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontProductSection } from "./storefront-product-section"

describe("StorefrontProductSection", () => {
  it("is a region named by its heading, with an anchor that lands below the sticky header", () => {
    render(
      <StorefrontProductSection id="descricao" title="Descrição do produto">
        <p>Texto</p>
      </StorefrontProductSection>,
    )

    const region = screen.getByRole("region", { name: "Descrição do produto" })
    expect(region).toHaveAttribute("id", "descricao")
    expect(region.className).toContain("scroll-mt-")
    expect(screen.getByRole("heading", { level: 2 })).toHaveClass("text-[22px]", "font-extrabold")
  })

  it("draws no heading when its content brings its own", () => {
    render(
      <StorefrontProductSection>
        <h2>Descrição</h2>
        <h2>Informações técnicas</h2>
      </StorefrontProductSection>,
    )

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2)
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontProductSection id="descricao" title="Descrição do produto">
        <p>Texto</p>
      </StorefrontProductSection>,
    )

    await expectNoA11yViolations(container)
  })
})
