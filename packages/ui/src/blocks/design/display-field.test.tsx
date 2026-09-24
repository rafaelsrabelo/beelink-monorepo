// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { DisplayField } from "./display-field"

describe("DisplayField", () => {
  it("marks the format the banner has", () => {
    render(<DisplayField value="GRID" onChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: /Grade/, pressed: true })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Carrossel/, pressed: false })).toBeInTheDocument()
  })

  it("reports the one chosen", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DisplayField value="GRID" onChange={onChange} />)

    await user.click(screen.getByRole("button", { name: /Carrossel/ }))

    expect(onChange).toHaveBeenCalledWith("CAROUSEL")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<DisplayField value="CAROUSEL" onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
