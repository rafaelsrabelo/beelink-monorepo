// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOrderQuotePayload, CustomerProfile, OrderQuote, PublicProductDetail, StorefrontPaymentOptions } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE, decodeCart } from "@/lib/cart-cookie"
import { CartProvider } from "./cart-provider"
import { StorefrontCartLive, type StorefrontCartLiveProps } from "./storefront-cart-live"
import { TrackingContext } from "./tracking/use-track"

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn(), track: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh, push: mocks.push }) }))

const routeWords = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }

/** R$ 40,00 each: three of them split a card six ways, and one does not reach two instalments' worth past R$ 5,00 times eight. */
const blusa = {
  id: "01a0d395-c1ab-7399-a472-000000000001",
  slug: "blusa",
  name: "Blusa",
  imageUrl: null,
  soldOut: false,
  options: [],
  variants: [{ id: "01a0d395-c1ab-7399-a472-0000000000b1", optionValueIds: [], priceCents: 4000, compareAtPriceCents: null, imageUrl: null, available: true }],
} as unknown as PublicProductDetail

const address = { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: null, city: "São Paulo", state: "SP" }
/** No saved address: the order is a pick-up, whose total is closed. */
const ana: CustomerProfile = {
  id: "c1",
  name: "Ana Cliente",
  email: "ana@exemplo.com",
  cpf: "52998224725",
  birthDate: null,
  phone: "11988887777",
  address: { zipCode: null, street: null, number: null, complement: null, neighborhood: null, city: null, state: null },
  addresses: [],
  hasPassword: true,
  notifications: { orders: true, favorites: true, cashback: true, offers: false, offersChosenAt: null },
  cashback: { balanceCents: 0, pendingCents: 0 },
}
/** With one: the order is a delivery, and this shop's fee is agreed afterwards. */
const bia: CustomerProfile = { ...ana, id: "c2", address, addresses: [{ id: "a1", label: "Casa", recipientName: null, ...address, isDefault: true }] }

const ONLINE = { pix: true, card: true, maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }
const BOTH: StorefrontPaymentOptions = { online: ONLINE, offline: true }
const ONLINE_ONLY: StorefrontPaymentOptions = { online: ONLINE, offline: false }

function quoteOf(cart: CustomerOrderQuotePayload, over: Partial<OrderQuote> = {}): OrderQuote {
  const lines = cart.items.map((item) => ({ variantId: item.variantId, productId: blusa.id, quantity: item.quantity, unitPriceCents: 4000, lineTotalCents: 4000 * item.quantity, discountCents: 0, promotion: null }))
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)
  return { lines, subtotalCents, promotionDiscountCents: 0, firstPurchase: null, cashback: null, cashbackUse: null, coupon: null, couponDiscountCents: 0, manualDiscountCents: 0, discountCents: 0, deliveryFeeCents: cart.fulfillment === "PICKUP" ? 0 : null, shipping: null, totalCents: subtotalCents, ...over }
}

const placedOnline = { number: 12, status: "RECEIVED", fulfillment: "PICKUP", paymentMethod: "CREDIT_CARD", paymentChannel: "ONLINE", installments: 3, payment: null, items: [], subtotalCents: 12000, deliveryFeeCents: 0, discountCents: 0, totalCents: 12000, placedAt: "2026-10-06T12:00:00.000Z" }

type Fetched = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>

function network({ order = () => Response.json(placedOnline, { status: 201 }), quote = {} }: { order?: () => Response; quote?: Partial<OrderQuote> } = {}): Fetched {
  const fetched = vi.fn(async (url: string, init?: RequestInit) => (url.endsWith("/api/orders/quote") ? Response.json(quoteOf(JSON.parse(String(init?.body)) as CustomerOrderQuotePayload, quote)) : order()))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const ordersSent = (fetched: Fetched) => fetched.mock.calls.filter(([url]) => url === "/loja/api/orders").map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)

/** A shop's pages, where what happens is told: the events land in `mocks.track`. */
function Told({ children }: { children: ReactNode }) {
  return <TrackingContext value={{ allowed: true, track: mocks.track }}>{children}</TrackingContext>
}

