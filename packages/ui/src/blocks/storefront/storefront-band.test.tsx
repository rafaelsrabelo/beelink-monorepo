// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BAND, StorefrontBand } from "./storefront-band"

describe("StorefrontBand", () => {
  it("puts what it is given inside the shop's measure", () => {
    render(
      <StorefrontBand>
        <p>Dentro</p>
      </StorefrontBand>,
    )

    expect(screen.getByText("Dentro").parentElement).toHaveClass("max-w-[1440px]")
  })

  it("takes a class of its own without losing the measure", () => {
    render(
      <StorefrontBand className="flex flex-col gap-8">
        <p>Dentro</p>
      </StorefrontBand>,
    )

    const band = screen.getByText("Dentro").parentElement
    expect(band).toHaveClass("max-w-[1440px]")
    expect(band).toHaveClass("gap-8")
  })

  // Exported so a block can reach for the measure without wrapping — a full-bleed hero contains
  // itself, and a carousel cannot be inside a container and bleed at once.
  it("publishes the measure for the blocks that cannot wrap", () => {
    expect(BAND).toContain("max-w-[1440px]")
  })

  // The gutter the designs draw at 1440. Every band lines up on it, so it is asserted once, here.
  it("keeps a 32px gutter from the desktop breakpoint up", () => {
    expect(BAND).toContain("shop-lg:px-8")
    expect(BAND).not.toContain("px-10")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontBand>
        <p>Dentro</p>
      </StorefrontBand>,
    )

    await expectNoA11yViolations(container)
  })
})
