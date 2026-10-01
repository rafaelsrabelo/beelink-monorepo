// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BrandLines } from "./brand-lines"

describe("BrandLines", () => {
  it("is a picture: hidden from a reader, out of the pointer's way, placed by whoever draws it", () => {
    const { container } = render(<BrandLines className="-top-10" />)

    const lines = container.querySelector("svg")!
    expect(lines).toHaveAttribute("aria-hidden", "true")
    expect(lines).toHaveClass("pointer-events-none", "absolute", "-top-10")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<BrandLines />)

    await expectNoA11yViolations(container)
  })
})
