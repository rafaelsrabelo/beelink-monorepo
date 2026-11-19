// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE } from "@/lib/cart-cookie"
import { CartProvider } from "./cart-provider"
import { StorefrontCardCartLive } from "./storefront-card-cart-live"
import { StorefrontCartLinkLive } from "./storefront-cart-link-live"
import { TrackingContext } from "./tracking/use-track"

const product = { id: "01a0d395-c1ab-7399-a472-000000000001", name: "Camiseta preta", priceCents: 5990, hasOptions: false }

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

  it("tells each press as one unit added, by the product's id and at its price", () => {
    const track = vi.fn()
    render(
      <TrackingContext value={{ allowed: true, track }}>
        <CartProvider slug="loja" lines={[]}>
          <StorefrontCardCartLive product={product} messages={ptBR} />
        </CartProvider>
      </TrackingContext>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))

    expect(track.mock.calls).toEqual([[{ name: "AddToCart", item: { productId: product.id, qty: 1, name: "Camiseta preta", unitPriceCents: 5990 } }]])
  })

  it("puts the product in the cart on the way to the checkout with 'Comprar agora'", () => {
    render(
      <CartProvider slug="loja" lines={[]}>
        <StorefrontCartLinkLive href="/loja/carrinho" messages={ptBR} />
        <StorefrontCardCartLive product={product} checkoutHref="/loja/checkout" messages={ptBR} />
      </CartProvider>,
    )

    const buyNow = screen.getByRole("link", { name: "Comprar agora" })
    expect(buyNow).toHaveAttribute("href", "/loja/checkout")
    buyNow.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(buyNow)

    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeInTheDocument()
  })

  // Not one more of it: "Adicionar ao carrinho" then "Comprar agora" on the same card is still one.
  it("adds nothing with 'Comprar agora' when the cart holds the product already", () => {
    render(
      <CartProvider slug="loja" lines={[{ productId: product.id, variantId: null, qty: 1 }]}>
        <StorefrontCartLinkLive href="/loja/carrinho" messages={ptBR} />
        <StorefrontCardCartLive product={product} checkoutHref="/loja/checkout" messages={ptBR} />
      </CartProvider>,
    )

    const buyNow = screen.getByRole("link", { name: "Comprar agora" })
    buyNow.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(buyNow)

    expect(screen.getByRole("link", { name: "Carrinho, 1 item" })).toBeInTheDocument()
  })

  it("offers no 'Comprar agora' without the checkout's address", () => {
    render(
      <CartProvider slug="loja" lines={[]}>
        <StorefrontCardCartLive product={product} messages={ptBR} />
      </CartProvider>,
    )

    expect(screen.queryByRole("link", { name: "Comprar agora" })).toBeNull()
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
