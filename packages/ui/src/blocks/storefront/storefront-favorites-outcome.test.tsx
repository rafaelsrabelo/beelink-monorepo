// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontFavoritesOutcome } from "./storefront-favorites-outcome"

describe("StorefrontFavoritesOutcome", () => {
  it("says a remove went through quietly, and a refused one as an alert", () => {
    const { rerender } = render(<StorefrontFavoritesOutcome tone="done" message="Produto removido dos favoritos." />)
    expect(screen.getByRole("status")).toHaveTextContent("Produto removido dos favoritos.")

    rerender(<StorefrontFavoritesOutcome tone="failed" message="Sua sessão já tinha terminado." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão já tinha terminado.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontFavoritesOutcome tone="done" message="Produto removido dos favoritos." />)
    await expectNoA11yViolations(container)
  })
})
