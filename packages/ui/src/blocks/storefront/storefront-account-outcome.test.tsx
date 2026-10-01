// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountOutcome } from "./storefront-account-outcome"

describe("StorefrontAccountOutcome", () => {
  it("says a remove went through quietly, and a refused one as an alert", () => {
    const { rerender } = render(<StorefrontAccountOutcome tone="done" message="Produto removido dos favoritos." />)
    expect(screen.getByRole("status")).toHaveTextContent("Produto removido dos favoritos.")

    rerender(<StorefrontAccountOutcome tone="failed" message="Sua sessão já tinha terminado." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão já tinha terminado.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAccountOutcome tone="done" message="Produto removido dos favoritos." />)
    await expectNoA11yViolations(container)
  })
})
