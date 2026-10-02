// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOrderQuotePayload, CustomerProfile, OrderQuote, PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE, decodeCart } from "@/lib/cart-cookie"
import { cartQuoteOf, firstFulfillmentOf, type ServedQuote } from "@/lib/cart-pricing"
import { cartViewOf } from "@/lib/cart-view"
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
  hasPassword: true,
  notifications: { orders: true, favorites: true, cashback: true, offers: false, offersChosenAt: null }, cashback: { balanceCents: 0, pendingCents: 0 },
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

/**
 * The cart as the API prices it here: the blusa at its catalogue price, a tenth off under BEMVINDO10,
 * and any other code expired. `over` is a promotion the test wants running.
 */
function quoteOf(cart: CustomerOrderQuotePayload, over: Partial<OrderQuote> = {}): OrderQuote {
  const lines = cart.items.map((item) => ({ variantId: item.variantId, productId: blusa.id, quantity: item.quantity, unitPriceCents: 5990, lineTotalCents: 5990 * item.quantity, discountCents: 0, promotion: null }))
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)
  const code = cart.couponCode?.trim().toUpperCase()
  const coupon: OrderQuote["coupon"] = !code ? null : code === "BEMVINDO10" ? { status: "APPLIED", code, kind: "PERCENT" } : { status: "REFUSED", code, reason: "EXPIRED" }
  const couponDiscountCents = coupon?.status === "APPLIED" ? Math.ceil(subtotalCents / 10) : 0

  return {
    lines,
    subtotalCents,
    promotionDiscountCents: 0,
    firstPurchase: null,
    cashback: null,
    cashbackUse: null,
    coupon,
    couponDiscountCents,
    manualDiscountCents: 0,
    discountCents: couponDiscountCents,
    deliveryFeeCents: cart.fulfillment === "PICKUP" ? 0 : null,
    totalCents: subtotalCents - couponDiscountCents,
    ...over,
  }
}

const cartLines = (goneOnArrival: boolean) => [{ productId: blusa.id, variantId: null, qty: 2 }, ...(goneOnArrival ? [{ productId: gone, variantId: null, qty: 1 }] : [])]

/** The price the page was served with, asked as the page asks it: this cart, before any coupon, for whoever reads it. */
function servedFor(goneOnArrival: boolean, shopper: CustomerProfile | null, over: Partial<OrderQuote> = {}): ServedQuote {
  const cart = cartQuoteOf(cartViewOf(cartLines(goneOnArrival), [blusa]).rows, firstFulfillmentOf(shopper), null)
  return { shopperId: shopper?.id ?? null, cart, quote: quoteOf(cart, over), at: Date.now() }
}

type Fetched = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>

/** The network as the page meets it: the cart's price at one address, the order at another. */
function network({
  order = () => Response.json(placed, { status: 201 }),
  quote = (cart: CustomerOrderQuotePayload) => Response.json(quoteOf(cart)),
}: { order?: () => Response; quote?: (cart: CustomerOrderQuotePayload) => Response } = {}): Fetched {
  const fetched = vi.fn(async (url: string, init?: RequestInit) => (url.endsWith("/api/orders/quote") ? quote(JSON.parse(String(init?.body)) as CustomerOrderQuotePayload) : order()))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const bodiesTo = (fetched: Fetched, path: string) => fetched.mock.calls.filter(([url]) => url === path).map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)

