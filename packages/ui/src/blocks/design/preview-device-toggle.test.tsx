// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { PreviewDeviceToggle } from "./preview-device-toggle"

describe("PreviewDeviceToggle", () => {
  it("names the choice and marks the device the preview is drawn at", () => {
    render(<PreviewDeviceToggle value="PHONE" onChange={vi.fn()} />)

    expect(screen.getByRole("group", { name: "Ver a loja como" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Celular", pressed: true })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Computador", pressed: false })).toBeInTheDocument()
  })

  it("hands the other device back, from the keyboard too", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PreviewDeviceToggle value="PHONE" onChange={onChange} />)

    await user.tab()
    await user.keyboard("{ArrowRight}")
    await user.keyboard("{Enter}")

    expect(onChange).toHaveBeenCalledWith("DESKTOP")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<PreviewDeviceToggle value="DESKTOP" onChange={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
