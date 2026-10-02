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
    expect(screen.getByText("Frete a combinar com a loja: ela informa o valor ao confirmar o pedido.")).toBeInTheDocument()
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

  /** BEELINK-178: what the shop's delivery rules quote to the chosen address. */
  describe("with the shop's quote for the address", () => {
    const quoted = { delivery: true, pickup: true, deliveryNote: "R$ 5,00 · chega em 30–50 min depois de sair da loja", unreachable: false }

    it("says the fee and the window under the delivery, in place of a fee agreed afterwards", () => {
      render(choices({ shipping: quoted }))

      expect(screen.getByText("R$ 5,00 · chega em 30–50 min depois de sair da loja")).toBeInTheDocument()
      expect(screen.queryByText(/Frete a combinar/)).toBeNull()
      // A fee is read where it stands: nothing is announced.
      expect(screen.queryByRole("status")).toBeNull()
    })

    it("says at once that the shop does not reach the address, with the other addresses still to choose from", async () => {
      const note = "A loja não entrega neste endereço: ele fica a 10,8 km, e a entrega vai até 8 km. Escolha outro endereço ou retire na loja."
      const { container } = render(choices({ addresses: [home, work], shipping: { ...quoted, deliveryNote: note, unreachable: true } }))

      expect(screen.getByRole("status")).toHaveTextContent(note)
      expect(screen.getByRole("radio", { name: /Trabalho/ })).toBeEnabled()
      await expectNoA11yViolations(container)
    })

    it("offers only the ways the shop switched on", () => {
      const { rerender } = render(choices({ shipping: { ...quoted, pickup: false } }))
      expect(screen.queryByRole("radio", { name: "Retirar na loja" })).toBeNull()
      expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeChecked()

      rerender(choices({ value: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null }, shipping: { ...quoted, delivery: false, deliveryNote: "" } }))
      expect(screen.queryByRole("radio", { name: /Receber em casa/ })).toBeNull()
      expect(screen.queryByRole("link", { name: /endereço/ })).toBeNull()
      expect(screen.getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
    })

    it("says so when the shop hands nothing over now", () => {
      render(choices({ value: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null }, shipping: { delivery: false, pickup: false, deliveryNote: "", unreachable: false } }))

      expect(screen.getByRole("status")).toHaveTextContent("A loja não está entregando nem recebendo retiradas agora.")
      expect(screen.queryByRole("radio", { name: /Receber em casa|Retirar na loja/ })).toBeNull()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(choices({ addresses: [home, work] }))
    await expectNoA11yViolations(container)
  })
})
