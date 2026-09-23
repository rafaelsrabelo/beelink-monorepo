// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { AlignField } from "./align-field"

describe("AlignField", () => {
  it("marks the current alignment and names each glyph", () => {
    render(<AlignField value="CENTER" onChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Centro", pressed: true })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Esquerda", pressed: false })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Direita", pressed: false })).toBeInTheDocument()
  })

  it("hands the chosen side back", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AlignField value="LEFT" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: "Direita" }))

    expect(onChange).toHaveBeenCalledWith("RIGHT")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<AlignField value="LEFT" onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
