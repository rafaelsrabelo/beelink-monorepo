// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ProductStatusBadge } from "./product-status-badge"

describe("ProductStatusBadge", () => {
  it("says active, draft or sold out — a draft first, even with an empty shelf", async () => {
    const { container, rerender } = render(<ProductStatusBadge status="ACTIVE" soldOut={false} />)
    expect(screen.getByText("Ativo")).toBeInTheDocument()
    await expectNoA11yViolations(container)

    rerender(<ProductStatusBadge status="ACTIVE" soldOut />)
    expect(screen.getByText("Esgotado")).toBeInTheDocument()
    await expectNoA11yViolations(container)

    rerender(<ProductStatusBadge status="DRAFT" soldOut />)
    expect(screen.getByText("Rascunho")).toBeInTheDocument()
  })
})
