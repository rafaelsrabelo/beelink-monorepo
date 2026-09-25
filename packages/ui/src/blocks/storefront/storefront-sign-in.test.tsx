// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSignIn, type StorefrontSignInMode } from "./storefront-sign-in"

const hrefs = { signIn: "/loja/entrar", signUp: "/loja/entrar?modo=criar", forgot: "/loja/entrar?modo=senha" }

function renderFace(mode: StorefrontSignInMode, extra: Partial<Parameters<typeof StorefrontSignIn>[0]> = {}) {
  return render(<StorefrontSignIn mode={mode} action={`/api/storefront/loja/customer/${mode}`} hidden={{ voltar: "/loja/carrinho", retorno: "/loja/entrar" }} hrefs={hrefs} {...extra} />)
}

describe("StorefrontSignIn", () => {
  it("signs in with a plain form that posts, carrying where to return", () => {
    const { container } = renderFace("entrar", { email: "bia@exemplo.com" })

    const form = container.querySelector("form")
    expect(form).toHaveAttribute("method", "post")
    expect(form).toHaveAttribute("action", "/api/storefront/loja/customer/entrar")
    expect(screen.getByLabelText("E-mail")).toHaveValue("bia@exemplo.com")
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "current-password")
    expect(container.querySelector("input[name=voltar]")).toHaveValue("/loja/carrinho")
    expect(screen.getByRole("link", { name: "Ainda não tem conta? Criar conta" })).toHaveAttribute("href", hrefs.signUp)
  })

  it("signs up with a name and a new password, and says where the link went", () => {
    const { rerender } = renderFace("criar")

    expect(screen.getByLabelText("Nome")).toBeRequired()
    expect(screen.getByLabelText("Senha")).toHaveAttribute("autocomplete", "new-password")
    expect(screen.getByLabelText("Senha")).toHaveAccessibleDescription("No mínimo 8 caracteres.")

    rerender(<StorefrontSignIn mode="criar" action="#" hidden={{}} hrefs={hrefs} sent email="bia@exemplo.com" />)
    expect(screen.getByRole("status")).toHaveTextContent("Enviamos um link para bia@exemplo.com.")
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("asks only the e-mail for a new password, and a refusal is read out", () => {
    renderFace("senha", { error: "E-mail ou senha incorretos." })

    expect(screen.queryByLabelText("Senha")).toBeNull()
    expect(screen.getByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.")
    expect(screen.getByRole("button", { name: "Enviar link" })).toBeInTheDocument()
  })

  it("offers Google above the form when the shop can, as a plain link, on signing in and up only", () => {
    const google = { href: "/api/storefront/loja/customer/google?voltar=%2Floja", iconSrc: "/brand/google.svg" }
    const { container, rerender } = renderFace("entrar", { google })

    const link = screen.getByRole("link", { name: "Continuar com Google" })
    expect(link).toHaveAttribute("href", google.href)
    expect(link.querySelector("img")).toHaveAttribute("src", "/brand/google.svg")
    expect(link.compareDocumentPosition(container.querySelector("form")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    rerender(<StorefrontSignIn mode="senha" action="/x" hidden={{}} hrefs={hrefs} google={google} />)
    expect(screen.queryByRole("link", { name: "Continuar com Google" })).not.toBeInTheDocument()
  })

  it("draws no Google button when the shop cannot offer it", () => {
    renderFace("entrar")

    expect(screen.queryByRole("link", { name: "Continuar com Google" })).not.toBeInTheDocument()
    expect(screen.queryByText("ou")).not.toBeInTheDocument()
  })

  it("has no accessibility violations, on each face, with Google offered or not", async () => {
    const google = { href: "/api/storefront/loja/customer/google", iconSrc: "/brand/google.svg" }
    for (const mode of ["entrar", "criar", "senha"] as const) {
      for (const extra of [{}, { google }]) {
        const { container, unmount } = renderFace(mode, extra)
        await expectNoA11yViolations(container)
        unmount()
      }
    }
  })
})