function renderCart(shopper: CustomerProfile, props: Partial<StorefrontCartLiveProps> = {}, qty = 3) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CartProvider slug="loja" lines={[{ productId: blusa.id, variantId: null, qty }]}>
        <StorefrontCartLive
          slug="loja"
          products={[blusa]}
          hrefs={{ [blusa.id]: "/loja/produtos/blusa" }}
          continueHref="/loja/produtos"
          goneOnArrival={false}
          shopName="Loja"
          whatsapp="5511999998888"
          routeWords={routeWords}
          paymentMethods={["MONEY", "PIX"]}
          paymentOptions={BOTH}
          shopper={shopper}
          identityHrefs={{ signInHref: "/loja/entrar", signUpHref: "/loja/entrar?modo=criar", editHref: "/loja/conta/perfil", addAddressHref: "/loja/conta/perfil?endereco=novo" }}
          locale="pt-BR"
          messages={ptBR}
          {...props}
        />
      </CartProvider>
    </QueryClientProvider>,
    { wrapper: Told },
  )
}

/** A select's options as they read: money is written with a no-break space. */
const optionsOf = (name: string) => within(screen.getByRole("combobox", { name })).getAllByRole("option").map((option) => option.textContent?.replace(/\u00a0/g, " "))
const payNow = () => within(screen.getByRole("group", { name: "Pagar agora" }))
/** The cart is priced by the browser here: the ways wait for the total. */
const priced = () => waitFor(() => expect(optionsOf("Parcelas")[0]).toMatch(/^1x de R\$/))

beforeEach(() => {
  window.history.replaceState(null, "", "/loja/carrinho")
  network()
})

afterEach(() => {
  document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mocks.refresh.mockReset()
  mocks.push.mockReset()
  mocks.track.mockReset()
})

describe("the checkout, as it is told (BEELINK-272)", () => {
  const cart = { items: [{ productId: blusa.id, unitPriceCents: 4000, qty: 3 }], valueCents: 12000 }
  const told = (name: string) => mocks.track.mock.calls.map(([event]) => event as { name: string }).filter((event) => event.name === name)

  it("is begun by arriving with something to order — once, whatever the quantity becomes afterwards", () => {
    renderCart(ana)
    expect(told("InitiateCheckout")).toEqual([{ name: "InitiateCheckout", ...cart }])

    fireEvent.click(screen.getByRole("button", { name: /Aumentar|Adicionar mais|mais/i }))

    expect(told("InitiateCheckout")).toHaveLength(1)
    expect(told("AddToCart")).toEqual([])
  })

  it("is not begun by an empty cart", () => {
    renderCart(ana, {}, 0)

    expect(told("InitiateCheckout")).toEqual([])
  })

  it("tells the first way of paying the visitor picks, with the cart and not the way — and not a change of mind", () => {
    renderCart(ana)
    expect(told("AddPaymentInfo")).toEqual([])

    fireEvent.click(payNow().getByRole("radio", { name: /^Cartão de crédito/ }))
    expect(told("AddPaymentInfo")).toEqual([{ name: "AddPaymentInfo", ...cart }])

    fireEvent.click(payNow().getByRole("radio", { name: /^Pix/ }))
    expect(told("AddPaymentInfo")).toHaveLength(1)
  })
})

