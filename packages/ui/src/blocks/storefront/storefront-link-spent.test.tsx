// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontLinkSpent } from "./storefront-link-spent"

describe("StorefrontLinkSpent", () => {
  it("sends another confirmation link from here, to the e-mail typed", () => {
    const { container } = render(<StorefrontLinkSpent kind="confirm" action="/loja/api/customer/reenviar" hidden={{ voltar: "/loja/carrinho", retorno: "/loja/entrar" }} />)

    expect(screen.getByText(/Esse link de confirmação já foi usado ou venceu/)).toBeInTheDocument()
    expect(container.querySelector("form")).toHaveAttribute("action", "/loja/api/customer/reenviar")
    expect(container.querySelector('input[name="voltar"]')).toHaveValue("/loja/carrinho")
    expect(screen.getByLabelText("E-mail")).toBeRequired()
    expect(screen.getByRole("button", { name: "Mandar outro link" })).toBeInTheDocument()
  })

  it("leads a spent new-password link to asking for another", () => {
    render(<StorefrontLinkSpent kind="reset" askHref="/loja/entrar?modo=senha" />)

    expect(screen.getByText(/Esse link para criar uma nova senha já foi usado ou venceu/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pedir outro link" })).toHaveAttribute("href", "/loja/entrar?modo=senha")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontLinkSpent kind="confirm" action="#" hidden={{}} />)
    await expectNoA11yViolations(container)
  })
})
