// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountSecurity, type StorefrontAccountSecurityProps } from "./storefront-account-security"

const actions = { change: "/loja/api/customer/seguranca/trocar-senha", create: "/loja/api/customer/seguranca/criar-senha", everywhere: "/loja/api/customer/seguranca/sair-de-todos" }

function security(props: Partial<StorefrontAccountSecurityProps> = {}) {
  return <StorefrontAccountSecurity email="bia@exemplo.com" hasPassword actions={actions} hidden={{ retorno: "/loja/conta/perfil#seguranca" }} {...props} />
}

describe("StorefrontAccountSecurity", () => {
  it("changes the password with the current one and the new one twice, filed under the account's e-mail", () => {
    const { container } = render(security())

    expect(screen.getByRole("heading", { name: "Segurança" })).toBeInTheDocument()
    const change = screen.getByRole("button", { name: "Trocar senha" }).closest("form")!
    expect(change).toHaveAttribute("action", actions.change)
    expect(screen.getByLabelText("Senha atual")).toHaveAttribute("autocomplete", "current-password")
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("minlength", "8")
    expect(screen.getByLabelText("Repita a nova senha")).toHaveAttribute("autocomplete", "new-password")
    expect(container.querySelector('input[autocomplete="username"]')).toHaveValue("bia@exemplo.com")
    expect(change.querySelector('input[name="retorno"]')).toHaveValue("/loja/conta/perfil#seguranca")
    expect(screen.queryByRole("button", { name: "Criar senha" })).toBeNull()
  })

  it("offers an account opened through Google a password by e-mail instead", () => {
    render(security({ hasPassword: false }))

    expect(screen.getByText(/Você entra com o Google\..*bia@exemplo\.com/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Criar senha" }).closest("form")).toHaveAttribute("action", actions.create)
    expect(screen.queryByLabelText("Senha atual")).toBeNull()
  })

  it("signs out of every device by a form of its own, for either kind of account", () => {
    for (const hasPassword of [true, false]) {
      const { unmount } = render(security({ hasPassword }))
      expect(screen.getByRole("button", { name: "Sair de todos os aparelhos" }).closest("form")).toHaveAttribute("action", actions.everywhere)
      unmount()
    }
  })

  it("marks the field a refusal is about, and says what the last change did", () => {
    const { rerender } = render(security({ error: "A senha atual não confere.", invalidField: "atual" }))
    expect(screen.getByLabelText("Senha atual")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Senha atual")).toHaveAccessibleDescription("A senha atual não confere.")
    expect(screen.getByLabelText("Nova senha")).not.toHaveAttribute("aria-invalid")

    rerender(security({ notice: "Pronto, sua senha foi trocada. Os outros aparelhos saíram da conta." }))
    expect(screen.getByRole("status")).toHaveTextContent("Pronto, sua senha foi trocada.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(security({ error: "As duas senhas não são iguais. Digite de novo.", invalidField: "confirmacao" }))
    await expectNoA11yViolations(container)
  })
})
