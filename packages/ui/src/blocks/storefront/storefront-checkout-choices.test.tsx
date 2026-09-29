// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutChoices, type StorefrontCheckoutChoicesProps } from "./storefront-checkout-choices"

const home = { id: "a1", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — São Paulo/SP" }
const work = { id: "a2", heading: "Trabalho · Recepção", line: "Av. Faria Lima, 3477 — São Paulo/SP" }

function choices(props: Partial<StorefrontCheckoutChoicesProps> = {}) {
  return (
    <StorefrontCheckoutChoices
      value={{ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null }}
      onChange={() => {}}
      addresses={[home]}
      addHref="/loja/conta/perfil?endereco=novo"
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
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: "PIX" })
    await userEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "PICKUP", addressId: "a1", paymentMethod: null })
  })

  /** One address needs no choosing; several are offered under the delivery, the chosen one checked. */
  it("offers the saved addresses to choose from when there are several, and a way to add another", async () => {
    const onChange = vi.fn()
    const { rerender } = render(choices({ onChange }))
    expect(screen.queryByRole("group", { name: "Endereço de entrega" })).toBeNull()
    expect(screen.getByRole("link", { name: "Entregar em outro endereço" })).toHaveAttribute("href", "/loja/conta/perfil?endereco=novo")

    rerender(choices({ onChange, addresses: [home, work], value: { fulfillment: "DELIVERY", addressId: "a2", paymentMethod: null } }))
    expect(screen.getByRole("group", { name: "Endereço de entrega" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Trabalho · Recepção/ })).toBeChecked()
    expect(screen.getByText("Entregar em Av. Faria Lima, 3477 — São Paulo/SP")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("radio", { name: /Casa · Bia Cliente/ }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null })
  })

  it("turns delivery off without an address, and says where to add one", () => {
    render(choices({ addresses: [], value: { fulfillment: "PICKUP", addressId: null, paymentMethod: "PIX" } }))

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeDisabled()
    expect(screen.getByText("Para receber em casa, cadastre seu endereço.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Adicionar endereço" })).toHaveAttribute("href", "/loja/conta/perfil?endereco=novo")
    expect(screen.queryByText(/taxa de entrega/)).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(choices({ addresses: [home, work] }))
    await expectNoA11yViolations(container)
  })
})
