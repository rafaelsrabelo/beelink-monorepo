// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountPrivacy, type StorefrontAccountPrivacyProps } from "./storefront-account-privacy"

function privacy(props: Partial<StorefrontAccountPrivacyProps> = {}) {
  return (
    <StorefrontAccountPrivacy
      email="bia@exemplo.com"
      hasPassword
      dataHref="/loja/api/customer/meus-dados"
      deleteAction="/loja/api/customer/excluir-conta"
      hidden={{ retorno: "/loja/conta/perfil#privacidade", entrada: "/loja/entrar" }}
      {...props}
    />
  )
}

describe("StorefrontAccountPrivacy", () => {
  it("offers the copy of the shopper's data as a link the handler answers with the file", () => {
    render(privacy())

    expect(screen.getByRole("heading", { name: "Privacidade" })).toBeInTheDocument()
    expect(screen.getByText(/Seus dados ficam só com esta loja/)).toBeInTheDocument()
    const download = screen.getByRole("link", { name: "Baixar meus dados" })
    expect(download).toHaveAttribute("href", "/loja/api/customer/meus-dados")
    expect(download).not.toHaveAttribute("download")
    expect(download).toHaveAccessibleDescription(/Um arquivo JSON/)
  })

  /** BEELINK-244: the credit is the account's, and goes with it. */
  it("says what the shopper's cashback loses with the account, and nothing when they have none", () => {
    const { rerender } = render(privacy({ cashbackLost: "R$ 12,50" }))
    expect(screen.getByText(/Você também perde R\$ 12,50 de cashback nesta loja\./, { selector: "p" })).toBeInTheDocument()

    rerender(privacy())

    expect(screen.queryByText(/de cashback nesta loja/)).toBeNull()
  })

  it("keeps the deletion folded, and confirms it with the password, saying what is kept and what goes", () => {
    const { container } = render(privacy())

    const details = container.querySelector("details")!
    expect(details).not.toHaveAttribute("open")
    const form = screen.getByRole("button", { name: "Excluir minha conta para sempre", hidden: true }).closest("form")!
    expect(form).toHaveAttribute("action", "/loja/api/customer/excluir-conta")
    expect(form).toHaveAttribute("method", "post")
    expect(form.querySelector('input[name="retorno"]')).toHaveValue("/loja/conta/perfil#privacidade")
    expect(form.querySelector('input[name="entrada"]')).toHaveValue("/loja/entrar")
    const password = form.querySelector('input[name="password"]')!
    expect(password).toHaveAttribute("autocomplete", "current-password")
    expect(password).toBeRequired()
    expect(form.querySelector('input[autocomplete="username"]')).toHaveValue("bia@exemplo.com")
    expect(form.querySelector('input[name="email"]')).toBeNull()
    expect(form).toHaveTextContent(/Os pedidos continuam com a loja.*“Cliente”.*Não dá para desfazer/)
  })

  it("asks an account with no password — Google's — for its e-mail typed again", () => {
    const { container } = render(privacy({ hasPassword: false }))

    const field = container.querySelector('input[name="email"]')!
    expect(field).toBeRequired()
    expect(field).toHaveAttribute("type", "email")
    expect(container.querySelector(`label[for="${field.id}"]`)).toHaveTextContent("Digite bia@exemplo.com para confirmar")
    expect(container.querySelector('input[name="password"]')).toBeNull()
  })

  it("comes back open with a refusal, the field marked and described by it", () => {
    const { container } = render(privacy({ error: "A senha não confere. Sua conta não foi excluída." }))

    expect(container.querySelector("details")).toHaveAttribute("open")
    expect(screen.getByRole("alert")).toHaveTextContent("A senha não confere.")
    const password = screen.getByLabelText("Sua senha, para confirmar")
    expect(password).toHaveAttribute("aria-invalid", "true")
    expect(password).toHaveAccessibleDescription(/A senha não confere\./)
  })

  it("says a copy that could not be made under its link, leaving the deletion folded", () => {
    const { container } = render(privacy({ downloadError: "Não deu para gerar o arquivo agora. Tente de novo." }))

    expect(screen.getByRole("alert")).toHaveTextContent("Não deu para gerar o arquivo")
    expect(container.querySelector("details")).not.toHaveAttribute("open")
    expect(container.querySelector('input[name="password"]')).not.toHaveAttribute("aria-invalid")
  })

  it("has no accessibility violations, folded or open", async () => {
    for (const error of [null, "Esse não é o e-mail da conta."]) {
      const { container, unmount } = render(privacy({ hasPassword: error === null, error }))
      await expectNoA11yViolations(container)
      unmount()
    }
  })
})
