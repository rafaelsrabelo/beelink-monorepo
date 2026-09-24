// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ShowcaseSourceField } from "./showcase-source-field"

describe("ShowcaseSourceField", () => {
  it("names the source and says what it draws", () => {
    render(<ShowcaseSourceField value="ON_SALE" onChange={vi.fn()} />)

    expect(screen.getByRole("combobox", { name: "De onde vêm os produtos" })).toHaveTextContent("Em promoção")
    expect(screen.getByText(/preço "de" maior/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ShowcaseSourceField value="ALL" onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
