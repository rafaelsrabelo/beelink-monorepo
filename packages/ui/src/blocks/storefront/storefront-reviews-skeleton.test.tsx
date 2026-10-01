// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontReviewsSkeleton } from "./storefront-reviews-skeleton"

describe("StorefrontReviewsSkeleton", () => {
  it("is hidden from readers and has no accessibility violations", async () => {
    const { container } = render(<StorefrontReviewsSkeleton />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    await expectNoA11yViolations(container)
  })
})
