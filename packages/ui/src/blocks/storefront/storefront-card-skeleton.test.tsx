// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCardSkeleton } from "./storefront-card-skeleton"

describe("StorefrontCardSkeleton", () => {
  it("is hidden from a reader and takes the width it is given", () => {
    const { container } = render(<StorefrontCardSkeleton className="w-48" />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container.firstElementChild).toHaveClass("w-48", "border-shop-line")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontCardSkeleton />)

    await expectNoA11yViolations(container)
  })
})
