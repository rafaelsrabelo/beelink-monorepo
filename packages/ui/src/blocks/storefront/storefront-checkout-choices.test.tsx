// Libs
import { render, screen, within } from "@testing-library/react"
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
      value={{ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: null }}
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
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: "PIX", paymentChannel: "OFFLINE", installments: 1, wayId: null })
    await userEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "PICKUP", addressId: "a1", paymentMethod: null, wayId: null })
  })

  /** One address needs no choosing; several are offered under the delivery, the chosen one checked. */
  it("offers the saved addresses to choose from when there are several, and a way to add another", async () => {
    const onChange = vi.fn()
    const { rerender } = render(choices({ onChange }))
    expect(screen.queryByRole("group", { name: "Endereço de entrega" })).toBeNull()
    expect(screen.getByRole("link", { name: "Entregar em outro endereço" })).toHaveAttribute("href", "/loja/conta/perfil?endereco=novo")

    rerender(choices({ onChange, addresses: [home, work], value: { fulfillment: "DELIVERY", addressId: "a2", paymentMethod: null, wayId: null } }))
    expect(screen.getByRole("group", { name: "Endereço de entrega" })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Trabalho · Recepção/ })).toBeChecked()
    expect(screen.getByText("Entregar em Av. Faria Lima, 3477 — São Paulo/SP")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("radio", { name: /Casa · Bia Cliente/ }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: null })
  })

  it("turns delivery off without an address, and says where to add one", () => {
    render(choices({ addresses: [], value: { fulfillment: "PICKUP", addressId: null, paymentMethod: "PIX", wayId: null } }))

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeDisabled()
    expect(screen.getByText("Para receber em casa, cadastre seu endereço.")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Adicionar endereço" })).toHaveAttribute("href", "/loja/conta/perfil?endereco=novo")
    expect(screen.queryByText(/taxa de entrega/)).toBeNull()
  })

  /** BEELINK-178: what the shop's delivery rules quote to the chosen address. */
  describe("with the shop's quote for the address", () => {
    const own = { id: "OWN", title: "Entrega da loja", detail: "R$ 5,00 · chega em 30–50 min depois de sair da loja" }
    const quoted = { delivery: true, pickup: true, ways: [own], note: own.detail }

    it("says the fee and the window under the delivery, in place of a fee agreed afterwards", () => {
      render(choices({ shipping: quoted }))

      expect(screen.getByText("R$ 5,00 · chega em 30–50 min depois de sair da loja")).toBeInTheDocument()
      expect(screen.queryByText(/Frete a combinar/)).toBeNull()
      // A fee is read where it stands: nothing is announced.
      expect(screen.queryByRole("status")).toBeNull()
    })

    it("says at once that the shop does not reach the address, with the other addresses still to choose from", async () => {
      const note = "A loja não entrega neste endereço: ele fica a 10,8 km, e a entrega vai até 8 km. Escolha outro endereço ou retire na loja."
      const { container } = render(choices({ addresses: [home, work], shipping: { ...quoted, ways: [], note } }))

      expect(screen.getByRole("status")).toHaveTextContent(note)
      expect(screen.getByRole("radio", { name: /Trabalho/ })).toBeEnabled()
      await expectNoA11yViolations(container)
    })

    it("offers only the ways the shop switched on", () => {
      const { rerender } = render(choices({ shipping: { ...quoted, pickup: false } }))
      expect(screen.queryByRole("radio", { name: "Retirar na loja" })).toBeNull()
      expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeChecked()

      rerender(choices({ value: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null, wayId: null }, shipping: { ...quoted, delivery: false, ways: [], note: null } }))
      expect(screen.queryByRole("radio", { name: /Receber em casa/ })).toBeNull()
      expect(screen.queryByRole("link", { name: /endereço/ })).toBeNull()
      expect(screen.getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
    })

    it("says so when the shop hands nothing over now", () => {
      render(choices({ value: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null, wayId: null }, shipping: { delivery: false, pickup: false, ways: [], note: null } }))

      expect(screen.getByRole("status")).toHaveTextContent("A loja não está entregando nem recebendo retiradas agora.")
      expect(screen.queryByRole("radio", { name: /Receber em casa|Retirar na loja/ })).toBeNull()
    })
  })

  /** BEELINK-186: the shop's own delivery and each carrier, to choose among. */
  describe("with several ways to deliver", () => {
    const own = { id: "OWN", title: "Entrega da loja", detail: "Frete a combinar com a loja" }
    const pac = { id: "CARRIER:1", title: "Correios · PAC", detail: "R$ 18,20 · chega em 7–9 dias úteis" }
    const sedex = { id: "CARRIER:2", title: "Correios · SEDEX", detail: "R$ 27,45 · chega em 3–4 dias úteis" }
    const several = { delivery: true, pickup: true, ways: [own, pac, sedex], note: null }

    it("lists them under the address, the first chosen until another is, and hands back the one picked", async () => {
      const onChange = vi.fn()
      const { container } = render(choices({ onChange, shipping: several }))

      const list = screen.getByRole("group", { name: "Forma de envio" })
      expect(within(list).getAllByRole("radio")).toHaveLength(3)
      expect(within(list).getByRole("radio", { name: /Entrega da loja/ })).toBeChecked()
      expect(within(list).getByText("R$ 27,45 · chega em 3–4 dias úteis")).toBeInTheDocument()

      await userEvent.click(within(list).getByRole("radio", { name: /Correios · SEDEX/ }))
      expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: "CARRIER:2" })
      await expectNoA11yViolations(container)
    })

    it("marks the way chosen, and lists none while the order is picked up", () => {
      const { rerender } = render(choices({ value: { fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: "CARRIER:1" }, shipping: several }))
      expect(screen.getByRole("radio", { name: /Correios · PAC/ })).toBeChecked()

      rerender(choices({ value: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null, wayId: "CARRIER:1" }, shipping: several }))
      expect(screen.queryByRole("group", { name: "Forma de envio" })).toBeNull()
    })

    /** BEELINK-187: a carrier's label is bought with the CPF of who receives it. */
    it("asks the CPF of who receives it when the screen asks for it, and hands back what is typed", async () => {
      const onDocument = vi.fn()
      const { container } = render(choices({ value: { fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: "CARRIER:2" }, shipping: several, recipientDocument: { value: "", onChange: onDocument } }))

      const field = screen.getByLabelText("CPF de quem recebe")
      expect(field).toHaveAccessibleDescription(/fica guardado no seu cadastro/)
      await userEvent.type(field, "5")
      expect(onDocument).toHaveBeenLastCalledWith("5")
      await expectNoA11yViolations(container)
    })

    it("says a single carrier inside the delivery choice, with nothing to choose among", () => {
      render(choices({ shipping: { ...several, ways: [sedex], note: "Correios · SEDEX — R$ 27,45 · chega em 3–4 dias úteis" } }))

      expect(screen.getByText("Correios · SEDEX — R$ 27,45 · chega em 3–4 dias úteis")).toBeInTheDocument()
      expect(screen.queryByRole("group", { name: "Forma de envio" })).toBeNull()
    })
  })

  it("has no accessibility violations", async () => {
    const { container } = render(choices({ addresses: [home, work] }))
    await expectNoA11yViolations(container)
  })
})
