// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFeaturedSkeleton } from "./storefront-featured-skeleton"

describe("StorefrontFeaturedSkeleton", () => {
  it("is hidden from a reader, in the layout's own shape", () => {
    const { container, rerender } = render(<StorefrontFeaturedSkeleton layout="IMAGE_LEFT" />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container.firstElementChild).toHaveClass("shop-md:grid-cols-2")

    rerender(<StorefrontFeaturedSkeleton layout="IMAGE_LARGE" />)
    expect(container.firstElementChild).not.toHaveClass("shop-md:grid-cols-2")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFeaturedSkeleton layout="IMAGE_LARGE" />)

    await expectNoA11yViolations(container)
  })
})
