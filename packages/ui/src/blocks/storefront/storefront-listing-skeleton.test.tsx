// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontListingSkeleton } from "./storefront-listing-skeleton"

describe("StorefrontListingSkeleton", () => {
  it("is announced once as loading, with every shape hidden", () => {
    const { container } = render(<StorefrontListingSkeleton />)

    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true")
    expect(screen.getByText("Carregando produtos")).toBeInTheDocument()
    expect(container.querySelectorAll('[role="status"] > :not([aria-hidden="true"])')).toHaveLength(1)
  })

  it("draws one page of cards in the grid's own columns", () => {
    const { container } = render(<StorefrontListingSkeleton productsPerRow={4} />)

    const grid = container.querySelector(".grid")
    expect(grid).toHaveClass("@4xl:grid-cols-4")
    expect(grid?.children).toHaveLength(16)
  })

  it("keeps the filter column's place when the listing has one", () => {
    const { container } = render(<StorefrontListingSkeleton withColumn />)

    expect(container.querySelector(".w-66")).toHaveClass("hidden", "shop-lg:flex")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontListingSkeleton cards={4} />)

    await expectNoA11yViolations(container)
  })
})
