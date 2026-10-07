// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { useMarkShopConversationRead, useSendShopMessage } from "@/services/conversations/shop-conversation-hooks"
import { useCreateOrder, useRefundOrder, useUpdateOrderStatus } from "@/services/orders/order-hooks"
import { useMarkShopReviewsSeen } from "@/services/reviews/shop-review-hooks"
import { panelCountsKeys } from "./panel-counts-keys"

const order = (status: string) => ({ number: 7, status, payment: null })
const conversation = { order: { number: 7 }, messages: [], unread: 0 }

vi.mock("@/services/orders/order-requests", () => ({
  updateOrderStatus: vi.fn(async (_slug: string, _number: number, status: string) => order(status)),
  refundOrder: vi.fn(async () => order("ACCEPTED")),
  createOrder: vi.fn(async () => order("ACCEPTED")),
}))
vi.mock("@/services/conversations/shop-conversation-requests", () => ({
  sendShopMessage: vi.fn(async () => conversation),
  markShopConversationRead: vi.fn(async () => conversation),
}))
vi.mock("@/services/reviews/shop-review-requests", () => ({ markShopReviewsSeen: vi.fn(async () => undefined) }))

/** A client that only records what was invalidated: the counts' own reading is the hook's test. */
function mount<T>(hook: () => T) {
  const client = new QueryClient()
  const invalidated = vi.spyOn(client, "invalidateQueries")
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const { result } = renderHook(hook, { wrapper })
  const counts = () => invalidated.mock.calls.filter(([filters]) => JSON.stringify(filters?.queryKey) === JSON.stringify(panelCountsKeys.shop("loja"))).length
  return { result, counts }
}

afterEach(() => vi.clearAllMocks())

/**
 * The panel's own writes read the menu's counts again themselves (BEELINK-309): the channel's echo
 * does it too, but a panel with the socket down — or with no channel at all — hears none.
 */
describe("what the panel does moves its menu's counts with no socket", () => {
  it.each(["ACCEPTED", "DELIVERED", "CANCELLED"] as const)("an order moved to %s", async (status) => {
    const { result, counts } = mount(() => useUpdateOrderStatus("loja", 7))

    await act(() => result.current.mutateAsync(status))

    expect(counts()).toBe(1)
  })

  it("an order cancelled with its refund — and not a refund that cancels nothing", async () => {
    const cancelled = mount(() => useRefundOrder("loja", 7))
    await act(() => cancelled.result.current.mutateAsync({ cancel: true, reason: "x", refundableCents: 100 } as never))
    expect(cancelled.counts()).toBe(1)

    const refunded = mount(() => useRefundOrder("loja", 7))
    await act(() => refunded.result.current.mutateAsync({ reason: "x", refundableCents: 100 } as never))
    expect(refunded.counts()).toBe(0)
  })

  it("an order registered in the panel", async () => {
    const { result, counts } = mount(() => useCreateOrder("loja"))

    await act(() => result.current.mutateAsync({} as never))

    expect(counts()).toBe(1)
  })

  it("a conversation read, and one answered", async () => {
    const read = mount(() => useMarkShopConversationRead("loja", 7))
    await act(() => read.result.current.mutateAsync())
    expect(read.counts()).toBe(1)

    const sent = mount(() => useSendShopMessage("loja", 7))
    await act(() => sent.result.current.mutateAsync("Oi"))
    expect(sent.counts()).toBe(1)
  })

  it("the reviews' list seen", async () => {
    const { result, counts } = mount(() => useMarkShopReviewsSeen("loja"))

    await act(() => result.current.mutateAsync({} as never))

    expect(counts()).toBe(1)
  })
})
