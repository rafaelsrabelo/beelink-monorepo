// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderNowSkeleton } from "./storefront-order-now-skeleton"
import { StorefrontOrdersSkeleton } from "./storefront-orders-skeleton"
import { StorefrontOrdersToolbarSkeleton } from "./storefront-orders-toolbar-skeleton"

describe("the orders' skeletons", () => {
  it("hides the front's order on its way from a screen reader too", () => {
    const { container } = render(<StorefrontOrderNowSkeleton />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })

  /** Grey shapes say nothing a screen reader could use: the page's own title already says what is coming. */
  it("hide their shapes from a screen reader", () => {
    const { container } = render(
      <>
        <StorefrontOrdersToolbarSkeleton />
        <StorefrontOrdersSkeleton />
      </>,
    )

    const roots = Array.from(container.children)
    expect(roots).toHaveLength(2)
    for (const root of roots) expect(root).toHaveAttribute("aria-hidden", "true")
  })

  it("have no accessibility violations", async () => {
    const { container } = render(
      <>
        <StorefrontOrdersToolbarSkeleton />
        <StorefrontOrdersSkeleton />
      </>,
    )
    await expectNoA11yViolations(container)
  })
})
