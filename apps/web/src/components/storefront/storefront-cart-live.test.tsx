// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerProfile, PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE, decodeCart } from "@/lib/cart-cookie"
import { CartProvider } from "./cart-provider"
import { StorefrontCartLive, type StorefrontCartLiveProps } from "./storefront-cart-live"

const mocks = vi.hoisted(() => ({ refresh: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))

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

const bia: CustomerProfile = {
  id: "c1",
  name: "Bia Cliente",
  email: "bia@exemplo.com",
  phone: "11988887777",
  address: { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: null, city: "São Paulo", state: "SP" },
}
const identityHrefs = { signInHref: "/loja/entrar?voltar=%2Floja%2Fcarrinho", signUpHref: "/loja/entrar?modo=criar", editHref: "/loja/conta?voltar=%2Floja%2Fcarrinho" }

function cookieLines() {
  return decodeCart(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CART_COOKIE}=`))
      ?.slice(CART_COOKIE.length + 1),
  )
}

function renderCart(goneOnArrival = false, shopper: CustomerProfile | null = bia, props: Partial<StorefrontCartLiveProps> = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CartProvider
        slug="loja"
        lines={[
          { productId: blusa.id, variantId: null, qty: 2 },
          ...(goneOnArrival ? [{ productId: gone, variantId: null, qty: 1 }] : []),
        ]}
      >
        <StorefrontCartLive
          slug="loja"
          products={[blusa]}
          hrefs={{ [blusa.id]: "/loja/produtos/blusa" }}
          continueHref="/loja/produtos"
          goneOnArrival={goneOnArrival}
          shopName="Loja"
          whatsapp="5511999998888"
          paymentMethods={["PIX"]}
          shopper={shopper}
          identityHrefs={identityHrefs}
          locale="pt-BR"
          messages={ptBR}
          {...props}
        />
      </CartProvider>
    </QueryClientProvider>,
  )
}

const placed = {
  number: 12,
  status: "RECEIVED",
  fulfillment: "DELIVERY",
  deliveryAddress: { recipientName: "Bia Cliente", ...bia.address },
  paymentMethod: "PIX",
  items: [{ productId: blusa.id, productName: "Blusa", variantLabel: null, unitPriceCents: 5990, quantity: 2, lineTotalCents: 11980 }],
  subtotalCents: 11980,
  deliveryFeeCents: 0,
  discountCents: 0,
  totalCents: 11980,
  placedAt: "2026-09-27T12:00:00.000Z",
}

/** The tab the press opens: it is sent to WhatsApp once the order exists, or closed on a refusal. */
function openedTab() {
  const tab = { opener: {} as unknown, location: { href: "" }, close: vi.fn() }
  vi.spyOn(window, "open").mockReturnValue(tab as unknown as Window)
  return tab
}

beforeEach(() => {
  window.history.replaceState(null, "", "/loja/carrinho")
})

afterEach(() => {
  document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mocks.refresh.mockReset()
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

  it("places the order first, then sends the tab to the shop's WhatsApp with its number, empties the cart and keeps the link", async () => {
    const fetched = vi.fn(async () => Response.json(placed, { status: 201 }))
    vi.stubGlobal("fetch", fetched)
    const tab = openedTab()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!"))
    expect(fetched).toHaveBeenCalledWith("/loja/api/orders", expect.objectContaining({ method: "POST" }))
    const sentBody = JSON.parse(String((fetched.mock.calls[0] as unknown[] | undefined)?.[1] && ((fetched.mock.calls[0] as unknown[])[1] as RequestInit).body))
    expect(sentBody).toEqual({ items: [{ variantId: blusa.variants[0]!.id, quantity: 2 }], fulfillment: "DELIVERY", paymentMethod: "PIX" })
    // Opened in the press, with no way back to this page, then pointed at the message with the number.
    expect(window.open).toHaveBeenCalledWith("", "_blank")
    expect(tab.opener).toBeNull()
    expect(tab.location.href.startsWith("https://wa.me/5511999998888?text=")).toBe(true)
    const message = decodeURIComponent(tab.location.href.split("text=")[1] ?? "")
    expect(message).toContain("Fiz o pedido #12 na Loja")
    expect(message).toContain("2× Blusa")
    expect(message).toContain("Endereço: Av. Paulista, 1000 — São Paulo/SP — CEP 01310-930")
    expect(screen.getByRole("link", { name: /Tente de novo/ })).toHaveAttribute("href", tab.location.href)
    expect(cookieLines()).toEqual([])
  })

  it("says why a refused order was not placed, closes the tab, keeps the cart and reads the shelf again", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x" }, { status: 409 })))
    const tab = openedTab()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Algum produto acabou enquanto você comprava"))
    expect(tab.close).toHaveBeenCalled()
    expect(mocks.refresh).toHaveBeenCalled()
    // The cart is still there to fix: nothing was placed.
    expect(screen.getByText(/Subtotal \(2 itens\)/)).toBeInTheDocument()
  })

  it("asks for the payment when the shop takes several, and sends nothing until one is chosen", () => {
    const fetched = vi.fn()
    vi.stubGlobal("fetch", fetched)
    const open = vi.spyOn(window, "open")
    renderCart(false, bia, { paymentMethods: ["PIX", "MONEY"] })

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Escolha a forma de pagamento.")
    expect(fetched).not.toHaveBeenCalled()
    expect(open).not.toHaveBeenCalled()
  })

  it("places the order at a shop without WhatsApp, opening nothing, and says the shop will confirm", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...placed, fulfillment: "PICKUP", deliveryAddress: null }, { status: 201 })))
    const open = vi.spyOn(window, "open")
    renderCart(false, bia, { whatsapp: null })

    fireEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))
    fireEvent.click(screen.getByRole("button", { name: "Fazer pedido" }))

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("A loja recebeu o seu pedido e vai confirmar."))
    expect(open).not.toHaveBeenCalled()
    expect(screen.queryByRole("link", { name: /Tente de novo/ })).toBeNull()
  })

  it("offers delivery only to a shopper with an address, starting on pick-up otherwise", () => {
    renderCart(false, { ...bia, address: { ...bia.address, street: null } })

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
  })

  it("asks a visitor to sign in to order, and comes back to this cart", () => {
    renderCart(false, null)

    expect(screen.queryByRole("button", { name: "Fechar pedido pelo WhatsApp" })).toBeNull()
    expect(screen.getByRole("link", { name: "Entrar para fazer o pedido" })).toHaveAttribute("href", identityHrefs.signInHref)
    // The cart itself stays open: the total is there for anyone.
    expect(screen.getByText(/Subtotal \(2 itens\)/)).toBeInTheDocument()
  })

  it("takes out a line whose product left the shop, and says so", () => {
    renderCart(true)

    expect(screen.getByRole("status")).toHaveTextContent("saiu da loja")
    expect(cookieLines()).toEqual([{ productId: blusa.id, variantId: null, qty: 2 }])
  })
})
