// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutIdentity, type StorefrontCheckoutIdentityProps } from "./storefront-checkout-identity"

function identity(props: Partial<StorefrontCheckoutIdentityProps> = {}) {
  return (
    <StorefrontCheckoutIdentity
      email={null}
      action="/loja/api/customer/checkout/identificar"
      hidden={{ retorno: "/loja/carrinho#finalizar" }}
      hrefs={{ signIn: "/loja/entrar?voltar=%2Floja%2Fcarrinho", signUp: "/loja/entrar?modo=criar", terms: "/termos", privacy: "/privacidade" }}
      {...props}
    />
  )
}

describe("StorefrontCheckoutIdentity", () => {
  /** P0: a name, a phone and an e-mail, and on — no password, no code. */
  it("asks a name, a phone and an e-mail and goes on, a plain form back to the checkout, with the terms beside it", () => {
    const { container } = render(identity())

    expect(screen.getByRole("heading", { name: "Seus dados" })).toBeInTheDocument()
    const form = container.querySelector('form[action="/loja/api/customer/checkout/identificar"]')
    expect(form).toHaveAttribute("method", "post")
    expect(form?.querySelector<HTMLInputElement>('input[type=hidden][name="retorno"]')?.value).toBe("/loja/carrinho#finalizar")
    const fields = [...(form?.querySelectorAll("input:not([type=hidden])") ?? [])].map((input) => input.getAttribute("name"))
    expect(fields).toEqual(["name", "phone", "email"])
    expect(screen.getByLabelText("WhatsApp")).toHaveAttribute("type", "tel")
    expect(screen.getByLabelText("E-mail")).toHaveAttribute("type", "email")
    for (const name of ["Nome completo", "WhatsApp", "E-mail"]) expect(screen.getByLabelText(name)).toBeRequired()
    expect(screen.queryByLabelText(/senha|código/i)).toBeNull()
    expect(screen.getByRole("button", { name: "Continuar" })).toHaveAttribute("type", "submit")
    expect(screen.getByText(/Ao continuar, você aceita os/)).toBeInTheDocument()
  })

  it("keeps signing in and signing up as options, a link away", () => {
    render(identity())

    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/loja/entrar?voltar=%2Floja%2Fcarrinho")
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/loja/entrar?modo=criar")
  })

  it("keeps the e-mail typed in a refused form, with the sentence", () => {
    render(identity({ email: "bia@exemplo.com", error: "Confira o nome, o e-mail e o WhatsApp com DDD." }))

    expect(screen.getByRole("alert")).toHaveTextContent("Confira o nome, o e-mail e o WhatsApp com DDD.")
    expect(screen.getByLabelText("E-mail")).toHaveValue("bia@exemplo.com")
  })

  it("draws no frame and no title of its own inside a step", () => {
    render(identity({ headless: true }))

    expect(screen.queryByRole("heading", { name: "Seus dados" })).toBeNull()
    expect(screen.getByLabelText("WhatsApp")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(identity({ error: "Confira o nome, o e-mail e o WhatsApp com DDD." }))
    await expectNoA11yViolations(container)
  })
})
