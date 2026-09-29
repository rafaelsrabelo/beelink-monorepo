// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountForm } from "./storefront-account-form"

const profile = {
  id: "c1",
  name: "Bia Cliente",
  email: "bia@exemplo.com",
  phone: "11988887777",
  cpf: "529.982.247-25",
  birthDate: "1990-05-17",
  address: { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
}

describe("StorefrontAccountForm", () => {
  it("posts the shop's record of the shopper, filled in, with the e-mail shown and not editable", () => {
    const { container } = render(<StorefrontAccountForm profile={profile} action="/api/x/perfil" signOutAction="/api/x/sair" />)

    expect(container.querySelector("form")).toHaveAttribute("action", "/api/x/perfil")
    expect(screen.getByLabelText("Nome completo")).toHaveValue("Bia Cliente")
    expect(screen.getByLabelText("Celular")).toHaveValue("11988887777")
    expect(screen.getByLabelText(/^CPF/)).toHaveValue("529.982.247-25")
    expect(screen.getByLabelText(/^Data de nascimento/)).toHaveValue("1990-05-17")
    expect(screen.getByLabelText("Rua")).toHaveValue("Av. Paulista")
    expect(screen.getByLabelText("Complemento")).toHaveValue("")
    expect(screen.queryByLabelText("E-mail")).toBeNull()
    expect(screen.getByText("bia@exemplo.com")).toBeInTheDocument()
  })

  /** Both are optional: a shopper who never gave them sees empty fields that say so, and a date field. */
  it("leaves the CPF and the birth date empty, marked optional", () => {
    render(<StorefrontAccountForm profile={{ ...profile, cpf: null, birthDate: null }} action="#" />)

    expect(screen.getByLabelText("CPF · Opcional · para a nota fiscal")).toHaveValue("")
    expect(screen.getByLabelText("Data de nascimento · Opcional")).toHaveAttribute("type", "date")
    expect(screen.getByLabelText("Data de nascimento · Opcional")).toHaveValue("")
  })

  /** A refusal that names a field marks that one invalid, described by the sentence; the others stay clean. */
  it("points the field a refusal names at the sentence, and offers no birth date after today", () => {
    render(
      <StorefrontAccountForm profile={profile} action="#" error="Esse CPF não confere." invalidField="cpf" birthDateMax="2026-09-29" />,
    )

    const cpf = screen.getByLabelText(/^CPF/)
    expect(cpf).toHaveAttribute("aria-invalid", "true")
    expect(cpf).toHaveAccessibleDescription("Esse CPF não confere.")
    expect(screen.getByLabelText("Celular")).not.toHaveAttribute("aria-invalid")
    expect(screen.getByLabelText(/^Data de nascimento/)).toHaveAttribute("max", "2026-09-29")
  })

  it("signs out through a form of its own", () => {
    render(<StorefrontAccountForm profile={profile} action="#" signOutAction="/api/x/sair" />)

    expect(screen.getByRole("button", { name: "Sair" }).closest("form")).toHaveAttribute("action", "/api/x/sair")
  })

  it("says it saved, and reads out a refusal", () => {
    const { rerender } = render(<StorefrontAccountForm profile={profile} action="#" signOutAction="#" saved />)
    expect(screen.getByRole("status")).toHaveTextContent("seus dados foram salvos")

    rerender(<StorefrontAccountForm profile={profile} action="#" signOutAction="#" error="Esse celular já é de outro cliente." />)
    expect(screen.getByRole("alert")).toHaveTextContent("Esse celular já é de outro cliente.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAccountForm profile={profile} action="#" signOutAction="#" />)

    await expectNoA11yViolations(container)
  })
})
