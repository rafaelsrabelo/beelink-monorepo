// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderQuote, ShopOrderQuotePayload } from "@harness-monorepo/contracts"
import type { OrderCustomerOption } from "@harness-monorepo/ui/lib/order-form"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { useNewOrder } from "./use-new-order"

const mocks = vi.hoisted(() => ({ push: vi.fn(), fetchProduct: vi.fn() }))

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock("./use-delivery-to", () => ({ useDeliveryTo: () => undefined }))
vi.mock("@/services/catalog/catalog-requests", () => ({ fetchProduct: mocks.fetchProduct }))
vi.mock("@/services/catalog/catalog-hooks", () => ({
  catalogKeys: { product: (slug: string, id: string) => ["catalog", slug, "product", id] },
  useProducts: () => ({ data: undefined, isFetching: false, error: null }),
  useProduct: () => ({ data: undefined, error: null }),
}))

const bia: OrderCustomerOption = { id: "c1", name: "Bia Souza", phone: "5511988887777", email: null }
const caio: OrderCustomerOption = { id: "c2", name: "Caio Lima", phone: "5511977776666", email: null }
const whey = { id: "p1", name: "Whey", imageUrl: null, priceCents: 5000, sku: null }
const QUOTE = "/api/stores/loja/orders/quote"
const ORDERS = "/api/stores/loja/orders"

/** The sale as the API prices it here: one whey, and R$ 15,00 of Bia's credit — Caio has none. */
function quoteOf(sale: ShopOrderQuotePayload): OrderQuote {
  const balanceCents = sale.customer && "id" in sale.customer && sale.customer.id === "c1" ? 1500 : 0
  const appliedCents = sale.useCashback ? balanceCents : 0

  return {
    lines: [{ variantId: "v1", productId: "p1", quantity: 1, unitPriceCents: 5000, lineTotalCents: 5000, discountCents: 0, promotion: null }],
    subtotalCents: 5000,
    promotionDiscountCents: 0,
    firstPurchase: null,
    coupon: null,
    couponDiscountCents: 0,
    manualDiscountCents: 0,
    discountCents: 0,
    deliveryFeeCents: 0,
    totalCents: 5000 - appliedCents,
    cashback: null,
    cashbackUse: { balanceCents, maxCents: balanceCents, appliedCents, unavailable: balanceCents ? null : "NO_BALANCE" },
  }
}

type Fetched = ReturnType<typeof vi.fn<(url: string, init?: RequestInit) => Promise<Response>>>
const bodiesTo = (fetched: Fetched, path: string) => fetched.mock.calls.filter(([url]) => url === path).map(([, init]) => JSON.parse(String(init?.body)) as Record<string, unknown>)

function network(order: () => Response = () => Response.json({ number: 7 }, { status: 201 })): Fetched {
  const fetched = vi.fn(async (url: string, init?: RequestInit) => (url === QUOTE ? Response.json(quoteOf(JSON.parse(String(init?.body)) as ShopOrderQuotePayload)) : order()))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

/** The form with one whey on it and Pix chosen: all a sale needs but the press. */
async function saleFor(customer: OrderCustomerOption) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const view = renderHook(({ who }: { who: OrderCustomerOption }) => useNewOrder("loja", who, ptBR), { wrapper, initialProps: { who: customer } })

  await act(async () => view.result.current.picker.onChoose(whey))
  await waitFor(() => expect(view.result.current.lines.lines).toHaveLength(1))
  act(() => view.result.current.details.onChange({ ...view.result.current.details.value, fulfillment: "PICKUP", paymentMethod: "PIX" }))
  return view
}

beforeEach(() => {
  mocks.fetchProduct.mockResolvedValue({ id: "p1", name: "Whey", options: [], variants: [{ id: "v1", optionValueIds: [], isActive: true, priceCents: 5000, sku: null, trackStock: false, stockQuantity: null }] })
})

afterEach(() => {
  vi.unstubAllGlobals()
  mocks.push.mockReset()
})

