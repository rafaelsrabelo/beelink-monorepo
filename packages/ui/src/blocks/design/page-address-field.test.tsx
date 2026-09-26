// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PageAddressField } from "./page-address-field"

describe("PageAddressField", () => {
  it("shows the address after the shop's, and hands every key back", async () => {
    const onChange = vi.fn()
    render(<PageAddressField id="a" prefix="/mutante/lp/" value="" onChange={onChange} state="idle" />)

    expect(screen.getByText("/mutante/lp/")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Endereço"), "x")
    expect(onChange).toHaveBeenCalledWith("x")
  })

  it("says whether the address is free, and marks the field when it is not", () => {
    const { rerender } = render(<PageAddressField id="a" prefix="/m/lp/" value="ofertas" onChange={vi.fn()} state="available" />)
    expect(screen.getByLabelText("Endereço")).toHaveAccessibleDescription("Disponível")

    rerender(<PageAddressField id="a" prefix="/m/lp/" value="ofertas" onChange={vi.fn()} state="taken" />)
    expect(screen.getByLabelText("Endereço")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Endereço")).toHaveAccessibleDescription("Já existe uma página com este endereço.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<PageAddressField id="a" prefix="/m/lp/" value="ofertas" onChange={vi.fn()} state="checking" />)

    await expectNoA11yViolations(container)
  })
})
