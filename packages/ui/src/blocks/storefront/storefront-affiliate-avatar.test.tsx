// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAffiliateAvatar } from "./storefront-affiliate-avatar"
import { firstNameOf } from "./storefront-affiliate-name"

describe("StorefrontAffiliateAvatar", () => {
  it("draws the initials of a name with no photo, and is never read out", () => {
    const { container } = render(<StorefrontAffiliateAvatar name="Maria de Fátima Lima" photoUrl={null} />)

    expect(screen.getByText("ML")).toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAffiliateAvatar name="João Silva" photoUrl={null} />)
    await expectNoA11yViolations(container)
  })
})

describe("firstNameOf", () => {
  it("is the first word, or the whole of a one-word name", () => {
    expect(firstNameOf("  João  Silva ")).toBe("João")
    expect(firstNameOf("Maria")).toBe("Maria")
  })
})
