// React
import type { ComponentProps } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Locales
import { en } from "../../locales/en"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LoginForm } from "./login-form"

describe("LoginForm", () => {
  it("hands the typed values over once they are shaped right", async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
    await userEvent.type(screen.getByLabelText("Senha"), "uma-senha-comprida")
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }))

    expect(onSubmit).toHaveBeenCalledWith(
      { email: "ana@exemplo.com", password: "uma-senha-comprida" },
      expect.anything(),
    )
  })

  it("keeps a malformed e-mail on the screen instead of sending it", async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} />)

    await userEvent.type(screen.getByLabelText("E-mail"), "isso-nao-e-email")
    await userEvent.type(screen.getByLabelText("Senha"), "uma-senha-comprida")
    await userEvent.click(screen.getByRole("button", { name: "Entrar" }))

    expect(await screen.findByText("Informe um e-mail válido")).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("aria-invalid", "true")
  })

  it("announces what the server answered", () => {
    render(<LoginForm onSubmit={vi.fn()} error="E-mail ou senha incorretos." />)

    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.")
  })

  it("offers another confirmation link, to the e-mail typed, when the refusal is an unconfirmed one", async () => {
    const onResend = vi.fn()
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} error="Confirme seu e-mail antes de entrar." resend={{ onResend }} />)

    await userEvent.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
    await userEvent.click(screen.getByRole("button", { name: "Enviar novo link" }))

    expect(onResend).toHaveBeenCalledWith("ana@exemplo.com")
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("says the new link is on its way once it was sent, and offers no second one", () => {
    render(<LoginForm onSubmit={vi.fn()} error="Confirme seu e-mail antes de entrar." resend={{ onResend: vi.fn(), sent: true }} />)

    expect(screen.getByRole("status")).toHaveTextContent("Enviamos um novo link.")
    expect(screen.queryByRole("button", { name: "Enviar novo link" })).not.toBeInTheDocument()
  })

  it("offers no new link for any other refusal", () => {
    render(<LoginForm onSubmit={vi.fn()} error="E-mail ou senha incorretos." />)

    expect(screen.queryByRole("button", { name: "Enviar novo link" })).not.toBeInTheDocument()
  })

  it("says it is working and refuses a second click", () => {
    render(<LoginForm onSubmit={vi.fn()} pending />)

    expect(screen.getByRole("button", { name: "Entrando…" })).toBeDisabled()
  })

  it("navigates through the link the app injects, not one of its own", () => {
    const Link = ({ href, ...props }: ComponentProps<"a"> & { href: string }) => (
      <a href={href} data-testid="app-link" {...props} />
    )
    render(<LoginForm onSubmit={vi.fn()} linkComponent={Link} signupHref="/cadastro" />)

    expect(screen.getByText("Criar conta").closest("a")).toHaveAttribute("href", "/cadastro")
    expect(screen.getAllByTestId("app-link").length).toBeGreaterThan(0)
  })

  it("renders in English when the screen hands it the English dictionary", async () => {
    const onSubmit = vi.fn()
    render(<LoginForm onSubmit={onSubmit} messages={en} />)

    expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.queryByText("Entrar")).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("E-mail"), "nao-e-email")
    await userEvent.type(screen.getByLabelText("Password"), "uma-senha-comprida")
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }))

    // Even the validation the block runs itself speaks the screen's language.
    expect(await screen.findByText("Enter a valid e-mail address")).toBeInTheDocument()
  })

  it("has no accessibility violations, with a new confirmation link offered or not", async () => {
    const { container, rerender } = render(<LoginForm onSubmit={vi.fn()} error="E-mail ou senha incorretos." />)
    await expectNoA11yViolations(container)

    rerender(<LoginForm onSubmit={vi.fn()} error="Confirme seu e-mail antes de entrar." resend={{ onResend: vi.fn() }} />)
    await expectNoA11yViolations(container)
  })
})
