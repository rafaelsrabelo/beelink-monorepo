// Libs
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoritesSkeleton } from "./storefront-favorites-skeleton"

describe("StorefrontFavoritesSkeleton", () => {
  it("is hidden from readers and has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoritesSkeleton />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    await expectNoA11yViolations(container)
  })
})
