// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOrderQuotePayload, OrderQuote, PublicProductDetail } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { CART_COOKIE, decodeCart, type CartLine } from "@/lib/cart-cookie"
import { cartQuoteOf, type ServedQuote } from "@/lib/cart-pricing"
import { cartViewOf } from "@/lib/cart-view"
import { CartProvider, useCart } from "./cart-provider"
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
const saia = "01a0d395-c1ab-7399-a472-000000000002"
/** A card's terms: up to six, none under R$ 5,00, nothing online under R$ 5,00. */
const sixTimes = { maxInstallments: 6, minimumChargeCents: 500, minimumInstallmentCents: 500 }

function cookieLines() {
  return decodeCart(
    document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${CART_COOKIE}=`))
      ?.slice(CART_COOKIE.length + 1),
  )
}

/** The blusa at its catalogue price, a tenth off under BEMVINDO10. */
function quoteOf(cart: CustomerOrderQuotePayload): OrderQuote {
  const lines = cart.items.map((item) => ({ variantId: item.variantId, productId: blusa.id, quantity: item.quantity, unitPriceCents: 5990, lineTotalCents: 5990 * item.quantity, discountCents: 0, promotion: null }))
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0)
  const applied = cart.couponCode?.trim().toUpperCase() === "BEMVINDO10"
  const couponDiscountCents = applied ? Math.ceil(subtotalCents / 10) : 0

  return {
    lines,
    subtotalCents,
    promotionDiscountCents: 0,
    firstPurchase: null,
    cashback: null,
    cashbackUse: null,
    coupon: cart.couponCode ? (applied ? { status: "APPLIED", code: "BEMVINDO10", kind: "PERCENT" } : { status: "REFUSED", code: cart.couponCode, reason: "EXPIRED" }) : null,
    couponDiscountCents,
    manualDiscountCents: 0,
    discountCents: couponDiscountCents,
    deliveryFeeCents: 0,
    shipping: null,
    totalCents: subtotalCents - couponDiscountCents,
  }
}

const twoBlusas: CartLine[] = [{ productId: blusa.id, variantId: null, qty: 2 }]

/** The price the page is served with: the cart's, as a pick-up, for a visitor. */
function servedFor(lines: readonly CartLine[]): ServedQuote {
  const cart = cartQuoteOf(cartViewOf(lines, [blusa]).rows, "PICKUP", null)
  return { shopperId: null, cart, quote: quoteOf(cart), at: Date.now() }
}

function network() {
  const fetched = vi.fn(async (_url: string, init?: RequestInit) => Response.json(quoteOf(JSON.parse(String(init?.body)) as CustomerOrderQuotePayload)))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

/** A suggestion's "Adicionar ao carrinho", as the cart's page draws it under the lines. */
function AddFromSuggestions({ productId }: { productId: string }) {
  const add = useCart((cart) => cart.add)
  return (
    <button type="button" onClick={() => add({ productId, variantId: null, qty: 1 })}>
      Adicionar ao carrinho
    </button>
  )
}

function renderCart({ lines = twoBlusas, ...props }: Partial<StorefrontCartLiveProps> & { lines?: CartLine[] } = {}) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CartProvider slug="loja" lines={lines}>
        <StorefrontCartLive
          slug="loja"
          products={[blusa]}
          askedIds={lines.map((line) => line.productId)}
          hrefs={{ [blusa.id]: "/loja/produtos/blusa" }}
          continueHref="/loja/produtos"
          checkoutHref="/loja/checkout"
          goneOnArrival={false}
          shopper={null}
          served={servedFor(lines)}
          locale="pt-BR"
          messages={ptBR}
          {...props}
        />
        <AddFromSuggestions productId={saia} />
      </CartProvider>
    </QueryClientProvider>,
  )
}

const finish = () => screen.getByRole("link", { name: "Finalizar compra" })

beforeEach(() => {
  window.history.replaceState(null, "", "/loja/carrinho")
  network()
})

afterEach(() => {
  document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mocks.refresh.mockReset()
})

describe("StorefrontCartLive — the cart's own page", () => {
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
    expect(screen.getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/loja/produtos")
    expect(cookieLines()).toEqual([])
  })

  it("leads on to the checkout's own page, says the delivery is priced there, and splits the total on a card", () => {
    renderCart({ installments: sixTimes })

    expect(finish()).toHaveAttribute("href", "/loja/checkout")
    expect(screen.getByText("Frete calculado no checkout.")).toBeInTheDocument()
    // R$ 119,80 in six: R$ 19,96 each, rounded down.
    expect(screen.getByText(/em até 6x de R\$\s19,96 sem juros/)).toBeInTheDocument()
    // Nothing of the checkout is here: who buys, where it goes and how it is paid are the next page's.
    expect(screen.queryByRole("button", { name: /Fechar pedido|Fazer pedido/ })).toBeNull()
    expect(screen.queryByRole("heading", { name: "Seus dados" })).toBeNull()
  })

  it("prices the cart as a pick-up: the delivery waits for the checkout's address", async () => {
    const fetched = network()
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Aumentar a quantidade de Blusa" }))

    await waitFor(() => expect(fetched).toHaveBeenCalled())
    const asked = JSON.parse(String(fetched.mock.calls[0]![1]?.body)) as CustomerOrderQuotePayload
    expect(asked).toEqual({ items: [{ variantId: blusa.variants[0]!.id, quantity: 3 }], fulfillment: "PICKUP" })
    expect(screen.queryByText("Entrega")).toBeNull()
  })

  it("draws the first-order banner's coupon applied, says the total is an estimate, and takes the coupon on to the checkout", async () => {
    window.history.replaceState(null, "", "/loja/carrinho?cupom=BEMVINDO10")
    renderCart({ coupon: "BEMVINDO10" })

    await waitFor(() => expect(screen.getByText("Cupom BEMVINDO10 aplicado.")).toBeInTheDocument())
    const summary = screen.getByRole("complementary")
    expect(within(summary).getByText("Total estimado")).toBeInTheDocument()
    expect(within(summary).getByText("Cupom BEMVINDO10")).toBeInTheDocument()
    expect(finish()).toHaveAttribute("href", "/loja/checkout?cupom=BEMVINDO10")

    fireEvent.click(screen.getByRole("button", { name: "Remover o cupom BEMVINDO10" }))
    expect(finish()).toHaveAttribute("href", "/loja/checkout")
  })

  it("asks a visitor for no code here — the checkout says where it goes — and keeps a signed-in shopper's field closed", () => {
    const { unmount } = renderCart()
    expect(screen.queryByLabelText("Cupom de desconto")).toBeNull()
    expect(screen.queryByText(/Tem um cupom de desconto\?/)).toBeNull()
    unmount()

    renderCart({ shopper: { id: "c1" }, served: null })
    expect(screen.queryByLabelText("Cupom de desconto")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: "Inserir cupom de desconto" }))
    expect(screen.getByLabelText("Cupom de desconto")).toHaveFocus()
  })

  it("says what brought the shopper here over the cart", () => {
    renderCart({ arrival: <p>Os itens do pedido nº 11 estão no carrinho.</p> })

    expect(screen.getByText("Os itens do pedido nº 11 estão no carrinho.")).toBeInTheDocument()
  })

  it("takes out a line whose product left the shop, and says so", () => {
    renderCart({ lines: [...twoBlusas, { productId: gone, variantId: null, qty: 1 }], goneOnArrival: true })

    expect(screen.getByRole("status")).toHaveTextContent("saiu da loja")
    expect(cookieLines()).toEqual(twoBlusas)
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it("reads the page again for a product added from the suggestions, never taking it for one that left the shop", () => {
    renderCart()

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao carrinho" }))

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
    expect(cookieLines()).toEqual([...twoBlusas, { productId: saia, variantId: null, qty: 1 }])
  })

  it("has no checkout to lead to when nothing in it can be ordered", () => {
    renderCart({ products: [{ ...blusa, soldOut: true } as PublicProductDetail], served: null })

    expect(screen.queryByRole("link", { name: "Finalizar compra" })).toBeNull()
    expect(screen.getByRole("button", { name: "Finalizar compra" })).toBeDisabled()
  })
})
