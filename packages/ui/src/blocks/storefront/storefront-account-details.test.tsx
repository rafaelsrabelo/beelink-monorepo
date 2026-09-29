// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountDetails } from "./storefront-account-details"

describe("StorefrontAccountDetails", () => {
  it("lists how to reach the shopper and where to deliver, with the way to change them", () => {
    render(<StorefrontAccountDetails phone="(85) 99999-4321" email="bia@exemplo.com" address="Rua A, 10 — Centro — Fortaleza/CE" editHref="/loja/conta/perfil" />)

    expect(screen.getByRole("heading", { level: 2, name: "Seus dados" })).toBeInTheDocument()
    expect(screen.getByText("Telefone").nextElementSibling).toHaveTextContent("(85) 99999-4321")
    expect(screen.getByText("E-mail").nextElementSibling).toHaveTextContent("bia@exemplo.com")
    expect(screen.getByText("Endereço de entrega").nextElementSibling).toHaveTextContent("Rua A, 10 — Centro — Fortaleza/CE")
    expect(screen.getByRole("link", { name: "Editar dados" })).toHaveAttribute("href", "/loja/conta/perfil")
  })

  /** A gap left blank looks like a bug; said, it tells the shopper why the checkout will ask. */
  it("says what is missing rather than leaving it blank", () => {
    render(<StorefrontAccountDetails phone={null} email="bia@exemplo.com" address={null} editHref="#" />)

    expect(screen.getByText("Telefone").nextElementSibling).toHaveTextContent("Nenhum telefone salvo.")
    expect(screen.getByText("Endereço de entrega").nextElementSibling).toHaveTextContent("Nenhum endereço salvo.")
  })

  it("says an address on file is not enough to deliver to", () => {
    render(<StorefrontAccountDetails phone={null} email="bia@exemplo.com" address="CEP 60323-231" addressIncomplete editHref="#" />)

    expect(screen.getByText("CEP 60323-231")).toBeInTheDocument()
    expect(screen.getByText("Falta a rua e a cidade para a loja entregar.")).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontAccountDetails phone={null} email="bia@exemplo.com" address="CEP 60323-231" addressIncomplete editHref="#" />)
    await expectNoA11yViolations(container)
  })
})
