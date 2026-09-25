// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontRating, starsOf } from "./storefront-rating"

describe("StorefrontRating", () => {
  it("rounds to the nearest star for the eye", () => {
    expect(starsOf(4.7)).toBe("★★★★★")
    expect(starsOf(4.4)).toBe("★★★★☆")
    expect(starsOf(0)).toBe("☆☆☆☆☆")
  })

  it("is one sentence to a reader, in the shopper's language, and glyphs for the eye", () => {
    const { container } = render(<StorefrontRating average={4.7} count={128} locale="pt-BR" />)

    expect(screen.getByText("Nota 4,7 de 5, 128 avaliações")).toHaveClass("sr-only")
    expect(container.querySelectorAll("[aria-hidden='true']")).toHaveLength(3)
    expect(screen.getByText("★★★★★")).toHaveClass("text-shop-rating")
  })

  it("links the count to the reviews when told where they are, out of the tab order", () => {
    render(<StorefrontRating average={4.2} count={12} locale="pt-BR" reviewsHref="#avaliacoes" />)

    const link = screen.getByText("(12)")
    expect(link).toHaveAttribute("href", "#avaliacoes")
    expect(link).toHaveAttribute("tabindex", "-1")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontRating average={4.7} count={128} locale="pt-BR" reviewsHref="#avaliacoes" size="product" />)

    await expectNoA11yViolations(container)
  })
})
