// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ForgotPasswordForm } from "./forgot-password-form"

describe("ForgotPasswordForm", () => {
  it("asks for the address and hands it over", async () => {
    const onSubmit = vi.fn()
    render(<ForgotPasswordForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Enviar link" }))

    expect(onSubmit).toHaveBeenCalledWith({ email: "ana@exemplo.com" }, expect.anything())
  })

  it("says the same thing whether or not the address has an account", () => {
    render(<ForgotPasswordForm onSubmit={vi.fn()} sent />)

    expect(screen.getByText("Confira seu e-mail")).toBeInTheDocument()
    expect(screen.getByText(/Se houver uma conta com esse endereço/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Enviar link" })).not.toBeInTheDocument()
  })

  it("has no accessibility violations, before and after sending", async () => {
    const { container, rerender } = render(<ForgotPasswordForm onSubmit={vi.fn()} />)
    await expectNoA11yViolations(container)

    rerender(<ForgotPasswordForm onSubmit={vi.fn()} sent />)
    await expectNoA11yViolations(container)
  })
})
