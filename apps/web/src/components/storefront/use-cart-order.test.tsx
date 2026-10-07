// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { TrackingContext } from "./tracking/use-track"
import { useCartOrder } from "./use-cart-order"
import { PURCHASES_COOKIE, purchasesFromCookies } from "@/lib/purchase-cookie"

// Types
import type { CustomerOrder, CustomerProfile, PlaceCustomerOrderPayload } from "@harness-monorepo/contracts"
import type { StorefrontEvent, TrackOptions } from "@/lib/storefront-event"

const router = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

const ORDER_ID = "0b9f6c1e-5a44-4a8b-9d55-3f1f1c2a7e10"
const BLUSA = "01a0d395-c1ab-7399-a472-000000000001"
const routeWords = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }
const bia = { id: "c1", name: "Bia Cliente", email: "bia@exemplo.com", phone: "11988887777" } as CustomerProfile
const payload: PlaceCustomerOrderPayload = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "PICKUP", paymentMethod: "MONEY" }

/** The order as the shop's handler answers it: two blusas, a tenth off by coupon, picked up. */
const placed = (over: Partial<CustomerOrder> = {}) =>
  ({
    id: ORDER_ID,
    number: 12,
    status: "RECEIVED",
    placedBy: "CUSTOMER",
    fulfillment: "PICKUP",
    deliveryAddress: null,
    paymentMethod: "MONEY",
    paymentChannel: "OFFLINE",
    payment: null,
    items: [{ productId: BLUSA, productName: "Blusa", variantLabel: null, unitPriceCents: 5990, quantity: 2, lineTotalCents: 11980, discountCents: 0 }],
    subtotalCents: 11980,
    deliveryFeeCents: 0,
    discountCents: 1198,
    couponDiscountCents: 1198,
    coupon: null,
    cashbackUsedCents: 0,
    totalCents: 10782,
    placedAt: new Date().toISOString(),
    ...over,
  }) as CustomerOrder

/** The cart's order hook at a shop whose visitor answered `allowed`, with what it told the shop's tracking. */
function cart(order: CustomerOrder, allowed = true) {
  vi.stubGlobal("fetch", async () => Response.json(order, { status: 201 }))
  vi.stubGlobal("open", () => null)
  const told: { event: StorefrontEvent; id: string | undefined }[] = []
  const tracking = { allowed, track: (event: StorefrontEvent, options?: TrackOptions) => allowed && told.push({ event, id: options?.id }) > 0 }
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <TrackingContext value={tracking}>{children}</TrackingContext>
    </QueryClientProvider>
  )
  const hook = renderHook(() => useCartOrder({ slug: "loja", routeWords, shopName: "Loja", whatsapp: null, shopper: bia, locale: "pt-BR", messages: ptBR }), { wrapper })
  const after = { placed: vi.fn(), refused: vi.fn() }
  const send = async () => {
    act(() => hook.result.current.send({ ...payload, paymentChannel: order.paymentChannel }, after))
    await waitFor(() => expect(after.placed).toHaveBeenCalled())
  }

  return { hook, told, send }
}

// The shop's cookies are on its path: read only from a page of the shop.
beforeEach(() => window.history.replaceState(null, "", "/loja/carrinho"))

afterEach(() => {
  vi.unstubAllGlobals()
  router.push.mockReset()
  document.cookie = `${PURCHASES_COOKIE}=; Path=/loja; Max-Age=0`
})

// BEELINK-273
describe("useCartOrder — the order placed, as a purchase", () => {
  it("tells an order settled with the shop as a purchase the moment it exists: its own id, its total, what was bought", async () => {
    const { hook, told, send } = cart(placed())
    await send()

    expect(hook.result.current.sent).toMatchObject({ number: 12, payHref: null })
    expect(told).toEqual([{ id: `purchase-${ORDER_ID}`, event: { name: "Purchase", valueCents: 10782, items: [{ productId: BLUSA, qty: 2, paidCents: 11980 }] } }])
    expect(purchasesFromCookies(document.cookie)).toEqual([ORDER_ID.replaceAll("-", "")])
  })

  it("tells it once, however often the screen that says it was sent is drawn again", async () => {
    const { hook, told, send } = cart(placed())
    await send()
    hook.rerender()
    hook.rerender()

    expect(told).toHaveLength(1)
  })

  it("tells nothing of an order charged on the site, which is no purchase until it is paid: the page goes on to its payment", async () => {
    const { told, send } = cart(placed({ paymentMethod: "PIX", paymentChannel: "ONLINE", payment: { status: "PENDING", paidAt: null } as CustomerOrder["payment"] }))
    await send()

    expect(router.push).toHaveBeenCalledExactlyOnceWith("/loja/conta/pedidos/12?pagamento=1")
    expect(told).toEqual([])
    expect(purchasesFromCookies(document.cookie)).toEqual([])
  })

  it("tells an order charged on the site with nothing to pay like one settled with the shop", async () => {
    const { told, send } = cart(placed({ paymentMethod: "PIX", paymentChannel: "ONLINE", totalCents: 0, discountCents: 11980 }))
    await send()

    expect(told).toMatchObject([{ id: `purchase-${ORDER_ID}`, event: { valueCents: 0 } }])
  })

  it("marks nothing as told for a buyer who has not said yes, so a yes given on this screen still tells it", async () => {
    const { told, send } = cart(placed(), false)
    await send()

    expect(told).toEqual([])
    expect(purchasesFromCookies(document.cookie)).toEqual([])
  })
})
