// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontOrderSent } from "./storefront-order-sent"

describe("StorefrontOrderSent", () => {
  it("says the order's number and that it went to WhatsApp, keeping the link for a second try", () => {
    render(<StorefrontOrderSent number={12} href="https://wa.me/5511?text=pedido" continueHref="/loja/produtos" />)

    expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!")
    expect(screen.getByRole("status")).toHaveTextContent("Ele foi para o WhatsApp da loja")
    expect(screen.getByRole("link", { name: /Tente de novo/ })).toHaveAttribute("href", "https://wa.me/5511?text=pedido")
    expect(screen.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/loja/produtos")
  })

  it("says the shop will confirm, and offers no WhatsApp, at a shop without one", () => {
    render(<StorefrontOrderSent number={12} href={null} continueHref="/loja/produtos" />)

    expect(screen.getByRole("status")).toHaveTextContent("A loja recebeu o seu pedido e vai confirmar.")
    expect(screen.queryByRole("link", { name: /Tente de novo/ })).toBeNull()
  })

  /** BEELINK-205: an order charged online is still to be paid, and the screen leads there. */
  it("says an order charged online is still to be paid, and offers its payment rather than WhatsApp or the shelf", () => {
    render(<StorefrontOrderSent number={12} href={null} payHref="/loja/conta/pedidos/12?pagamento=1" continueHref="/loja/produtos" />)

    expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!")
    expect(screen.getByRole("status")).toHaveTextContent("Falta pagar")
    expect(screen.getByRole("link", { name: "Pagar agora" })).toHaveAttribute("href", "/loja/conta/pedidos/12?pagamento=1")
    expect(screen.queryByRole("link", { name: "Continuar comprando" })).toBeNull()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<StorefrontOrderSent number={12} href="#" continueHref="#" />)

    await expectNoA11yViolations(container)
  })
})
