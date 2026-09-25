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
  address: { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
}

describe("StorefrontAccountForm", () => {
  it("posts the shop's record of the shopper, filled in, with the e-mail shown and not editable", () => {
    const { container } = render(<StorefrontAccountForm profile={profile} action="/api/x/perfil" signOutAction="/api/x/sair" />)

    expect(container.querySelector("form")).toHaveAttribute("action", "/api/x/perfil")
    expect(screen.getByLabelText("Nome")).toHaveValue("Bia Cliente")
    expect(screen.getByLabelText("Celular (WhatsApp)")).toHaveValue("11988887777")
    expect(screen.getByLabelText("Rua")).toHaveValue("Av. Paulista")
    expect(screen.getByLabelText("Complemento")).toHaveValue("")
    expect(screen.queryByLabelText("E-mail")).toBeNull()
    expect(screen.getByText("bia@exemplo.com")).toBeInTheDocument()
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
