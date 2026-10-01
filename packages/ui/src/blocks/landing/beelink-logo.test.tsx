// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { BeelinkLogo } from "./beelink-logo"

describe("BeelinkLogo", () => {
  it("is a picture a reader is not told about, inside something that names it", () => {
    const { container } = render(<BeelinkLogo className="h-9" />)

    const logo = container.querySelector("svg")!
    expect(logo).toHaveAttribute("aria-hidden", "true")
    expect(logo).not.toHaveAttribute("role")
    expect(logo).toHaveClass("h-9", "w-auto")
  })

  it("says the name when it stands alone", () => {
    render(<BeelinkLogo label="Beelink" />)

    expect(screen.getByRole("img", { name: "Beelink" })).toBeInTheDocument()
  })

  /** The rings and the mark are holes: the ground shows through, whatever colour it is. */
  it("draws in the text's colour, with the mark cut out of the bag", () => {
    const { container } = render(<BeelinkLogo />)

    const path = container.querySelector("path")!
    expect(path).toHaveAttribute("fill", "currentColor")
    expect(path).toHaveAttribute("fill-rule", "evenodd")
  })

  it("shows the bag alone in a narrower box, the name left outside it", () => {
    const { container, rerender } = render(<BeelinkLogo />)
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 1938 542")

    rerender(<BeelinkLogo variant="icon" />)
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 566 542")
  })

  it("has no accessibility violations, named or not", async () => {
    const { container } = render(
      <>
        <BeelinkLogo />
        <BeelinkLogo label="Beelink" />
      </>,
    )

    await expectNoA11yViolations(container)
  })
})
