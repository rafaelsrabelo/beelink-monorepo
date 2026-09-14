// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ResetPasswordForm } from "./reset-password-form"

describe("ResetPasswordForm", () => {
  it("refuses two passwords that do not match", async () => {
    const onSubmit = vi.fn()
    render(<ResetPasswordForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Nova senha"), "uma-senha-comprida")
    await userEvent.type(screen.getByLabelText("Repita a nova senha"), "outra-senha-comprida")
    await userEvent.click(screen.getByRole("button", { name: "Salvar senha" }))

    expect(await screen.findByText("As senhas não são iguais")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("submits when they match", async () => {
    const onSubmit = vi.fn()
    render(<ResetPasswordForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Nova senha"), "uma-senha-comprida")
    await userEvent.type(screen.getByLabelText("Repita a nova senha"), "uma-senha-comprida")
    await userEvent.click(screen.getByRole("button", { name: "Salvar senha" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { password: "uma-senha-comprida", passwordConfirmation: "uma-senha-comprida" },
      expect.anything(),
    )
  })

  it("warns that saving signs every device out", () => {
    render(<ResetPasswordForm onSubmit={vi.fn()} />)

    expect(screen.getByText(/sai de todos os aparelhos conectados/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<ResetPasswordForm onSubmit={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
