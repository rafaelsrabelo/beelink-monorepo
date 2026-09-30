// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontSignIn, type StorefrontSignInMode } from "./storefront-sign-in"

const hrefs = { signIn: "/loja/entrar", signUp: "/loja/entrar?modo=criar", forgot: "/loja/entrar?modo=senha", terms: "/termos", privacy: "/privacidade" }

function renderFace(mode: StorefrontSignInMode, extra: Partial<Parameters<typeof StorefrontSignIn>[0]> = {}) {
  return render(<StorefrontSignIn mode={mode} action={`/api/storefront/loja/customer/${mode}`} hidden={{ voltar: "/loja/carrinho", retorno: "/loja/entrar" }} hrefs={hrefs} {...extra} />)
}

const google = { href: "/api/storefront/loja/customer/google", iconSrc: "/brand/google.svg" }

describe("StorefrontSignIn — bee-link's terms (BEELINK-171)", () => {
  it("says, beside creating the account, that creating it accepts the terms, with both texts a link away", () => {
    renderFace("criar")

    expect(screen.getByText(/Ao criar a conta, você aceita os/)).toHaveTextContent("Ao criar a conta, você aceita os Termos de uso e declara ter lido a Política de privacidade.")
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  it("says, right under the Google button on either face, that Google opening an account accepts them", () => {
    for (const mode of ["entrar", "criar"] as const) {
      const { container, unmount } = renderFace(mode, { google })

      const notice = screen.getByText(/Ao continuar com Google/)
      expect(notice).toHaveTextContent("Ao continuar com Google, você aceita os Termos de uso e declara ter lido a Política de privacidade.")
      // After the button it is about, before the form: not a footnote of the password sign-in.
      const button = screen.getByRole("link", { name: "Continuar com Google" })
      expect(button.compareDocumentPosition(notice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(notice.compareDocumentPosition(container.querySelector("form")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      unmount()
    }
  })

  it("accepts nothing on signing in with a password: only the two links there", () => {
    renderFace("entrar")

    expect(screen.queryByText(/você aceita/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
  })

  it("only links the two texts where nothing is being accepted", () => {
    renderFace("senha")

    expect(screen.queryByText(/você aceita/)).not.toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })
})

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

  it("says over the sign-in what an e-mailed link just did", () => {
    render(<StorefrontSignIn mode="entrar" action="#" hidden={{}} hrefs={hrefs} notice="E-mail confirmado! Entre para continuar." />)

    expect(screen.getByRole("status")).toHaveTextContent("E-mail confirmado! Entre para continuar.")
    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument()
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

  it("offers another confirmation link for the e-mail typed when the refusal is an unconfirmed one", () => {
    const { container } = renderFace("entrar", {
      email: "bia@exemplo.com",
      error: "Confirme seu e-mail antes de entrar.",
      resendAction: "/loja/api/customer/reenviar",
    })

    const resend = screen.getByRole("button", { name: "Mandar outro link" }).closest("form")
    expect(resend).toHaveAttribute("method", "post")
    expect(resend).toHaveAttribute("action", "/loja/api/customer/reenviar")
    expect(resend?.querySelector("input[name=email]")).toHaveValue("bia@exemplo.com")
    expect(resend?.querySelector("input[name=voltar]")).toHaveValue("/loja/carrinho")
    // The sign-in form stays, for the shopper who confirms and comes straight back.
    expect(container.querySelectorAll("form")).toHaveLength(2)
  })

  it("offers no new link without a refusal, or without the e-mail it would go to", () => {
    const { unmount } = renderFace("entrar", { email: "bia@exemplo.com", resendAction: "/loja/api/customer/reenviar" })
    expect(screen.queryByRole("button", { name: "Mandar outro link" })).not.toBeInTheDocument()
    unmount()

    renderFace("entrar", { error: "Confirme seu e-mail antes de entrar.", resendAction: "/loja/api/customer/reenviar" })
    expect(screen.queryByRole("button", { name: "Mandar outro link" })).not.toBeInTheDocument()
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