function cartTree(client: QueryClient, goneOnArrival: boolean, shopper: CustomerProfile | null, props: Partial<StorefrontCartLiveProps>) {
  return (
    <QueryClientProvider client={client}>
      <CartProvider slug="loja" lines={cartLines(goneOnArrival)}>
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
          served={servedFor(goneOnArrival, shopper)}
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
  // A cart that changes is priced again: every test has a network to ask, and overrides it when it cares.
  network()
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
    const fetched = network()
    const tab = openedTab()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!"))
    expect(fetched).toHaveBeenCalledWith("/loja/api/orders", expect.objectContaining({ method: "POST" }))
    // No coupon was typed: the order names none.
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([{ items: [{ variantId: blusa.variants[0]!.id, quantity: 2 }], fulfillment: "DELIVERY", paymentMethod: "PIX", addressId: "a1" }])
    // The page was served with its price: nothing asked for it again.
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([])
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
    network({ order: () => Response.json({ statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x", details }, { status: 409 }) })
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
    network({ order: () => Response.json({ statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x" }, { status: 409 }) })
    openedTab()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Blusa" }))

    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())
  })

  it("says the session ended, reads the page again and keeps saying so once it asks to sign in", async () => {
    network({ order: () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }) })
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
    network({ order: () => Response.json({ ...placed, fulfillment: "PICKUP", deliveryAddress: null }, { status: 201 }) })
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
    network({ order: () => Response.json({ ...placed, fulfillment: "PICKUP", deliveryAddress: null }, { status: 201 }) })
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
    const fetched = network()
    openedTab()
    const view = renderCart(false, { ...bia, addresses: [...bia.addresses, work] }, { deliverTo: "a2" })

    expect(screen.getByRole("radio", { name: /Trabalho · Recepção/ })).toBeChecked()
    fireEvent.click(screen.getByRole("radio", { name: /Casa · Bia Cliente/ }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))

    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).toMatchObject({ fulfillment: "DELIVERY", addressId: "a1" })
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

/** BEELINK-194: the cart is priced by the API, and a coupon is answered before the order goes out. */
describe("the cart's price and its coupon", () => {
  const variantId = blusa.variants[0]!.id
  const blusas = (quantity: number) => [{ variantId, quantity }]
  /** A tenth off the blusa, as the API would say it for two of them. */
  const promotion: Partial<OrderQuote> = {
    lines: [{ variantId, productId: blusa.id, quantity: 2, unitPriceCents: 5990, lineTotalCents: 11980, discountCents: 1198, promotion: { id: "pr1", name: "Semana da Blusa" } }],
    promotionDiscountCents: 1198,
    discountCents: 1198,
    totalCents: 10782,
  }
  const refusedOver = (cart: CustomerOrderQuotePayload, refusal: object) =>
    Response.json({ ...quoteOf({ ...cart, couponCode: undefined }), coupon: { status: "REFUSED", code: "BEMVINDO10", ...refusal } })

  const summaryRows = () =>
    [...screen.getByRole("complementary").querySelectorAll("dl > div")].map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.textContent!.replace(/\s/g, " ")])
  const placeButton = () => screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" })

  async function applyCoupon(code: string) {
    fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: code } })
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }))
  }

  it("shows what a promotion takes off on its own row and on the line it reached, from the price the page was served with", () => {
    const fetched = network()
    renderCart(false, bia, { served: servedFor(false, bia, promotion) })

    expect(summaryRows()).toEqual([
      ["Subtotal (2 itens)", "R$ 119,80"],
      ["Promoção: Semana da Blusa", "− R$ 11,98"],
      ["Total", "R$ 107,82 + frete"],
    ])
    const line = screen.getByRole("link", { name: "Blusa" }).closest("li")!
    expect(line).toHaveTextContent("Promoção: Semana da Blusa")
    expect(line.querySelector("s")!.textContent!.replace(/\s/g, " ")).toBe("De: R$ 119,80")
    expect(line).toHaveTextContent(/R\$\s107,82/)
    // In the HTML already: nothing was asked to draw it.
    expect(fetched).not.toHaveBeenCalled()
  })

  it("is the subtotal alone, as it always was, when nothing is taken off", () => {
    renderCart()

    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
  })

  it("applies a coupon, says so before the order is placed, and places the order with it", async () => {
    const fetched = network()
    openedTab()
    renderCart()

    await applyCoupon(" bemvindo10 ")

    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([{ items: blusas(2), fulfillment: "DELIVERY", couponCode: "bemvindo10" }])
    expect(summaryRows()).toEqual([
      ["Subtotal (2 itens)", "R$ 119,80"],
      ["Cupom BEMVINDO10", "− R$ 11,98"],
      ["Total", "R$ 107,82 + frete"],
    ])
    // Its chip stands in for the field, and the price just read is the one kept: nothing asked twice.
    expect(screen.queryByLabelText("Cupom de desconto")).toBeNull()
    // In the page's address, under the code as the shop stores it: a reload comes back with it, and nothing is kept in the browser.
    expect(window.location.search).toBe("?cupom=BEMVINDO10")
    expect(document.cookie).not.toContain("BEMVINDO10")

    fireEvent.click(placeButton())
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!"))
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([{ items: blusas(2), fulfillment: "DELIVERY", paymentMethod: "PIX", addressId: "a1", couponCode: "BEMVINDO10" }])
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toHaveLength(1)
    // The coupon went out with the order: the next cart starts without it.
    expect(window.location.search).toBe("")
  })

  it("says why a code is not taken, leaves the totals without it, and places the order with no coupon", async () => {
    const fetched = network()
    openedTab()
    renderCart()

    await applyCoupon("VENCIDO")

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom venceu."))
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
    // The field stays, with what was typed, to be corrected — and typing takes the refusal away.
    expect(screen.getByLabelText("Cupom de desconto")).toHaveValue("VENCIDO")
    fireEvent.change(screen.getByLabelText("Cupom de desconto"), { target: { value: "VENCID" } })
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull())

    fireEvent.click(placeButton())
    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).not.toHaveProperty("couponCode")
    // A refused code is not kept: the cart was not asked about it again.
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toHaveLength(1)
  })

  it("keeps a coupon the cart moved from under, says why, and takes it again once the cart holds it", async () => {
    // This coupon asks for R$ 100,00 in products: two blusas hold it, one does not.
    const fetched = network({ quote: (cart) => (cart.couponCode && quoteOf(cart).subtotalCents < 10000 ? refusedOver(cart, { reason: "BELOW_MINIMUM", minSubtotalCents: 10000 }) : Response.json(quoteOf(cart))) })
    openedTab()
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Blusa" }))

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom vale para compras a partir de R$ 100,00 em produtos."))
    expect(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" })).toBeInTheDocument()
    expect(screen.queryByText("Cupom BEMVINDO10 aplicado.")).toBeNull()
    expect(summaryRows()).toEqual([["Subtotal (1 item)", "R$ 59,90"]])

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    expect(summaryRows()[1]).toEqual(["Cupom BEMVINDO10", "− R$ 11,98"])
    expect(bodiesTo(fetched, "/loja/api/orders/quote").map((body) => body.couponCode)).toEqual(["BEMVINDO10", "BEMVINDO10"])
  })

  it("places the order without a coupon the screen says does not hold", async () => {
    const fetched = network({ quote: (cart) => (cart.couponCode && quoteOf(cart).subtotalCents < 10000 ? refusedOver(cart, { reason: "BELOW_MINIMUM", minSubtotalCents: 10000 }) : Response.json(quoteOf(cart))) })
    openedTab()
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Blusa" }))
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("a partir de R$ 100,00"))

    fireEvent.click(placeButton())

    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).toEqual({ items: blusas(1), fulfillment: "DELIVERY", paymentMethod: "PIX", addressId: "a1" })
  })

  it("takes a coupon off, back to the field and the totals without it", async () => {
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    fireEvent.click(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" }))

    expect(screen.getByLabelText("Cupom de desconto")).toHaveValue("")
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
  })

  it("says why an order was refused over its coupon, and prices the cart again", async () => {
    let spent = false
    network({
      order: () => {
        spent = true
        return Response.json({ statusCode: 409, errorCode: "ORDER_COUPON_REFUSED", message: "x", details: { reason: "EXHAUSTED" } }, { status: 409 })
      },
      quote: (cart) => (spent && cart.couponCode ? refusedOver(cart, { reason: "EXHAUSTED" }) : Response.json(quoteOf(cart))),
    })
    const tab = openedTab()
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    fireEvent.click(placeButton())

    await waitFor(() => expect(screen.getByText("O cupom não entrou no pedido. Esse cupom já foi usado o número máximo de vezes. Confira o total e faça o pedido de novo.")).toBeInTheDocument())
    expect(tab.close).toHaveBeenCalled()
    // The cart learns it too: its totals are the ones without the coupon, and the coupon says why.
    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]]))
    expect(screen.queryByText("Cupom BEMVINDO10 aplicado.")).toBeNull()
  })

  it("sends no order while a coupon in force could not be checked: the press asks again, and the next one orders", async () => {
    let down = false
    const fetched = network({ quote: (cart) => (down ? Response.json({ statusCode: 502, errorCode: "UNKNOWN", message: "x" }, { status: 502 }) : Response.json(quoteOf(cart))) })
    openedTab()
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    down = true
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(screen.getByText("Não foi possível conferir o cupom agora. Tente de novo.")).toBeInTheDocument())
    // Without a price from the API, the cart reads as the shelf prices it.
    expect(summaryRows()).toEqual([["Subtotal (3 itens)", "R$ 179,70"]])

    fireEvent.click(placeButton())
    await waitFor(() => expect(screen.getByText(/O cupom ainda não foi conferido\./)).toBeInTheDocument())
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([])

    down = false
    fireEvent.click(placeButton())
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    expect(screen.queryByText(/O cupom ainda não foi conferido\./)).toBeNull()
    fireEvent.click(placeButton())
    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).toMatchObject({ items: blusas(3), couponCode: "BEMVINDO10" })
  })

  it("asks for the price once after a run of presses, and follows the stepper meanwhile", async () => {
    const fetched = network()
    renderCart(false, bia, { served: servedFor(false, bia, promotion) })

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))

    // At once: the count, and the line at the catalogue's own numbers — the price kept is dimmed, not trusted.
    expect(screen.getByText(/Subtotal \(4 itens\)/)).toBeInTheDocument()
    expect(screen.getByRole("complementary").querySelector("dl")).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("link", { name: "Blusa" }).closest("li")).toHaveTextContent(/R\$\s239,60/)

    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([{ items: blusas(4), fulfillment: "DELIVERY" }]))
    await waitFor(() => expect(screen.getByRole("complementary").querySelector("dl")).not.toHaveAttribute("aria-busy"))
  })

  it("prices a pick-up as one: the total says no '+ frete'", async () => {
    const fetched = network({ quote: (cart) => Response.json(quoteOf(cart, cart.fulfillment === "PICKUP" ? { ...promotion, deliveryFeeCents: 0 } : promotion)) })
    renderCart(false, bia, { served: servedFor(false, bia, promotion) })
    expect(summaryRows()[2]).toEqual(["Total", "R$ 107,82 + frete"])

    fireEvent.click(screen.getByRole("radio", { name: "Retirar na loja" }))

    await waitFor(() => expect(summaryRows()[2]).toEqual(["Total", "R$ 107,82"]))
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([{ items: blusas(2), fulfillment: "PICKUP" }])
  })

  it("waits as a skeleton when the page came without a price, and reads as the shelf prices it when none can be asked", async () => {
    network({ quote: () => Response.json({ statusCode: 502, errorCode: "UNKNOWN", message: "x" }, { status: 502 }) })
    renderCart(false, bia, { served: null })

    const list = screen.getByRole("complementary").querySelector("dl")!
    expect(list).toHaveAttribute("aria-busy", "true")
    expect(list).not.toHaveTextContent("119,80")

    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]]))
  })

  it("offers a visitor no field, says where the code goes, and prices their cart with the shop's promotions", () => {
    renderCart(false, null, { served: servedFor(false, null, { ...promotion, deliveryFeeCents: 0 }) })

    expect(screen.queryByLabelText("Cupom de desconto")).toBeNull()
    expect(screen.getByText("Tem um cupom de desconto? Você aplica depois de entrar na sua conta.")).toBeInTheDocument()
    expect(summaryRows()).toEqual([
      ["Subtotal (2 itens)", "R$ 119,80"],
      ["Promoção: Semana da Blusa", "− R$ 11,98"],
      ["Total", "R$ 107,82"],
    ])
  })

  /** The page is served before any coupon is checked: one its address names — back from adding an address — is asked about on arrival. */
  it("checks the coupon the page's address named, showing the served price until the answer lands, and holds the order meanwhile", async () => {
    const fetched = network()
    renderCart(false, bia, { coupon: "BEMVINDO10" })

    // At once: its chip, the price the page came with — dimmed — and a button that waits.
    expect(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" })).toBeInTheDocument()
    expect(screen.queryByText("Cupom BEMVINDO10 aplicado.")).toBeNull()
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
    expect(screen.getByRole("complementary").querySelector("dl")).toHaveAttribute("aria-busy", "true")
    expect(placeButton()).toBeDisabled()

    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([{ items: blusas(2), fulfillment: "DELIVERY", couponCode: "BEMVINDO10" }])
    expect(summaryRows()[1]).toEqual(["Cupom BEMVINDO10", "− R$ 11,98"])
    expect(placeButton()).toBeEnabled()
  })

  it("says why the coupon its address named does not hold, with a way to take it off — out of the address too", async () => {
    window.history.replaceState(null, "", "/loja/carrinho?cupom=BEMVINDO10&entregar=a1")
    network({ quote: (cart) => (cart.couponCode ? refusedOver(cart, { reason: "EXPIRED" }) : Response.json(quoteOf(cart))) })
    renderCart(false, bia, { coupon: "BEMVINDO10" })

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom venceu."))
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])

    fireEvent.click(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" }))
    expect(screen.getByLabelText("Cupom de desconto")).toBeInTheDocument()
    // The rest of the address is left as it was.
    expect(window.location.search).toBe("?entregar=a1")
  })

  it("takes the coupon along on every way out of the cart that comes back to it", async () => {
    renderCart()
    const backOf = (name: string) => new URL(screen.getByRole("link", { name }).getAttribute("href")!, "http://x").searchParams.get("voltar")
    expect(backOf("Alterar dados")).toBe("/loja/carrinho")

    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    expect(backOf("Alterar dados")).toBe("/loja/carrinho?cupom=BEMVINDO10")
    expect(backOf("Entregar em outro endereço")).toBe("/loja/carrinho?cupom=BEMVINDO10")

    fireEvent.click(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" }))
    expect(backOf("Alterar dados")).toBe("/loja/carrinho")
  })

  it("leaves a visitor's coupon unchecked, and takes it along to the sign-in: it is checked once they are back", () => {
    const fetched = network()
    renderCart(false, null, { coupon: "BEMVINDO10" })

    expect(screen.queryByRole("button", { name: "Remover o cupom BEMVINDO10" })).toBeNull()
    expect(screen.getByText("Tem um cupom de desconto? Você aplica depois de entrar na sua conta.")).toBeInTheDocument()
    expect(fetched).not.toHaveBeenCalled()
    expect(new URL(screen.getByRole("link", { name: "Entrar para fazer o pedido" }).getAttribute("href")!, "http://x").searchParams.get("voltar")).toBe("/loja/carrinho?cupom=BEMVINDO10")
  })

  /** From the review: a code still being checked is a price nobody read yet, as a kept one being checked is. */
  it("holds the order while a code just typed is being checked, and then sends it with the coupon", async () => {
    let answer: (response: Response) => void = () => {}
    const fetched = network({ quote: (cart) => (cart.couponCode ? (new Promise<Response>((resolve) => (answer = resolve)) as unknown as Response) : Response.json(quoteOf(cart))) })
    openedTab()
    renderCart()

    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByRole("button", { name: "Conferindo…" })).toBeInTheDocument())
    expect(placeButton()).toBeDisabled()
    fireEvent.click(placeButton())
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([])

    answer(Response.json(quoteOf({ items: blusas(2), fulfillment: "DELIVERY", couponCode: "BEMVINDO10" })))
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    fireEvent.click(placeButton())
    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).toMatchObject({ couponCode: "BEMVINDO10" })
  })

  it("keeps saying the coupon is applied while the cart is priced again: the sentence does not blink at every press", async () => {
    let hold = false
    let answer: (response: Response) => void = () => {}
    network({ quote: (cart) => (hold ? (new Promise<Response>((resolve) => (answer = () => resolve(Response.json(quoteOf(cart))))) as unknown as Response) : Response.json(quoteOf(cart))) })
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    hold = true
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(screen.getByRole("complementary").querySelector("dl")).toHaveAttribute("aria-busy", "true"))
    // Still said, and the order still waits: the price for three is not in yet.
    expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument()
    await waitFor(() => expect(placeButton()).toBeDisabled())

    await waitFor(() => expect(answer).not.toBe(undefined))
    await new Promise((resolve) => setTimeout(resolve, 400))
    answer(new Response())
    await waitFor(() => expect(summaryRows()[1]).toEqual(["Cupom BEMVINDO10", "− R$ 17,97"]))
    expect(placeButton()).toBeEnabled()
  })

  it("stops asking about a coupon refused for good, and keeps its reason on screen", async () => {
    const fetched = network({ quote: (cart) => (cart.couponCode ? refusedOver(cart, { reason: "EXPIRED" }) : Response.json(quoteOf(cart))) })
    openedTab()
    renderCart(false, bia, { coupon: "BEMVINDO10" })
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom venceu."))

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (3 itens)", "R$ 179,70"]]))

    // One question about the code, on arrival; the cart that changed was priced without it.
    expect(bodiesTo(fetched, "/loja/api/orders/quote").map((body) => body.couponCode)).toEqual(["BEMVINDO10", undefined])
    expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom venceu.")
    expect(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" })).toBeInTheDocument()
    // And the order goes out without it, as the screen says.
    fireEvent.click(placeButton())
    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).not.toHaveProperty("couponCode")
  })

  it("does not blame the coupon for a cart the API cannot price: the order goes out, and its refusal names the line", async () => {
    let off = false
    const gone = { statusCode: 400, errorCode: "ORDER_VARIANT_INVALID", message: "x", details: { variantIds: [variantId] } }
    const fetched = network({
      quote: (cart) => (off ? Response.json(gone, { status: 400 }) : Response.json(quoteOf(cart))),
      order: () => Response.json(gone, { status: 400 }),
    })
    openedTab()
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    // The shop stops selling the blusa while the cart is open.
    off = true
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (3 itens)", "R$ 179,70"]]))
    expect(screen.queryByText(/Não foi possível conferir o cupom/)).toBeNull()
    expect(placeButton()).toBeEnabled()

    fireEvent.click(placeButton())
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Saiu de venda: Blusa."))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).toMatchObject({ couponCode: "BEMVINDO10" })
  })

  it("takes the coupon's row away when the check after a refused order could not be made", async () => {
    let refused = false
    network({
      order: () => {
        refused = true
        return Response.json({ statusCode: 409, errorCode: "ORDER_COUPON_REFUSED", message: "x", details: { reason: "EXHAUSTED" } }, { status: 409 })
      },
      quote: (cart) => (refused ? Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }, { status: 429 }) : Response.json(quoteOf(cart))),
    })
    openedTab()
    renderCart()
    await applyCoupon("BEMVINDO10")
    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())

    fireEvent.click(placeButton())

    await waitFor(() => expect(screen.getByText(/O cupom não entrou no pedido\./)).toBeInTheDocument())
    // The answer kept from before the refusal is not shown as if it still held.
    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]]))
    expect(screen.queryByText("Cupom BEMVINDO10 aplicado.")).toBeNull()
    expect(screen.getByText("Muitas tentativas de cupom. Espere alguns minutos e tente de novo.")).toBeInTheDocument()
  })

  it("prices nothing when nothing can be ordered: the totals of the cart before it are not this cart's", async () => {
    const soldOut = { ...blusa, id: "01a0d395-c1ab-7399-a472-000000000002", slug: "saia", name: "Saia", soldOut: true, variants: [{ ...blusa.variants[0]!, id: "01a0d395-c1ab-7399-a472-0000000000c1", priceCents: 9990 }] } as unknown as PublicProductDetail
    const client = new QueryClient()
    render(
      <QueryClientProvider client={client}>
        <CartProvider slug="loja" lines={[...cartLines(false), { productId: soldOut.id, variantId: null, qty: 1 }]}>
          <StorefrontCartLive
            slug="loja"
            products={[blusa, soldOut]}
            hrefs={{}}
            continueHref="/loja/produtos"
            goneOnArrival={false}
            shopName="Loja"
            whatsapp={null}
            paymentMethods={["PIX"]}
            shopper={bia}
            identityHrefs={identityHrefs}
            served={servedFor(false, bia, promotion)}
            locale="pt-BR"
            messages={ptBR}
          />
        </CartProvider>
      </QueryClientProvider>,
    )
    expect(summaryRows()[1]).toEqual(["Promoção: Semana da Blusa", "− R$ 11,98"])

    fireEvent.click(screen.getByRole("button", { name: "Remover Blusa do carrinho" }))

    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (0 itens)", "R$ 0,00"]]))
    expect(screen.getByRole("complementary").querySelector("dl")).not.toHaveAttribute("aria-busy")
  })

  it("reads the page again when the session ended while a code was typed", async () => {
    network({ quote: () => Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }) })
    renderCart()

    await applyCoupon("BEMVINDO10")

    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(screen.getByRole("alert")).toHaveTextContent("Sua sessão terminou.")
  })

  it("says so when too many codes were tried", async () => {
    network({ quote: () => Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }, { status: 429 }) })
    renderCart()

    await applyCoupon("CHUTE")

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Muitas tentativas de cupom. Espere alguns minutos e tente de novo."))
  })
})

