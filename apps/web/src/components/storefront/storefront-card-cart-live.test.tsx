// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE } from "@/lib/cart-cookie"
import { CartProvider } from "./cart-provider"
import { StorefrontCardCartLive } from "./storefront-card-cart-live"
import { StorefrontCartLinkLive } from "./storefront-cart-link-live"

const product = { id: "01a0d395-c1ab-7399-a472-000000000001", name: "Camiseta preta", hasOptions: false }

beforeEach(() => {
  window.history.replaceState(null, "", "/loja/produtos")
})

afterEach(() => {
  document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
})

describe("StorefrontCardCartLive", () => {
  it("puts a product without options in the shop's cart as itself, and the header counts it", () => {
    render(
      <CartProvider slug="loja" lines={[]}>
        <StorefrontCartLinkLive href="/loja/carrinho" messages={ptBR} />
        <StorefrontCardCartLive product={product} messages={ptBR} />
      </CartProvider>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))
    fireEvent.click(screen.getByRole("button", { name: "Adicionado" }))

    expect(screen.getByRole("link", { name: "Carrinho, 2 itens" })).toBeInTheDocument()
  })

  it("adds nothing from the card for a product with options", () => {
    render(
      <CartProvider slug="loja" lines={[]}>
        <StorefrontCardCartLive product={{ ...product, hasOptions: true }} messages={ptBR} />
      </CartProvider>,
    )

    expect(screen.queryByRole("button")).toBeNull()
  })
})
