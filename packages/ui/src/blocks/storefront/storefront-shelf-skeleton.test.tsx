// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontShelfSkeleton } from "./storefront-shelf-skeleton"

describe("StorefrontShelfSkeleton", () => {
  it("is announced once as loading, with its shapes hidden", () => {
    const { container } = render(<StorefrontShelfSkeleton />)

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
    expect(screen.getByText("Carregando produtos")).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull()
  })

  it("takes the shape the shelf will have: a rail runs off the edge, a grid wraps", () => {
    const rail = render(<StorefrontShelfSkeleton display="RAIL" />)
    expect(rail.container.querySelector(".overflow-hidden")).not.toBeNull()
    rail.unmount()

    const grid = render(<StorefrontShelfSkeleton display="GRID" />)
    expect(grid.container.querySelector(".grid")).not.toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontShelfSkeleton display="GRID" />)

    await expectNoA11yViolations(container)
  })
})
