// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOverviewSkeleton } from "./storefront-overview-skeleton"

describe("StorefrontOverviewSkeleton", () => {
  it("is shapes only, hidden from a reader, for either part", async () => {
    for (const kind of ["reviews", "favorites"] as const) {
      const { container, unmount } = render(<StorefrontOverviewSkeleton kind={kind} />)
      expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
      expect(container.textContent).toBe("")
      await expectNoA11yViolations(container)
      unmount()
    }
  })
})