/** BEELINK-245: a first-purchase promotion is announced in the cart, and a price is whoever asked for it. */
describe("the cart's first purchase", () => {
  const variantId = blusa.variants[0]!.id
  /** Bia, with nowhere to deliver: her cart and a visitor's are one question, a pick-up. */
  const pickup = { ...bia, addresses: [] }
  /** Boas-vindas, 15% off the first purchase, applied: Bia has never bought here. */
  const welcomed: Partial<OrderQuote> = {
    lines: [{ variantId, productId: blusa.id, quantity: 2, unitPriceCents: 5990, lineTotalCents: 11980, discountCents: 1797, promotion: { id: "pr9", name: "Boas-vindas" } }],
    promotionDiscountCents: 1797,
    discountCents: 1797,
    deliveryFeeCents: 0,
    totalCents: 10183,
  }
  const announced = (status: "UNIDENTIFIED" | "NOT_FIRST"): Partial<OrderQuote> => ({ firstPurchase: { status, promotionName: "Boas-vindas", discountCents: 1797 } })
  const summary = () => screen.getByRole("complementary")
  const summaryRows = () => [...summary().querySelectorAll("dl > div")].map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.textContent!.replace(/\s/g, " ")])

  it("tells a visitor what the first purchase takes off, and leaves it out of the total until they are identified", () => {
    renderCart(false, null, { served: servedFor(false, null, announced("UNIDENTIFIED")) })

    expect(summary()).toHaveTextContent("Boas-vindas: − R$ 17,97 na sua primeira compra. Entre na sua conta para confirmar.")
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
  })

  it("tells a customer who has bought before that it is not theirs", () => {
    renderCart(false, bia, { served: servedFor(false, bia, announced("NOT_FIRST")) })

    expect(summary()).toHaveTextContent("Boas-vindas vale só na primeira compra.")
    expect(summary()).not.toHaveTextContent("Entre na sua conta")
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
  })

  it("never shows a shopper's price to the visitor the page is read again as: the session ended under it", () => {
    const fetched = network()
    const client = new QueryClient()
    const view = render(cartTree(client, false, pickup, { served: servedFor(false, pickup, welcomed) }))
    expect(summaryRows()[1]).toEqual(["Promoção: Boas-vindas", "− R$ 17,97"])

    view.rerender(cartTree(client, false, null, { served: servedFor(false, null, announced("UNIDENTIFIED")) }))

    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])
    expect(summary()).toHaveTextContent("Entre na sua conta para confirmar.")
    expect(fetched).not.toHaveBeenCalled()
  })

  it("never shows a visitor's price to the shopper who signs in: theirs is asked for, with the skeleton meanwhile", async () => {
    const fetched = network({ quote: (cart) => Response.json(quoteOf(cart, welcomed)) })
    const client = new QueryClient()
    const view = render(cartTree(client, false, null, { served: servedFor(false, null, announced("UNIDENTIFIED")) }))
    expect(summary()).toHaveTextContent("Entre na sua conta para confirmar.")

    // Read again signed in, with no price served: the visitor's is not one to stand in for it.
    view.rerender(cartTree(client, false, pickup, { served: null }))
    expect(summary().querySelector("dl")).toHaveAttribute("aria-busy", "true")
    expect(summary()).not.toHaveTextContent("Entre na sua conta para confirmar.")

    await waitFor(() => expect(summaryRows()[1]).toEqual(["Promoção: Boas-vindas", "− R$ 17,97"]))
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([{ items: [{ variantId, quantity: 2 }], fulfillment: "PICKUP" }])
  })

  it("takes no price the page was served for somebody else as this reader's", async () => {
    const fetched = network({ quote: (cart) => Response.json(quoteOf(cart, welcomed)) })
    renderCart(false, pickup, { served: servedFor(false, null, announced("UNIDENTIFIED")) })

    expect(summary().querySelector("dl")).toHaveAttribute("aria-busy", "true")
    await waitFor(() => expect(summaryRows()[1]).toEqual(["Promoção: Boas-vindas", "− R$ 17,97"]))
    expect(summary()).not.toHaveTextContent("Entre na sua conta")
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toHaveLength(1)
  })

  it("stops asking about a first-purchase coupon a returning customer typed, and keeps its reason on screen", async () => {
    const fetched = network({
      quote: (cart) => (cart.couponCode ? Response.json({ ...quoteOf({ ...cart, couponCode: undefined }), coupon: { status: "REFUSED", code: "BEMVINDO10", reason: "NOT_FIRST_PURCHASE" } }) : Response.json(quoteOf(cart))),
    })
    renderCart(false, bia, { coupon: "BEMVINDO10" })
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom vale só na primeira compra."))

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (3 itens)", "R$ 179,70"]]))

    // No change of the cart makes it a first purchase: asked about once, on arrival.
    expect(bodiesTo(fetched, "/loja/api/orders/quote").map((body) => body.couponCode)).toEqual(["BEMVINDO10", undefined])
    expect(screen.getByRole("alert")).toHaveTextContent("Esse cupom vale só na primeira compra.")
  })
})

