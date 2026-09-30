// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontNewPassword } from "./storefront-new-password"

const hidden = { token: "t0k3n", voltar: "/loja/carrinho", retorno: "/loja/nova-senha?token=t0k3n", entrada: "/loja/entrar" }
const legalHrefs = { terms: "/termos", privacy: "/privacidade" }

describe("StorefrontNewPassword", () => {
  it("says, beside saving it, that setting the password accepts bee-link's terms (BEELINK-171)", () => {
    render(<StorefrontNewPassword action="#" hidden={hidden} legalHrefs={legalHrefs} />)

    expect(screen.getByText(/Ao definir a senha/)).toHaveTextContent("Ao definir a senha, você aceita os Termos de uso e declara ter lido a Política de privacidade.")
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Política de privacidade" })).toHaveAttribute("href", "/privacidade")
  })

  it("asks for the new password twice, 8 characters or more, carrying the link's token", () => {
    const { container } = render(<StorefrontNewPassword action="/loja/api/customer/nova-senha" hidden={hidden} legalHrefs={legalHrefs} />)

    expect(container.querySelector("form")).toHaveAttribute("action", "/loja/api/customer/nova-senha")
    expect(container.querySelector('input[name="token"]')).toHaveValue("t0k3n")
    for (const label of ["Nova senha", "Repita a nova senha"]) {
      const field = screen.getByLabelText(label)
      expect(field).toHaveAttribute("type", "password")
      expect(field).toHaveAttribute("minlength", "8")
      expect(field).toHaveAttribute("autocomplete", "new-password")
    }
    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription("No mínimo 8 caracteres.")
    expect(screen.getByRole("button", { name: "Salvar nova senha" })).toBeInTheDocument()
  })

  it("says why the last try was refused, at the field it is about", () => {
    render(<StorefrontNewPassword action="#" hidden={hidden} legalHrefs={legalHrefs} error="As duas senhas não são iguais. Digite de novo." invalidField="confirmacao" />)

    expect(screen.getByRole("alert")).toHaveTextContent("As duas senhas não são iguais.")
    const repeat = screen.getByLabelText("Repita a nova senha")
    expect(repeat).toHaveAttribute("aria-invalid", "true")
    expect(repeat).toHaveAccessibleDescription("As duas senhas não são iguais. Digite de novo.")
    // The other keeps its hint alone.
    expect(screen.getByLabelText("Nova senha")).not.toHaveAttribute("aria-invalid")
    expect(screen.getByLabelText("Nova senha")).toHaveAccessibleDescription("No mínimo 8 caracteres.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontNewPassword action="#" hidden={hidden} legalHrefs={legalHrefs} error="A senha precisa ter 8 caracteres ou mais." />)
    await expectNoA11yViolations(container)
  })
})
