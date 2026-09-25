// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CartProvider, useCart } from "./cart-provider"
import { StorefrontCartLinkLive } from "./storefront-cart-link-live"

const product = "01a0d395-c1ab-7399-a472-84a307bf060d"

/** Stands in for the "Adicionar ao carrinho" that F3 brings. */
function AddOne() {
  const add = useCart((cart) => cart.add)
  return (
    <button type="button" onClick={() => add({ productId: product, variantId: null, qty: 1 })}>
      mais um
    </button>
  )
}

describe("StorefrontCartLinkLive", () => {
  it("starts from the lines the server read, and follows the cart as it fills", () => {
    render(
      <CartProvider slug="loja" lines={[{ productId: product, variantId: null, qty: 2 }]}>
        <StorefrontCartLinkLive href="/loja/carrinho" messages={ptBR} />
        <AddOne />
      </CartProvider>,
    )

    expect(screen.getByRole("link", { name: "Carrinho, 2 itens" })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "mais um" }))
    expect(screen.getByRole("link", { name: "Carrinho, 3 itens" })).toBeInTheDocument()
  })

  it("draws an empty cart outside a shop, as the panel's preview does", () => {
    render(<StorefrontCartLinkLive href="/loja/carrinho" messages={ptBR} />)

    expect(screen.getByRole("link", { name: "Carrinho, 0 itens" })).toBeInTheDocument()
  })
})
