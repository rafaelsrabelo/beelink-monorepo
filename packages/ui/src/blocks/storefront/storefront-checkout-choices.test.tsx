// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutChoices, type StorefrontCheckoutChoicesProps } from "./storefront-checkout-choices"

function choices(props: Partial<StorefrontCheckoutChoicesProps> = {}) {
  return (
    <StorefrontCheckoutChoices
      value={{ fulfillment: "DELIVERY", paymentMethod: null }}
      onChange={() => {}}
      deliveryLine="Av. Paulista, 1000 — São Paulo/SP"
      editHref="/loja/conta"
      paymentMethods={["PIX", "MONEY", "CREDIT_CARD"]}
      {...props}
    />
  )
}

describe("StorefrontCheckoutChoices", () => {
  it("offers delivery to the address on file or pick-up, and the shop's payments, each a radio", async () => {
    const onChange = vi.fn()
    render(choices({ onChange }))

    expect(screen.getByRole("group", { name: "Como receber" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeChecked()
    expect(screen.getByText("A loja informa a taxa de entrega ao confirmar o pedido.")).toBeInTheDocument()
    expect(screen.getAllByRole("radio", { name: /Pix|Dinheiro|Cartão de crédito/ })).toHaveLength(3)
    expect(screen.queryByRole("radio", { name: "Cartão de débito" })).toBeNull()

    await userEvent.click(screen.getByRole("radio", { name: "Pix" }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", paymentMethod: "PIX" })
    await userEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "PICKUP", paymentMethod: null })
  })

  it("turns delivery off without an address, and says where to add one", () => {
    render(choices({ deliveryLine: null, value: { fulfillment: "PICKUP", paymentMethod: "PIX" } }))

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeDisabled()
    expect(screen.getByText("Para receber em casa, cadastre seu endereço.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Alterar dados" })).toHaveAttribute("href", "/loja/conta")
    expect(screen.queryByText(/taxa de entrega/)).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(choices())
    await expectNoA11yViolations(container)
  })
})
