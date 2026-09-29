// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontNewPassword } from "./storefront-new-password"

const hidden = { token: "t0k3n", voltar: "/loja/carrinho", retorno: "/loja/nova-senha?token=t0k3n", entrada: "/loja/entrar" }

describe("StorefrontNewPassword", () => {
  it("asks for the new password twice, 8 characters or more, carrying the link's token", () => {
    const { container } = render(<StorefrontNewPassword action="/loja/api/customer/nova-senha" hidden={hidden} />)

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

  it("says why the last try was refused", () => {
    render(<StorefrontNewPassword action="#" hidden={hidden} error="As duas senhas não são iguais. Digite de novo." />)

    expect(screen.getByRole("alert")).toHaveTextContent("As duas senhas não são iguais.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontNewPassword action="#" hidden={hidden} error="A senha precisa ter 8 caracteres ou mais." />)
    await expectNoA11yViolations(container)
  })
})