describe("useNewOrder, with the customer's cashback (BEELINK-244)", () => {
  it("offers the chosen customer's credit unticked, prices the sale with it once ticked, and registers the order with the amount quoted", async () => {
    const fetched = network()
    const { result } = await saleFor(bia)

    await waitFor(() => expect(result.current.cashback).toMatchObject({ balanceCents: 1500, cappedCents: null, checked: false }), { timeout: 3000 })
    expect(bodiesTo(fetched, QUOTE).at(-1)).not.toHaveProperty("useCashback")
    expect(result.current.totals).toMatchObject({ totalCents: 5000 })

    act(() => result.current.cashback?.onCheckedChange(true))

    await waitFor(() => expect(result.current.totals).toMatchObject({ totalCents: 3500, cashbackUsedCents: 1500 }), { timeout: 3000 })
    expect(bodiesTo(fetched, QUOTE).at(-1)).toMatchObject({ customer: { id: "c1" }, useCashback: true })
    await waitFor(() => expect(result.current.pricing).toBe(false))

    act(() => void result.current.submit())

    await waitFor(() => expect(bodiesTo(fetched, ORDERS)).toHaveLength(1))
    expect(bodiesTo(fetched, ORDERS)[0]).toMatchObject({ customer: { id: "c1" }, cashbackCents: 1500 })
    expect(bodiesTo(fetched, ORDERS)[0]).not.toHaveProperty("useCashback")
  })

  it("sends nothing while the price with the credit is still on its way", async () => {
    const fetched = network()
    const { result } = await saleFor(bia)
    await waitFor(() => expect(result.current.cashback).not.toBeNull(), { timeout: 3000 })

    let sent = true
    act(() => {
      result.current.cashback?.onCheckedChange(true)
    })
    act(() => {
      sent = result.current.submit()
    })

    expect(sent).toBe(false)
    expect(bodiesTo(fetched, ORDERS)).toEqual([])
  })

  it("offers nothing for a customer with no credit, and unticks the box when another customer is chosen: the credit is not theirs", async () => {
    const fetched = network()
    const { result, rerender } = await saleFor(bia)
    await waitFor(() => expect(result.current.cashback).not.toBeNull(), { timeout: 3000 })
    act(() => result.current.cashback?.onCheckedChange(true))
    await waitFor(() => expect(result.current.totals).toMatchObject({ cashbackUsedCents: 1500 }), { timeout: 3000 })

    rerender({ who: caio })

    await waitFor(() => expect(bodiesTo(fetched, QUOTE).at(-1)).toMatchObject({ customer: { id: "c2" } }), { timeout: 3000 })
    expect(bodiesTo(fetched, QUOTE).at(-1)).not.toHaveProperty("useCashback")
    await waitFor(() => expect(result.current.cashback).toBeNull(), { timeout: 3000 })

    // Back to Bia: the box is there again, and unticked.
    rerender({ who: bia })
    await waitFor(() => expect(result.current.cashback).toMatchObject({ checked: false }), { timeout: 3000 })
  })

  it("prices the sale again when the order is refused over the customer's credit", async () => {
    const fetched = network(() => Response.json({ statusCode: 409, errorCode: "ORDER_CASHBACK_REFUSED", message: "x", details: { requestedCents: 1500, maxCents: 400 } }, { status: 409 }))
    const { result } = await saleFor(bia)
    await waitFor(() => expect(result.current.cashback).not.toBeNull(), { timeout: 3000 })
    act(() => result.current.cashback?.onCheckedChange(true))
    await waitFor(() => expect(result.current.totals).toMatchObject({ cashbackUsedCents: 1500 }), { timeout: 3000 })
    await waitFor(() => expect(result.current.pricing).toBe(false))
    const asked = bodiesTo(fetched, QUOTE).length

    act(() => void result.current.submit())

    await waitFor(() => expect(result.current.save.isError).toBe(true))
    await waitFor(() => expect(bodiesTo(fetched, QUOTE).length).toBeGreaterThan(asked))
  })
})
