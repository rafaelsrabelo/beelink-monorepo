// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFilterSection } from "./storefront-filter-section"

describe("StorefrontFilterSection", () => {
  it("is a group under its own h3, with a hairline the last one drops", () => {
    render(
      <StorefrontFilterSection title="Categoria">
        <a href="/loja/whey">Whey</a>
      </StorefrontFilterSection>,
    )

    const heading = screen.getByRole("heading", { level: 3, name: "Categoria" })
    expect(heading.parentElement).toHaveClass("border-b", "last:border-b-0")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(
      <StorefrontFilterSection title="Categoria">
        <a href="/loja/whey">Whey</a>
      </StorefrontFilterSection>,
    )

    await expectNoA11yViolations(container)
  })
})
