// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { SignupForm } from "./signup-form"

describe("SignupForm", () => {
  it("collects a name, an e-mail and a password", async () => {
    const onSubmit = vi.fn()
    render(<SignupForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Nome"), "Ana Souza")
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
    await userEvent.type(screen.getByLabelText("Senha"), "uma-senha-comprida")
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { name: "Ana Souza", email: "ana@exemplo.com", password: "uma-senha-comprida" },
      expect.anything(),
    )
  })

  it("holds back a password the product would refuse anyway", async () => {
    const onSubmit = vi.fn()
    render(<SignupForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("Nome"), "Ana Souza")
    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
    await userEvent.type(screen.getByLabelText("Senha"), "curta")
    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(await screen.findByText("A senha precisa ter ao menos 8 caracteres")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("shows the taken-e-mail answer the screen passes in", () => {
    render(<SignupForm onSubmit={vi.fn()} error="Este e-mail já está cadastrado." />)

    expect(screen.getByRole("alert")).toHaveTextContent("Este e-mail já está cadastrado.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<SignupForm onSubmit={vi.fn()} />)

    await expectNoA11yViolations(container)
  })
})
