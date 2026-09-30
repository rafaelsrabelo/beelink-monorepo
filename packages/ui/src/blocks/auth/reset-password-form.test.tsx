// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { ResetPasswordForm } from "./reset-password-form"

describe("ResetPasswordForm", () => {
  it("says, beside the button, that setting the password accepts bee-link's terms (BEELINK-171)", () => {
    render(<ResetPasswordForm onSubmit={vi.fn()} termsHref="/termos" privacyHref="/privacidade" />)

    expect(screen.getByText(/Ao definir a senha/)).toHaveTextContent("Ao definir a senha, você aceita os Termos de uso e declara ter lido a Política de privacidade.")
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

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
