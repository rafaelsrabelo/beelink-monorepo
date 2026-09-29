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
  cpf: null,
  birthDate: null,
  phone: "11988887777",
  address: { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: null, city: "São Paulo", state: "SP" },
  addresses: [],
}
bia.addresses = [{ id: "a1", label: "Casa", recipientName: null, ...bia.address, isDefault: true }]
const work = { id: "a2", label: "Trabalho", recipientName: "Recepção", ...bia.address, street: "Av. Faria Lima", number: "3477", isDefault: false }
const identityHrefs = {
  signInHref: "/loja/entrar?voltar=%2Floja%2Fcarrinho",
  signUpHref: "/loja/entrar?modo=criar",
  editHref: "/loja/conta?voltar=%2Floja%2Fcarrinho",
  addAddressHref: "/loja/conta/perfil?endereco=novo&voltar=%2Floja%2Fcarrinho",
}

function cookieLines() {
  return decodeCart(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CART_COOKIE}=`))
      ?.slice(CART_COOKIE.length + 1),
  )
}

function cartTree(client: QueryClient, goneOnArrival: boolean, shopper: CustomerProfile | null, props: Partial<StorefrontCartLiveProps>) {
  return (
    <QueryClientProvider client={client}>
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
    </QueryClientProvider>
  )
}

/** The cart page, and a way to draw it again as a refresh would — the same page, new props. */
function renderCart(goneOnArrival = false, shopper: CustomerProfile | null = bia, props: Partial<StorefrontCartLiveProps> = {}) {
  const client = new QueryClient()
  const view = render(cartTree(client, goneOnArrival, shopper, props))
  return { ...view, redraw: (next: CustomerProfile | null) => view.rerender(cartTree(client, goneOnArrival, next, props)) }
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
    expect(sentBody).toEqual({ items: [{ variantId: blusa.variants[0]!.id, quantity: 2 }], fulfillment: "DELIVERY", paymentMethod: "PIX", addressId: "a1" })
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

  it("names the line the stock cannot cover and how many are left, closes the tab and keeps the cart to fix", async () => {
    const details = { shortages: [{ variantId: blusa.variants[0]!.id, available: 1 }] }
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x", details }, { status: 409 })))
    const tab = openedTab()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Não há estoque para tudo — Blusa: só restam 1."))
    expect(tab.close).toHaveBeenCalled()
    // The catalogue the cart reads is cached: a refresh would draw the same cart, so none is asked.
    expect(mocks.refresh).not.toHaveBeenCalled()
    // The cart is still there to fix: nothing was placed.
    expect(screen.getByText(/Subtotal \(2 itens\)/)).toBeInTheDocument()
  })

  it("changing the cart clears the refusal, which no longer describes it", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x" }, { status: 409 })))
    openedTab()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Blusa" }))

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
  })

  it("says the session ended, reads the page again and keeps saying so once it asks to sign in", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 })))
    openedTab()
    const view = renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())

    // The refreshed page has nobody signed in: the same cart, now asking to sign in, and saying why.
    view.redraw(null)
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão terminou.")
    expect(screen.getByRole("link", { name: "Entrar para fazer o pedido" })).toBeInTheDocument()
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

  /** Said over a cart that is gone, "os itens estão no carrinho" would contradict "pedido enviado". */
  it("says what brought the shopper here over the cart, and stops once the order is sent", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...placed, fulfillment: "PICKUP", deliveryAddress: null }, { status: 201 })))
    renderCart(false, bia, { whatsapp: null, arrival: <p>Os itens do pedido nº 11 estão no carrinho.</p> })
    expect(screen.getByText("Os itens do pedido nº 11 estão no carrinho.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))
    fireEvent.click(screen.getByRole("button", { name: "Fazer pedido" }))

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("A loja recebeu o seu pedido e vai confirmar."))
    expect(screen.queryByText("Os itens do pedido nº 11 estão no carrinho.")).toBeNull()
  })

  it("never keeps a delivery chosen once the address is gone from the page", () => {
    const view = renderCart()
    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeChecked()

    view.redraw({ ...bia, addresses: [] })
    expect(screen.getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
  })

  it("offers delivery only to a shopper with an address to deliver to, starting on pick-up otherwise", () => {
    renderCart(false, { ...bia, addresses: [{ ...bia.addresses[0]!, street: null }] })

    expect(screen.getByRole("radio", { name: /Receber em casa/ })).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Retirar na loja" })).toBeChecked()
    expect(screen.getByRole("link", { name: "Adicionar endereço" })).toHaveAttribute("href", identityHrefs.addAddressHref)
  })

  it("starts on the address just added from the cart, and sends the one chosen", async () => {
    const fetched = vi.fn(async () => Response.json(placed, { status: 201 }))
    vi.stubGlobal("fetch", fetched)
    openedTab()
    const view = renderCart(false, { ...bia, addresses: [...bia.addresses, work] }, { deliverTo: "a2" })

    expect(screen.getByRole("radio", { name: /Trabalho · Recepção/ })).toBeChecked()
    fireEvent.click(screen.getByRole("radio", { name: /Casa · Bia Cliente/ }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    await waitFor(() => expect(fetched).toHaveBeenCalled())
    expect(JSON.parse(String(((fetched.mock.calls[0] as unknown[])[1] as RequestInit).body))).toMatchObject({ fulfillment: "DELIVERY", addressId: "a1" })
    view.unmount()
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
