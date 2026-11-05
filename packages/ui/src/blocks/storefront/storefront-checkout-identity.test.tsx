// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutIdentity, type StorefrontCheckoutIdentityProps } from "./storefront-checkout-identity"

function identity(props: Partial<StorefrontCheckoutIdentityProps> = {}) {
  return (
    <StorefrontCheckoutIdentity
      step="form"
      email={null}
      actions={{ identify: "/loja/api/customer/checkout/identificar", code: "/loja/api/customer/checkout/codigo", resend: "/loja/api/customer/checkout/reenviar" }}
      hidden={{ retorno: "/loja/carrinho#finalizar" }}
      otherEmailHref="/loja/carrinho#finalizar"
      hrefs={{ signIn: "/loja/entrar?voltar=%2Floja%2Fcarrinho", signUp: "/loja/entrar?modo=criar", terms: "/termos", privacy: "/privacidade" }}
      {...props}
    />
  )
}

const hiddenOf = (form: Element | null, name: string) => form?.querySelector<HTMLInputElement>(`input[type=hidden][name="${name}"]`)?.value

describe("StorefrontCheckoutIdentity", () => {
  /** The ticket's complaint: buying asked for an account first. Now a name, an e-mail and a WhatsApp. */
  it("asks who is buying with no password, posting a plain form back to the checkout, the terms said beside it", () => {
    const { container } = render(identity())

    expect(screen.getByRole("heading", { name: "Seus dados" })).toBeInTheDocument()
    const form = container.querySelector('form[action="/loja/api/customer/checkout/identificar"]')
    expect(form).toHaveAttribute("method", "post")
    expect(hiddenOf(form, "retorno")).toBe("/loja/carrinho#finalizar")
    expect(screen.getByLabelText("Nome completo")).toHaveAttribute("autocomplete", "name")
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("type", "tel")
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("inputmode", "tel")
    for (const name of ["Nome completo", "E-mail", "WhatsApp"]) expect(screen.getByLabelText(name)).toBeRequired()
    expect(screen.queryByLabelText(/senha/i)).toBeNull()
    expect(screen.getByRole("button", { name: "Continuar" })).toHaveAttribute("type", "submit")
    expect(screen.getByText(/Ao continuar, você aceita os/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
  })

  /** Signing in and signing up stay, as options (the ticket's last criterion). */
  it("keeps signing in and an account with a password a link away", () => {
    render(identity())

    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/loja/entrar?voltar=%2Floja%2Fcarrinho")
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/loja/entrar?modo=criar")
  })

  it("keeps the e-mail typed in a refused form, with the sentence", () => {
    render(identity({ email: "bia@exemplo.com", error: "Confira o nome, o e-mail e o WhatsApp." }))

    expect(screen.getByRole("alert")).toHaveTextContent("Confira o nome, o e-mail e o WhatsApp.")
    expect(screen.getByLabelText("E-mail")).toHaveValue("bia@exemplo.com")
  })

  it("asks an e-mail with an account here for the code sent to it, filled in by the phone, with a new one or another e-mail at hand", () => {
    const { container } = render(identity({ step: "code", email: "bia@exemplo.com", notice: "Enviamos um novo código. Use o do e-mail mais recente." }))

    expect(screen.getByRole("heading", { name: "Confirme que é você" })).toBeInTheDocument()
    expect(screen.getByText("Você já tem conta nesta loja. Enviamos um código de 6 dígitos para bia@exemplo.com.")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Enviamos um novo código.")
    const code = screen.getByLabelText("Código")
    expect(code).toHaveAttribute("autocomplete", "one-time-code")
    expect(code).toHaveAttribute("inputmode", "numeric")
    expect(code).toHaveFocus()

    const confirm = container.querySelector('form[action="/loja/api/customer/checkout/codigo"]')
    expect(hiddenOf(confirm, "email")).toBe("bia@exemplo.com")
    expect(hiddenOf(confirm, "retorno")).toBe("/loja/carrinho#finalizar")
    const resend = container.querySelector('form[action="/loja/api/customer/checkout/reenviar"]')
    expect(hiddenOf(resend, "email")).toBe("bia@exemplo.com")
    expect(screen.getByRole("button", { name: "Reenviar código" })).toHaveAttribute("type", "submit")
    expect(screen.getByRole("link", { name: "Usar outro e-mail" })).toHaveAttribute("href", "/loja/carrinho#finalizar")
    expect(screen.queryByLabelText("Nome completo")).toBeNull()
  })

  it("has no accessibility violations, in either step", async () => {
    const { container, rerender } = render(identity({ error: "Confira o nome, o e-mail e o WhatsApp." }))
    await expectNoA11yViolations(container)
    rerender(identity({ step: "code", email: "bia@exemplo.com" }))
    await expectNoA11yViolations(container)
  })
})
