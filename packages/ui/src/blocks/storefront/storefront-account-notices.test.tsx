// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAccountNotices, type StorefrontAccountNoticesProps } from "./storefront-account-notices"

function notices(props: Partial<StorefrontAccountNoticesProps> = {}) {
  return (
    <StorefrontAccountNotices
      email="bia@exemplo.com"
      notices={{ orders: true, favorites: true, cashback: true, offers: false }}
      action="/loja/api/customer/avisos"
      hidden={{ retorno: "/loja/conta/perfil#avisos" }}
      {...props}
    />
  )
}

describe("StorefrontAccountNotices", () => {
  it("draws the four notices as boxes to tick, as the shopper left them, each saying what it sends", () => {
    const { container } = render(notices())

    expect(screen.getByRole("heading", { name: "Avisos por e-mail" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Escolha o que esta loja pode mandar para bia@exemplo.com." })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Andamento dos pedidos" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Favoritos" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Cashback" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Cashback" })).toHaveAccessibleDescription("Uma semana antes de o seu cashback vencer.")
    expect(screen.getByRole("checkbox", { name: "Ofertas e novidades" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Favoritos" })).toHaveAccessibleDescription("Quando um favorito baixa de preço ou volta ao estoque.")
    expect(container.querySelector("form")).toHaveAttribute("action", "/loja/api/customer/avisos")
    expect(screen.getByRole("button", { name: "Salvar avisos" })).toBeInTheDocument()
  })

  it("ticks a box from anywhere on its card", async () => {
    render(notices())

    await userEvent.click(screen.getByText("Promoções e lançamentos desta loja."))
    expect(screen.getByRole("checkbox", { name: "Ofertas e novidades" })).toBeChecked()
  })

  it("says when the shopper said yes to offers", () => {
    render(notices({ notices: { orders: true, favorites: true, cashback: true, offers: true }, offersSince: "29/09/2026" }))

    expect(screen.getByRole("checkbox", { name: "Ofertas e novidades" })).toHaveAccessibleDescription("Promoções e lançamentos desta loja. Você aceitou em 29/09/2026.")
  })

  it("says what the last save came back with", () => {
    render(notices({ notice: "Pronto, seus avisos foram salvos." }))

    expect(screen.getByRole("status")).toHaveTextContent("Pronto, seus avisos foram salvos.")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(notices({ notice: "Pronto, seus avisos foram salvos." }))
    await expectNoA11yViolations(container)
  })
})