describe("the checkout of a shop that charges online (BEELINK-205)", () => {
  it("offers Pix and card to pay now beside the shop's own labels, and assumes none", () => {
    renderCart(ana)

    expect(payNow().getAllByRole("radio").map((radio) => (radio as HTMLInputElement).checked)).toEqual([false, false])
    expect(within(screen.getByRole("group", { name: "Pagar na entrega ou na retirada" })).getAllByRole("radio")).toHaveLength(2)
    expect(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" })).toBeInTheDocument()
  })

  it("splits a card up to the shop's most, each instalment at its amount, and places the order online with them — with no WhatsApp, on to the payment", async () => {
    const fetched = network()
    const opened = vi.spyOn(window, "open")
    renderCart(ana)

    fireEvent.click(payNow().getByRole("radio", { name: /^Cartão de crédito/ }))
    await priced()
    expect(optionsOf("Parcelas")).toEqual([
      "1x de R$ 120,00 (à vista)",
      "2x de R$ 60,00 sem juros",
      "3x de R$ 40,00 sem juros",
      "4x de R$ 30,00 sem juros",
      "5x de R$ 24,00 sem juros",
      "6x de R$ 20,00 sem juros",
    ])
    fireEvent.change(screen.getByRole("combobox", { name: "Parcelas" }), { target: { value: "3" } })
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido e pagar" }))

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/loja/conta/pedidos/12?pagamento=1"))
    expect(ordersSent(fetched)).toEqual([{ items: [{ variantId: blusa.variants[0]!.id, quantity: 3 }], fulfillment: "PICKUP", paymentMethod: "CREDIT_CARD", paymentChannel: "ONLINE", installments: 3 }])
    expect(opened).not.toHaveBeenCalled()
    // The cart is spent, and the screen says what is left to do, with the door should the page not move.
    expect(decodeCart(document.cookie.split("; ").find((entry) => entry.startsWith(`${CART_COOKIE}=`))?.slice(CART_COOKIE.length + 1))).toEqual([])
    expect(screen.getByRole("status")).toHaveTextContent("Pedido #12 feito!")
    expect(screen.getByRole("link", { name: "Pagar agora" })).toHaveAttribute("href", "/loja/conta/pedidos/12?pagamento=1")
  })

  it("places a Pix online with no instalments, and an order settled with the shop as it always went", async () => {
    const fetched = network()
    vi.spyOn(window, "open").mockReturnValue(null)
    const { unmount } = renderCart(ana)

    fireEvent.click(payNow().getByRole("radio", { name: /^Pix/ }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido e pagar" }))
    await waitFor(() => expect(ordersSent(fetched)).toHaveLength(1))
    expect(ordersSent(fetched)[0]).toEqual({ items: [{ variantId: blusa.variants[0]!.id, quantity: 3 }], fulfillment: "PICKUP", paymentMethod: "PIX", paymentChannel: "ONLINE" })
    unmount()

    const again = network({ order: () => Response.json({ ...placedOnline, paymentMethod: "MONEY", paymentChannel: "OFFLINE", installments: 1 }, { status: 201 }) })
    renderCart(ana)
    fireEvent.click(screen.getByRole("radio", { name: "Dinheiro" }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    await waitFor(() => expect(ordersSent(again)).toHaveLength(1))
    expect(ordersSent(again)[0]).toEqual({ items: [{ variantId: blusa.variants[0]!.id, quantity: 3 }], fulfillment: "PICKUP", paymentMethod: "MONEY" })
    expect(window.open).toHaveBeenCalled()
    expect(mocks.push).toHaveBeenCalledTimes(1)
  })

  it("holds a card's instalments to the total as the cart shrinks", async () => {
    renderCart(ana)
    fireEvent.click(payNow().getByRole("radio", { name: /^Cartão de crédito/ }))
    await priced()
    fireEvent.change(screen.getByRole("combobox", { name: "Parcelas" }), { target: { value: "6" } })

    // R$ 40,00 a piece: two of them hold the six, R$ 13,33 each.
    fireEvent.click(screen.getByRole("button", { name: "Diminuir a quantidade de Blusa" }))
    await waitFor(() => expect(optionsOf("Parcelas")).toContain("6x de R$ 13,33 sem juros"))
    expect(screen.getByRole("combobox", { name: "Parcelas" })).toHaveValue("6")
  })

  it("asks the payer's CPF when the record has none, sends nothing until it is whole, and sends it with the order", async () => {
    const fetched = network()
    renderCart({ ...ana, cpf: null })
    expect(screen.queryByLabelText("Seu CPF")).toBeNull()

    fireEvent.click(payNow().getByRole("radio", { name: /^Pix/ }))
    fireEvent.change(screen.getByLabelText("Seu CPF"), { target: { value: "529.982" } })
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido e pagar" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Para pagar online, informe um CPF válido, com 11 dígitos.")
    expect(ordersSent(fetched)).toEqual([])

    fireEvent.change(screen.getByLabelText("Seu CPF"), { target: { value: "529.982.247-25" } })
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido e pagar" }))
    await waitFor(() => expect(ordersSent(fetched)).toHaveLength(1))
    expect(ordersSent(fetched)[0]).toMatchObject({ paymentChannel: "ONLINE", paymentMethod: "PIX", recipientDocument: "52998224725" })
  })

  it("switches online off under the least charge, saying why, and leaves the shop's labels to choose", async () => {
    network({ quote: { totalCents: 499 } })
    renderCart(ana)

    await waitFor(() => expect(screen.getByText("O pagamento online vale para pedidos a partir de R$ 5,00.")).toBeInTheDocument())
    for (const radio of payNow().getAllByRole("radio")) expect(radio).toBeDisabled()
    expect(screen.getByRole("radio", { name: "Dinheiro" })).toBeEnabled()
  })

  it("says the order cannot be placed where the shop is paid online only and the total is under the least charge", async () => {
    const fetched = network({ quote: { totalCents: 499 } })
    renderCart(ana, { paymentOptions: ONLINE_ONLY })

    await waitFor(() => expect(screen.getByText(/Esta loja só recebe online, e o pagamento online vale a partir de R\$ 5,00/)).toBeInTheDocument())
    expect(screen.queryByRole("radio", { name: "Dinheiro" })).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Esta loja só recebe online")
    expect(ordersSent(fetched)).toEqual([])
  })

  it("asks nothing when the discounts cover the whole order, and settles it with the shop — even one paid online only", async () => {
    const fetched = network({ quote: { totalCents: 0, discountCents: 12000 }, order: () => Response.json({ ...placedOnline, paymentMethod: "MONEY", paymentChannel: "OFFLINE", installments: 1, totalCents: 0 }, { status: 201 }) })
    vi.spyOn(window, "open").mockReturnValue(null)
    renderCart(ana, { paymentOptions: ONLINE_ONLY })

    await waitFor(() => expect(screen.getByText("Nada a pagar: o desconto cobre o pedido inteiro.")).toBeInTheDocument())
    expect(screen.queryByRole("radio", { name: /Pix|Cartão|Dinheiro/ })).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido pelo WhatsApp" }))
    await waitFor(() => expect(ordersSent(fetched)).toHaveLength(1))
    expect(ordersSent(fetched)[0]).toEqual({ items: [{ variantId: blusa.variants[0]!.id, quantity: 3 }], fulfillment: "PICKUP", paymentMethod: "MONEY" })
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it("lets a delivery whose fee is to be agreed be paid online afterwards: warned, with no amount promised", async () => {
    const fetched = network({ order: () => Response.json({ ...placedOnline, fulfillment: "DELIVERY", deliveryFeeCents: null }, { status: 201 }) })
    renderCart(bia)

    fireEvent.click(payNow().getByRole("radio", { name: /^Cartão de crédito/ }))
    expect(await screen.findByText(/Você paga depois que a loja informar o frete/)).toBeInTheDocument()
    expect(optionsOf("Parcelas")).toEqual(["À vista", "2x sem juros", "3x sem juros", "4x sem juros", "5x sem juros", "6x sem juros"])

    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido e pagar" }))
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/loja/conta/pedidos/12?pagamento=1"))
    expect(ordersSent(fetched)[0]).toMatchObject({ fulfillment: "DELIVERY", paymentChannel: "ONLINE", paymentMethod: "CREDIT_CARD", deliveryFeeCents: null })
  })

  it.each([
    ["ORDER_PAYMENT_BELOW_MINIMUM", 409, "O valor ficou baixo demais para pagar online, ou para tantas parcelas. Escolha de novo."],
    ["ORDER_PAYER_DOCUMENT_MISSING", 400, "Para pagar online, informe um CPF válido, com 11 dígitos."],
    ["CUSTOMER_CPF_INVALID", 400, "Para pagar online, informe um CPF válido, com 11 dígitos."],
    ["ORDER_PAYMENT_NOT_ACCEPTED", 400, "A loja não aceita mais essa forma de pagamento. Escolha outra."],
  ])("says %s in the shopper's words, and goes nowhere", async (errorCode, statusCode, sentence) => {
    network({ order: () => Response.json({ statusCode, errorCode, message: "x" }, { status: statusCode }) })
    renderCart(ana)

    fireEvent.click(payNow().getByRole("radio", { name: /^Pix/ }))
    fireEvent.click(screen.getByRole("button", { name: "Fechar pedido e pagar" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(sentence)
    expect(mocks.push).not.toHaveBeenCalled()
    // The shop's ways moved under the page: it is read again.
    expect(mocks.refresh).toHaveBeenCalledTimes(errorCode === "ORDER_PAYMENT_NOT_ACCEPTED" ? 1 : 0)
  })

  it("is the checkout of before at a shop that charges nothing online", () => {
    renderCart(ana, { paymentOptions: undefined })

    expect(screen.queryByText("Pagar agora")).toBeNull()
    expect(screen.getAllByRole("radio", { name: /Dinheiro|Pix/ })).toHaveLength(2)
  })
})
