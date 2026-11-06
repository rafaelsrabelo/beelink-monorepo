// Libs
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckoutShopperSteps, type StorefrontCheckoutShopperStepsProps } from "./storefront-checkout-shopper-steps"

const home = { id: "a1", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — São Paulo/SP" }
const customer = { lines: ["Bia Cliente", "11988887777"], complete: true, editHref: "/loja/conta", addresses: [home], addAddressHref: "/loja/conta/perfil?endereco=novo" }
const own = { id: "OWN", title: "Entrega da loja", detail: "R$ 8,00 · chega em 30–50 min depois de sair da loja" }

function steps(props: Partial<StorefrontCheckoutShopperStepsProps> = {}) {
  return (
    <StorefrontCheckoutShopperSteps
      customer={customer}
      choice={{ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: null }}
      onChoiceChange={() => {}}
      shipping={{ delivery: true, pickup: true, ways: [own], note: own.detail }}
      recipientDocument={null}
      paymentMethods={["PIX", "MONEY"]}
      online={null}
      nothingToPay={null}
      deliveryIssue={null}
      alert={null}
      placeButton={<button type="button">Fechar pedido</button>}
      pending={false}
      {...props}
    />
  )
}

const stepNamed = (name: string) => screen.getByRole("region", { name: new RegExp(`^${name}`) })

describe("StorefrontCheckoutShopperSteps", () => {
  /** "O cara tomou a decisão de compra": a shopper with an address on file is at the payment at once. */
  it("takes a shopper with an address straight to the payment, the delivery done in a line with its fee", () => {
    render(steps())

    expect(within(stepNamed("Seus dados")).getByText("Bia Cliente · 11988887777")).toBeInTheDocument()
    const delivery = stepNamed("Entrega")
    expect(within(delivery).getByText("Entregar em Av. Paulista, 1000 — São Paulo/SP")).toBeInTheDocument()
    expect(within(delivery).getByText("R$ 8,00 · chega em 30–50 min depois de sair da loja")).toBeInTheDocument()
    expect(within(delivery).queryByRole("radio")).toBeNull()
    expect(within(stepNamed("Pagamento")).getByRole("radio", { name: "Pix" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Fechar pedido" })).toBeInTheDocument()
  })

  /** A shopper just identified has no address: a pick-up is never assumed for them at the payment. */
  it("opens the delivery for a shopper with no address even with a pick-up chosen, for them to say how to receive it", () => {
    render(steps({ customer: { ...customer, addresses: [] }, choice: { fulfillment: "PICKUP", addressId: null, paymentMethod: null, wayId: null } }))

    expect(within(stepNamed("Entrega")).getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
    expect(within(stepNamed("Pagamento")).getByText("Escolha como receber para continuar.")).toBeInTheDocument()
  })

  /** A visitor's "Alterar" ends their purchase session by a post, never a link a prefetch could follow. */
  it("lets a visitor change who is buying by a form, not a link", () => {
    const { container } = render(steps({ customer: { ...customer, editAction: { action: "/loja/api/customer/checkout/sair", hidden: { retorno: "/loja/carrinho#finalizar" } } } }))

    const form = container.querySelector('form[action="/loja/api/customer/checkout/sair"]')
    expect(form).toHaveAttribute("method", "post")
    expect(within(stepNamed("Seus dados")).getByRole("button", { name: "Alterar" })).toHaveAttribute("type", "submit")
    expect(within(stepNamed("Seus dados")).queryByRole("link", { name: "Alterar" })).toBeNull()
  })

  it("says a pick-up as such in the delivery's line", () => {
    render(steps({ choice: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null, wayId: null } }))

    expect(within(stepNamed("Entrega")).getByText("Retirar na loja")).toBeInTheDocument()
  })

  it("opens the delivery for a shopper with no address, the payment waiting with what comes first", () => {
    render(steps({ customer: { ...customer, addresses: [] }, choice: { fulfillment: "DELIVERY", addressId: null, paymentMethod: null, wayId: null } }))

    expect(within(stepNamed("Entrega")).getByRole("radio", { name: /Receber em casa/ })).toBeInTheDocument()
    expect(within(stepNamed("Pagamento")).getByText("Escolha como receber para continuar.")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Fechar pedido" })).toBeNull()
  })

  it("says what the delivery wants on 'Continuar' rather than going on, and goes on once nothing does, the focus with it", async () => {
    const { rerender } = render(steps({ customer: { ...customer, addresses: [] }, choice: { fulfillment: "DELIVERY", addressId: null, paymentMethod: null, wayId: null }, deliveryIssue: "Para receber em casa, preencha o endereço de entrega." }))
    expect(screen.queryByRole("alert")).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Continuar para o pagamento" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Para receber em casa, preencha o endereço de entrega.")
    expect(screen.queryByRole("button", { name: "Fechar pedido" })).toBeNull()

    // The pick-up chosen: nothing wanting, and the press goes on.
    rerender(steps({ choice: { fulfillment: "PICKUP", addressId: null, paymentMethod: null, wayId: null }, customer: { ...customer, addresses: [] } }))
    await userEvent.click(screen.getByRole("button", { name: "Continuar para o pagamento" }))
    await act(() => new Promise((done) => requestAnimationFrame(() => done(undefined))))
    expect(screen.getByRole("heading", { name: "Pagamento" })).toHaveFocus()
    expect(screen.getByRole("button", { name: "Fechar pedido" })).toBeInTheDocument()
  })

  it("opens the delivery again on 'Alterar', and on its own when it stops holding", async () => {
    const onChoiceChange = vi.fn()
    const { rerender } = render(steps({ onChoiceChange }))

    await userEvent.click(within(stepNamed("Entrega")).getByRole("button", { name: "Alterar" }))
    expect(within(stepNamed("Entrega")).getByRole("radio", { name: /Retirar na loja/ })).toBeInTheDocument()
    expect(within(stepNamed("Pagamento")).getByText("Escolha como receber para continuar.")).toBeInTheDocument()

    // Back at the payment, the quote then says the shop does not reach the address: the delivery opens itself.
    await userEvent.click(screen.getByRole("button", { name: "Continuar para o pagamento" }))
    rerender(steps({ onChoiceChange, deliveryIssue: "A loja não entrega neste endereço." }))
    expect(within(stepNamed("Entrega")).getByRole("radio", { name: /Receber em casa/ })).toBeInTheDocument()

    // Fixed — a pick-up chosen — it stays open under the shopper's hand until their "Continuar".
    rerender(steps({ onChoiceChange, choice: { fulfillment: "PICKUP", addressId: "a1", paymentMethod: null, wayId: null } }))
    expect(within(stepNamed("Entrega")).getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
    await userEvent.click(screen.getByRole("button", { name: "Continuar para o pagamento" }))
    expect(within(stepNamed("Entrega")).getByText("Retirar na loja")).toBeInTheDocument()
    expect(within(stepNamed("Entrega")).queryByRole("radio")).toBeNull()
  })

  it("has no accessibility violations, at the payment or at the delivery", async () => {
    const { container, rerender } = render(steps())
    await expectNoA11yViolations(container)
    rerender(steps({ deliveryIssue: "A loja não entrega neste endereço." }))
    await expectNoA11yViolations(container)
  })
})
