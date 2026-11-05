// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import type { StorefrontCheckoutChoice } from "./storefront-checkout-choices"
import { StorefrontCheckoutDelivery, type StorefrontCheckoutAddressForm, type StorefrontCheckoutDeliveryProps } from "./storefront-checkout-delivery"

const home = { id: "a1", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — São Paulo/SP" }

/** A stand-in for the screen's form: what the block asked of it, in plain sight. */
const addressForm: StorefrontCheckoutAddressForm = ({ autoFocus, onCancel }) => (
  <section aria-label="Formulário de endereço" data-autofocus={autoFocus}>
    {onCancel ? (
      <button type="button" onClick={onCancel}>
        Cancelar
      </button>
    ) : null}
  </section>
)

/** The block under its parent's state, as the cart holds the choice. */
function Delivery({ start, onChange = () => {}, ...props }: Partial<StorefrontCheckoutDeliveryProps> & { start: StorefrontCheckoutChoice }) {
  const [value, setValue] = useState(start)
  return (
    <fieldset>
      <legend>Como receber</legend>
      <StorefrontCheckoutDelivery
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        name="receber"
        addresses={[home]}
        addHref="/loja/conta/perfil?endereco=novo"
        addressForm={addressForm}
        shipping={null}
        recipientDocument={null}
        {...props}
      />
      <label>
        <input type="radio" name="receber" checked={value.fulfillment === "PICKUP"} onChange={() => setValue({ ...value, fulfillment: "PICKUP" })} />
        Retirar na loja
      </label>
    </fieldset>
  )
}

const pickingUp: StorefrontCheckoutChoice = { fulfillment: "PICKUP", addressId: null, paymentMethod: null, wayId: null }

describe("StorefrontCheckoutDelivery", () => {
  /** The ticket's complaint: no address meant leaving the checkout for the profile tab. */
  it("lets a delivery be chosen with no address, and opens the form right there, focused by that tap", async () => {
    const onChange = vi.fn()
    render(<Delivery start={pickingUp} addresses={[]} onChange={onChange} />)

    expect(screen.getByText("Para receber em casa, informe seu endereço.")).toBeInTheDocument()
    expect(screen.queryByRole("region", { name: "Formulário de endereço" })).toBeNull()
    expect(screen.queryByRole("link")).toBeNull()

    await userEvent.click(screen.getByRole("radio", { name: /Receber em casa/ }))
    expect(onChange).toHaveBeenLastCalledWith({ fulfillment: "DELIVERY", addressId: null, paymentMethod: null, wayId: null })
    expect(screen.getByRole("region", { name: "Formulário de endereço" })).toHaveAttribute("data-autofocus", "true")
    // With no other address to go back to, there is nothing to cancel to.
    expect(screen.queryByRole("button", { name: "Cancelar" })).toBeNull()

    await userEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))
    expect(screen.queryByRole("region", { name: "Formulário de endereço" })).toBeNull()
  })

  /** A shop that only delivers starts on the delivery: the form is open on arrival, and pulls no keyboard up. */
  it("shows the form open, unfocused, when the delivery is already the choice and there is no address", () => {
    render(<Delivery start={{ ...pickingUp, fulfillment: "DELIVERY" }} addresses={[]} />)

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeChecked()
    expect(screen.getByRole("region", { name: "Formulário de endereço" })).toHaveAttribute("data-autofocus", "false")
  })

  it("opens the form for another address in place of the link, and closes it on cancel", async () => {
    render(<Delivery start={{ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: null, wayId: null }} />)

    expect(screen.getByText("Entregar em Av. Paulista, 1000 — São Paulo/SP")).toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Entregar em outro endereço" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Entregar em outro endereço" }))
    expect(screen.getByRole("region", { name: "Formulário de endereço" })).toHaveAttribute("data-autofocus", "true")
    expect(screen.queryByRole("button", { name: "Entregar em outro endereço" })).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.queryByRole("region", { name: "Formulário de endereço" })).toBeNull()
    expect(screen.getByRole("button", { name: "Entregar em outro endereço" })).toBeInTheDocument()
  })

  it("offers no other address while the order is picked up", () => {
    render(<Delivery start={{ ...pickingUp, addressId: "a1" }} />)

    expect(screen.queryByRole("button", { name: "Entregar em outro endereço" })).toBeNull()
  })

  /** Without a form to open, the delivery waits for an address added a link away, as it did. */
  it("keeps the link away, and the delivery off with no address, without a form to open", () => {
    render(<Delivery start={pickingUp} addresses={[]} addressForm={null} />)

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeDisabled()
    expect(screen.getByRole("link", { name: "Adicionar endereço" })).toHaveAttribute("href", "/loja/conta/perfil?endereco=novo")
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Delivery start={{ ...pickingUp, fulfillment: "DELIVERY" }} addresses={[]} />)
    await expectNoA11yViolations(container)
  })
})
