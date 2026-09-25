// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontCheckout } from "./storefront-checkout"

const signIn = { signInHref: "/loja/entrar?voltar=%2Floja%2Fcarrinho", signUpHref: "/loja/entrar?modo=criar&voltar=%2Floja%2Fcarrinho" }
const customer = { lines: ["Bia Cliente", "11988887777", "Av. Paulista, 1000 — São Paulo/SP"], complete: true, editHref: "/loja/conta?voltar=%2Floja%2Fcarrinho" }

describe("StorefrontCheckout", () => {
  it("asks a visitor to sign in to order, keeping the cart and coming back to it", () => {
    render(<StorefrontCheckout href="https://wa.me/5511" customer={null} signIn={signIn} />)

    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull()
    expect(screen.getByText(/Seu carrinho fica guardado/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Entrar para fazer o pedido" })).toHaveAttribute("href", signIn.signInHref)
    expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", signIn.signUpHref)
  })

  it("shows a signed-in shopper their details as the shop keeps them, and sends the order", () => {
    const onSend = vi.fn()
    render(<StorefrontCheckout href="https://wa.me/5511?text=x" customer={customer} signIn={signIn} onSend={onSend} />)

    expect(screen.getByText("Av. Paulista, 1000 — São Paulo/SP")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Alterar dados" })).toHaveAttribute("href", customer.editHref)
    fireEvent.click(screen.getByRole("link", { name: "Fechar pedido pelo WhatsApp" }))
    expect(onSend).toHaveBeenCalledWith("https://wa.me/5511?text=x")
  })

  it("says what is missing from a record without a phone or address", () => {
    render(<StorefrontCheckout href="#" customer={{ ...customer, lines: ["Bia"], complete: false }} signIn={signIn} />)

    expect(screen.getByText(/Adicione seu celular e endereço/)).toBeInTheDocument()
  })

  it("draws no button for a shop without WhatsApp, and says why", () => {
    render(<StorefrontCheckout href={null} customer={customer} signIn={signIn} />)

    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull()
    expect(screen.getByText(/não recebe pedidos pelo site/)).toBeInTheDocument()
  })

  it("holds the button while nothing can be ordered", () => {
    render(<StorefrontCheckout href="#" customer={customer} signIn={signIn} disabled />)

    expect(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" })).toBeDisabled()
  })

  it("has no accessibility violations, signed in or not", async () => {
    const visitor = render(<StorefrontCheckout href="#" customer={null} signIn={signIn} />)
    await expectNoA11yViolations(visitor.container)
    visitor.unmount()

    const shopper = render(<StorefrontCheckout href="#" customer={customer} signIn={signIn} />)
    await expectNoA11yViolations(shopper.container)
  })
})
