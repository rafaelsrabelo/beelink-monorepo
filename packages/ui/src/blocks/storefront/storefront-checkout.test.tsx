// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckout, type StorefrontCheckoutProps } from "./storefront-checkout"

const signIn = { signInHref: "/loja/entrar?voltar=%2Floja%2Fcarrinho", signUpHref: "/loja/entrar?modo=criar&voltar=%2Floja%2Fcarrinho" }
const customer = {
  lines: ["Bia Cliente", "11988887777"],
  complete: true,
  editHref: "/loja/conta?voltar=%2Floja%2Fcarrinho",
  addresses: [{ id: "a1", heading: "Casa · Bia Cliente", line: "Av. Paulista, 1000 — São Paulo/SP" }],
  addAddressHref: "/loja/conta/perfil?endereco=novo&voltar=%2Floja%2Fcarrinho",
}

function checkout(props: Partial<StorefrontCheckoutProps> = {}) {
  return (
    <StorefrontCheckout
      channel="whatsapp"
      customer={customer}
      signIn={signIn}
      paymentMethods={["PIX", "MONEY"]}
      choice={{ fulfillment: "DELIVERY", addressId: "a1", paymentMethod: "PIX" }}
      onChoiceChange={() => {}}
      onPlace={() => {}}
      {...props}
    />
  )
}

describe("StorefrontCheckout", () => {
  it("asks a visitor to sign in to order, keeping the cart and coming back to it", () => {
    render(checkout({ customer: null }))

    expect(screen.queryByRole("button", { name: /pedido/ })).toBeNull()
    expect(screen.getByText(/Seu carrinho fica guardado/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Entrar para fazer o pedido" })).toHaveAttribute("href", signIn.signInHref)
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", signIn.signUpHref)
  })

  it("shows a signed-in shopper their details and where a delivery goes, and places the order on a press", () => {
    const onPlace = vi.fn()
    render(checkout({ onPlace }))

    expect(screen.getByText("Bia Cliente")).toBeInTheDocument()
    expect(screen.getByText("Entregar em Av. Paulista, 1000 — São Paulo/SP")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Alterar dados" })).toHaveAttribute("href", customer.editHref)
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    expect(onPlace).toHaveBeenCalledOnce()
  })

  it("places the order at a shop without WhatsApp too, under its own words", () => {
    render(checkout({ channel: "shop" }))

    expect(screen.getByRole("button", { name: "Fazer pedido" })).toBeEnabled()
    expect(screen.queryByText(/WhatsApp/)).toBeNull()
  })

  it("says what is missing from a record without a phone or address", () => {
    render(checkout({ customer: { ...customer, lines: ["Bia"], complete: false, addresses: [] } }))

    expect(screen.getByText(/Adicione seu celular e endereço/)).toBeInTheDocument()
  })

  it("holds the button while nothing can be ordered, and while the order is on its way", () => {
    const { rerender } = render(checkout({ disabled: true }))
    expect(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" })).toBeDisabled()

    rerender(checkout({ pending: true }))
    expect(screen.getByRole("button", { name: "Enviando pedido…" })).toBeDisabled()
    expect(screen.getByRole("radio", { name: /Retirar na loja/ })).toBeDisabled()
  })

  it("says why an order was refused — to a shopper whose session ended too, over the way back in", () => {
    const { rerender } = render(checkout({ error: "Algum produto acabou enquanto você comprava." }))
    expect(screen.getByRole("alert")).toHaveTextContent("Algum produto acabou enquanto você comprava.")

    rerender(checkout({ customer: null, error: "Sua sessão terminou. Entre de novo para fazer o pedido." }))
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão terminou.")
    expect(screen.getByRole("link", { name: "Entrar para fazer o pedido" })).toBeInTheDocument()
  })

  it("has no accessibility violations, signed in or not", async () => {
    const visitor = render(checkout({ customer: null }))
    await expectNoA11yViolations(visitor.container)
    visitor.unmount()

    const shopper = render(checkout({ error: "Escolha a forma de pagamento." }))
    await expectNoA11yViolations(shopper.container)
  })
})
