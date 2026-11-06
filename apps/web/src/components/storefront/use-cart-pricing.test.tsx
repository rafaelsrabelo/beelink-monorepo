// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderQuote } from "@harness-monorepo/contracts"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import type { CartRow, CartView } from "@/lib/cart-view"

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
const { useCartPricing } = await import("./use-cart-pricing")

const row = { productId: "p1", variantId: null, orderVariantId: "v1", name: "Dindin de coco", slug: "dindin-de-coco", variantLabel: null, imageUrl: null, unitPriceCents: 1000, compareAtPriceCents: null, qty: 2, lineTotalCents: 2000, available: true } as CartRow
const view = { rows: [row], gone: [], subtotalCents: 2000, count: 2 } as CartView
const quote = (over: Partial<OrderQuote>) =>
  ({ lines: [], subtotalCents: 2000, promotionDiscountCents: 0, firstPurchase: null, coupon: null, couponDiscountCents: 0, manualDiscountCents: 0, discountCents: 0, deliveryFeeCents: null, totalCents: 2000, ...over }) as OrderQuote

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
}

function visitorCart(arrivedWith: string | null) {
  return renderHook(
    () => useCartPricing({ slug: "loja", view, fulfillment: "PICKUP", addressId: null, shipping: null, shopperId: null, served: null, arrivedWith, locale: "pt-BR", messages: ptBR }),
    { wrapper },
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// The first-order banner leads a visitor to the cart with its coupon: applied there, with no sign-in.
describe("useCartPricing — a visitor's cart with the banner's coupon", () => {
  it("asks for the price with the coupon the address carried, and draws it applied once the API took it", async () => {
    const fetched = vi.fn(async () => Response.json(quote({ coupon: { status: "APPLIED", code: "PRIMEIRA10", kind: "PERCENT", percentBps: 1000, amountCents: null }, couponDiscountCents: 200, totalCents: 1800 } as Partial<OrderQuote>)))
    vi.stubGlobal("fetch", fetched)

    const { result } = visitorCart("PRIMEIRA10")

    await waitFor(() => expect(result.current.coupon.holding).toBe(true))
    expect(result.current.coupon.applied).toBe("PRIMEIRA10")
    expect(result.current.orderCoupon).toBe("PRIMEIRA10")
    const [, init] = fetched.mock.calls[0] as unknown as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toMatchObject({ couponCode: "PRIMEIRA10" })
  })

  it("does not draw as applied a code the public door did not look at — it waits for whoever is buying", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(quote({ coupon: null }))))

    const { result } = visitorCart("SEGREDO20")

    await waitFor(() => expect(result.current.pricing).toBe(false))
    await waitFor(() => expect(result.current.coupon.applied).toBeNull())
    expect(result.current.orderCoupon).toBeNull()
    // Still in the address, for the checkout to ask about once they say who is buying.
    expect(result.current.carried).toBe("SEGREDO20")
  })
})
