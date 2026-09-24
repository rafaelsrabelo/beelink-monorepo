// Libs
import { fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// Types
import type { PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE, decodeCart } from "@/lib/cart-cookie"
import { CartProvider } from "./cart-provider"
import { StorefrontCartLive } from "./storefront-cart-live"

const blusa = {
  id: "01a0d395-c1ab-7399-a472-000000000001",
  slug: "blusa",
  name: "Blusa",
  imageUrl: null,
  soldOut: false,
  options: [],
  variants: [{ id: "01a0d395-c1ab-7399-a472-0000000000b1", optionValueIds: [], priceCents: 5990, compareAtPriceCents: null, imageUrl: null, available: true }],
} as unknown as PublicProductDetail

const gone = "01a0d395-c1ab-7399-a472-000000000999"

function cookieLines() {
  return decodeCart(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CART_COOKIE}=`))
      ?.slice(CART_COOKIE.length + 1),
  )
}

function renderCart(goneOnArrival = false) {
  return render(
    <CartProvider
      slug="loja"
      lines={[
        { productId: blusa.id, variantId: null, qty: 2 },
        ...(goneOnArrival ? [{ productId: gone, variantId: null, qty: 1 }] : []),
      ]}
    >
      <StorefrontCartLive products={[blusa]} hrefs={{ [blusa.id]: "/loja/produtos/blusa" }} continueHref="/loja/produtos" goneOnArrival={goneOnArrival} shopName="Loja" whatsapp="5511999998888" locale="pt-BR" messages={ptBR} />
    </CartProvider>,
  )
}

beforeEach(() => {
  window.history.replaceState(null, "", "/loja/carrinho")
})

afterEach(() => {
  document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
})

describe("StorefrontCartLive", () => {
  it("changes a quantity in place, the total with it, and writes the cookie", () => {
    renderCart()

    expect(screen.getByText(/Subtotal \(2 itens\)/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))

    expect(screen.getByText(/Subtotal \(3 itens\)/)).toBeInTheDocument()
    expect(cookieLines()).toEqual([{ productId: blusa.id, variantId: null, qty: 3 }])
  })

  it("takes a line out, leaving the empty cart and its way back", () => {
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Remover Blusa do carrinho" }))

    expect(screen.getByText("Seu carrinho está vazio.")).toBeInTheDocument()
    expect(cookieLines()).toEqual([])
  })

  it("closes the order on the shop's WhatsApp with every line, then empties the cart and keeps the link", () => {
    renderCart()

    const link = screen.getByRole("link", { name: "Fechar pedido pelo WhatsApp" })
    const href = link.getAttribute("href") ?? ""
    expect(href.startsWith("https://wa.me/5511999998888?text=")).toBe(true)
    expect(decodeURIComponent(href.split("text=")[1] ?? "")).toContain("2× Blusa")

    fireEvent.click(link)

    expect(screen.getByRole("status")).toHaveTextContent("Seu pedido foi para o WhatsApp da loja.")
    expect(screen.getByRole("link", { name: /Tente de novo/ })).toHaveAttribute("href", href)
    expect(cookieLines()).toEqual([])
  })

  it("takes out a line whose product left the shop, and says so", () => {
    renderCart(true)

    expect(screen.getByRole("status")).toHaveTextContent("saiu da loja")
    expect(cookieLines()).toEqual([{ productId: blusa.id, variantId: null, qty: 2 }])
  })
})
