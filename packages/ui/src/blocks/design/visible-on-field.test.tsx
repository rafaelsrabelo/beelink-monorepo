// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { VisibleOnField } from "./visible-on-field"

describe("VisibleOnField", () => {
  it("shows a block on both screens as both pressed", () => {
    render(<VisibleOnField value="ALL" onChange={vi.fn()} />)

    expect(screen.getByRole("button", { name: "Computador" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Celular" })).toHaveAttribute("aria-pressed", "true")
  })

  it("takes a block off the phone, and puts it back", async () => {
    const onChange = vi.fn()
    const { rerender } = render(<VisibleOnField value="ALL" onChange={onChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Celular" }))
    expect(onChange).toHaveBeenLastCalledWith("DESKTOP")

    rerender(<VisibleOnField value="DESKTOP" onChange={onChange} />)
    await userEvent.click(screen.getByRole("button", { name: "Celular" }))
    expect(onChange).toHaveBeenLastCalledWith("ALL")
  })

  // Shown nowhere is hidden, and hiding is Ocultar's: the last screen stays on, and the hint says why.
  it("keeps the last screen on", async () => {
    const onChange = vi.fn()
    render(<VisibleOnField value="PHONE" onChange={onChange} />)

    await userEvent.click(screen.getByRole("button", { name: "Celular" }))

    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Celular" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByText("Para tirar de todo lugar, use Ocultar.")).toBeInTheDocument()
  })

  it("speaks the panel's language", () => {
    render(<VisibleOnField value="ALL" onChange={vi.fn()} messages={en} />)

    expect(screen.getByRole("group", { name: "Shows on" })).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<VisibleOnField value="DESKTOP" onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
