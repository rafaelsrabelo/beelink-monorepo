// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BeelinkBag } from "./beelink-bag"

describe("BeelinkBag", () => {
  it("is a picture a reader is not told about, sized by whoever draws it", () => {
    const { container } = render(<BeelinkBag className="size-7" />)

    const icon = container.querySelector("svg")!
    expect(icon).toHaveAttribute("aria-hidden", "true")
    expect(icon).toHaveClass("size-7")
  })

  /** The mark is cut out of the bag: on a ground that is not the brand's yellow, it has to take that ground's colour. */
  it("draws the bag in the text's colour and the mark in the ground's, which a token names", () => {
    const { container } = render(<BeelinkBag />)

    expect(container.querySelector("path")).toHaveAttribute("fill", "currentColor")
    expect(container.querySelector("g")).toHaveAttribute("stroke", "var(--beelink-bag-ground, var(--brand-yellow))")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<BeelinkBag />)

    await expectNoA11yViolations(container)
  })
})