describe("the cart's cashback", () => {
  const variantId = blusa.variants[0]!.id
  const blusas = (quantity: number) => [{ variantId, quantity }]
  /** Bia's cart as the API prices it with her credit: R$ 15,00 to spend, the cart taking `maxCents` of it once she asks. */
  const withCredit = (cart: CustomerOrderQuotePayload, { balanceCents = 1500, maxCents = balanceCents }: { balanceCents?: number; maxCents?: number } = {}): OrderQuote => {
    const priced = quoteOf(cart)
    const appliedCents = cart.useCashback ? maxCents : 0
    return { ...priced, totalCents: priced.totalCents - appliedCents, cashbackUse: { balanceCents, maxCents, appliedCents, unavailable: null } }
  }
  const servedWithCredit = (credit?: Parameters<typeof withCredit>[1]): ServedQuote => {
    const served = servedFor(false, bia)
    return { ...served, quote: withCredit(served.cart, credit) }
  }
  // The amount is written with the no-break space a currency takes: matched as any space.
  const box = (amount = "15,00") => screen.getByRole("checkbox", { name: new RegExp(`^Usar meu cashback \\(R\\$\\s${amount} disponíveis\\)$`) })
  const summaryRows = () =>
    [...screen.getByRole("complementary").querySelectorAll("dl > div")].map((row) => [row.querySelector("dt")!.textContent, row.querySelector("dd")!.textContent!.replace(/\s/g, " ")])
  const placeButton = () => screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" })

  it("offers the shopper's credit unticked, prices the cart with it once ticked, and places the order with the amount the totals show", async () => {
    const fetched = network({ quote: (cart) => Response.json(withCredit(cart)) })
    openedTab()
    renderCart(false, bia, { served: servedWithCredit() })

    // Spending it is their choice: nothing is taken off until they ask.
    expect(box()).not.toBeChecked()
    expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]])

    fireEvent.click(box())

    await waitFor(() =>
      expect(summaryRows()).toEqual([
        ["Subtotal (2 itens)", "R$ 119,80"],
        ["Cashback usado", "− R$ 15,00"],
        ["Total", "R$ 104,80 + frete"],
      ]),
    )
    expect(bodiesTo(fetched, "/loja/api/orders/quote")).toEqual([{ items: blusas(2), fulfillment: "DELIVERY", useCashback: true }])

    fireEvent.click(placeButton())
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!"))
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([{ items: blusas(2), fulfillment: "DELIVERY", paymentMethod: "PIX", addressId: "a1", cashbackCents: 1500 }])
  })

  it("says how much this cart takes when it is less than the balance, and sends that much", async () => {
    const fetched = network({ quote: (cart) => Response.json(withCredit(cart, { maxCents: 900 })) })
    openedTab()
    renderCart(false, bia, { served: servedWithCredit({ maxCents: 900 }) })

    fireEvent.click(box())

    await waitFor(() => expect(summaryRows()).toContainEqual(["Cashback usado", "− R$ 9,00"]))
    expect(screen.getByText(/^Este pedido aceita até R\$\s9,00 de cashback\. O resto continua no seu saldo\.$/)).toBeInTheDocument()

    fireEvent.click(placeButton())
    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).toMatchObject({ cashbackCents: 900 })
  })

  it("holds the order while the price with the credit is asked, and sends none it did not read", async () => {
    let answer: (response: Response) => void = () => {}
    const fetched = network({ quote: (cart) => (cart.useCashback ? (new Promise<Response>((resolve) => (answer = resolve)) as unknown as Response) : Response.json(withCredit(cart))) })
    openedTab()
    renderCart(false, bia, { served: servedWithCredit() })

    fireEvent.click(box())
    await waitFor(() => expect(placeButton()).toBeDisabled())
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([])

    answer(Response.json(withCredit({ items: blusas(2), fulfillment: "DELIVERY", useCashback: true })))
    await waitFor(() => expect(placeButton()).toBeEnabled())
    expect(summaryRows()).toContainEqual(["Cashback usado", "− R$ 15,00"])
  })

  it("unticked again, takes the credit out of the totals and of the order", async () => {
    const fetched = network({ quote: (cart) => Response.json(withCredit(cart)) })
    openedTab()
    renderCart(false, bia, { served: servedWithCredit() })
    fireEvent.click(box())
    await waitFor(() => expect(summaryRows()).toContainEqual(["Cashback usado", "− R$ 15,00"]))

    fireEvent.click(box())
    await waitFor(() => expect(summaryRows()).toEqual([["Subtotal (2 itens)", "R$ 119,80"]]))

    fireEvent.click(placeButton())
    await waitFor(() => expect(bodiesTo(fetched, "/loja/api/orders")).toHaveLength(1))
    expect(bodiesTo(fetched, "/loja/api/orders")[0]).not.toHaveProperty("cashbackCents")
  })

  it("says the balance moved when the order is refused over it, and prices the cart again with what is left", async () => {
    let left = 1500
    network({
      order: () => {
        left = 400
        return Response.json({ statusCode: 409, errorCode: "ORDER_CASHBACK_REFUSED", message: "x", details: { requestedCents: 1500, maxCents: 400 } }, { status: 409 })
      },
      quote: (cart) => Response.json(withCredit(cart, { balanceCents: left })),
    })
    const tab = openedTab()
    renderCart(false, bia, { served: servedWithCredit() })
    fireEvent.click(box())
    await waitFor(() => expect(summaryRows()).toContainEqual(["Cashback usado", "− R$ 15,00"]))

    fireEvent.click(placeButton())

    await waitFor(() => expect(screen.getByText("Seu saldo de cashback mudou e o pedido não foi feito. Atualizamos o valor: confira o total e faça o pedido de novo.")).toBeInTheDocument())
    expect(tab.close).toHaveBeenCalled()
    await waitFor(() => expect(summaryRows()).toContainEqual(["Cashback usado", "− R$ 4,00"]))
    expect(box("4,00")).toBeChecked()
  })

  it("sends no order while the price with the credit could not be read: the press asks again, and says what to do", async () => {
    let down = false
    const fetched = network({ quote: (cart) => (down ? Response.json({ statusCode: 502, errorCode: "UNKNOWN", message: "x" }, { status: 502 }) : Response.json(withCredit(cart))) })
    openedTab()
    renderCart(false, bia, { served: servedWithCredit() })
    fireEvent.click(box())
    await waitFor(() => expect(summaryRows()).toContainEqual(["Cashback usado", "− R$ 15,00"]))

    down = true
    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))
    await waitFor(() => expect(placeButton()).toBeEnabled())
    fireEvent.click(placeButton())

    await waitFor(() => expect(screen.getByText(/O cashback ainda não foi conferido\./)).toBeInTheDocument())
    expect(bodiesTo(fetched, "/loja/api/orders")).toEqual([])
  })

  it("offers nothing to a visitor, nor to a shopper with no credit to spend", () => {
    const { unmount } = renderCart(false, null)
    expect(screen.queryByRole("checkbox")).toBeNull()
    unmount()

    renderCart(false, bia, { served: { ...servedFor(false, bia), quote: { ...servedFor(false, bia).quote, cashbackUse: { balanceCents: 0, maxCents: 0, appliedCents: 0, unavailable: "NO_BALANCE" } } } })
    expect(screen.queryByRole("checkbox")).toBeNull()
  })

  it("keeps the box off, and says why, on a cart the discounts took to nothing", () => {
    const served = servedFor(false, bia)
    renderCart(false, bia, { served: { ...served, quote: { ...served.quote, cashbackUse: { balanceCents: 1500, maxCents: 0, appliedCents: 0, unavailable: "NOTHING_TO_PAY" } } } })

    expect(box()).toBeDisabled()
    expect(screen.getByText("Não sobra valor de produtos neste pedido para pagar com cashback.")).toBeInTheDocument()
  })
})
