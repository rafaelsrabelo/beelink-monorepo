// React
import type { ReactNode } from "react"

// Libs
import { focusManager, onlineManager, QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { PanelCounts, RealtimeEvent } from "@harness-monorepo/contracts"

// App
import { makeQueryClient } from "@/components/providers"
import { panelKeysOf } from "@/services/realtime/realtime-invalidation"
import { PANEL_COUNTS_EVERY_MS, usePanelCounts } from "./panel-counts-hooks"

const COUNTS: PanelCounts = { openOrders: 2, unreadConversations: 1, unreadMessages: 1, unseenReviews: 0 }

/** The BFF, stood in for: each call answers the next thing queued, the last one for good. */
function serve(...answers: (PanelCounts | { status: number; errorCode: string })[]) {
  let call = 0
  const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => {
    const answer = answers[Math.min(call++, answers.length - 1)]!
    return "errorCode" in answer ? Response.json({ statusCode: answer.status, errorCode: answer.errorCode, message: "" }, { status: answer.status }) : Response.json(answer)
  })
  vi.stubGlobal("fetch", fetched)
  return fetched
}

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>

/** The menu and the bell, as the shell mounts them: two readers of one shop's counts. */
const mountBoth = (slug = "loja") => renderHook(() => ({ menu: usePanelCounts(slug), bell: usePanelCounts(slug) }), { wrapper })

beforeEach(() => {
  // The panel's own client: what an ended session does is decided there, not in the hook.
  client = makeQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 1 } })
})

afterEach(() => {
  client.clear()
  focusManager.setFocused(undefined)
  onlineManager.setOnline(true)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("usePanelCounts", () => {
  it("asks once for the menu and the bell together, through the app's own handler", async () => {
    const fetched = serve(COUNTS)
    const { result } = mountBoth()

    await waitFor(() => expect(result.current.menu.data).toEqual(COUNTS))

    expect(result.current.bell.data).toEqual(COUNTS)
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(fetched.mock.calls[0]?.[0]).toBe("/api/stores/loja/panel-counts")
  })

  it("has no number while the first answer is on its way: the menu draws no badge from it", async () => {
    serve(COUNTS)
    const { result } = mountBoth()

    expect(result.current.menu.data).toBeUndefined()
    await waitFor(() => expect(result.current.menu.data).toBeDefined())
  })

  it("asks nothing with no shop, and nothing when switched off — an institutional site", () => {
    const fetched = serve(COUNTS)
    renderHook(() => usePanelCounts(""), { wrapper })
    renderHook(() => usePanelCounts("site", false), { wrapper })

    expect(fetched).not.toHaveBeenCalled()
  })

  it.each<RealtimeEvent>([
    { type: "order.created", orderNumber: 7, placedBy: "CUSTOMER" },
    { type: "order.status", orderNumber: 7, status: "ACCEPTED" },
    { type: "order.status", orderNumber: 7, status: "DELIVERED" },
    { type: "order.status", orderNumber: 7, status: "CANCELLED" },
    { type: "conversation.message", orderNumber: 7, author: "CUSTOMER" },
    { type: "conversation.read", orderNumber: 7, reader: "SHOP" },
  ])("reads again, once, when the channel tells of $type — and shows the new number with no reload", async (event) => {
    const fetched = serve(COUNTS, { ...COUNTS, openOrders: 3, unreadConversations: 0 })
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(2))

    // What `PanelRealtime` does with an event.
    await act(async () => {
      await Promise.all(panelKeysOf(event, "loja").map((queryKey) => client.invalidateQueries({ queryKey })))
    })

    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(3))
    expect(result.current.bell.data?.unreadConversations).toBe(0)
    expect(fetched).toHaveBeenCalledTimes(2)
  })

  it("is not read again by another shop's event", async () => {
    const fetched = serve(COUNTS)
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data).toBeDefined())

    await act(async () => {
      await Promise.all(panelKeysOf({ type: "order.created", orderNumber: 1, placedBy: "CUSTOMER" }, "outra").map((queryKey) => client.invalidateQueries({ queryKey })))
    })

    expect(fetched).toHaveBeenCalledTimes(1)
  })

  it("reads again when the window is looked at again, with the channel saying nothing", async () => {
    const fetched = serve(COUNTS, { ...COUNTS, openOrders: 5 })
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(2))

    act(() => focusManager.setFocused(false))
    act(() => focusManager.setFocused(true))

    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(5))
    expect(fetched).toHaveBeenCalledTimes(2)
  })

  it("reads again when the network comes back", async () => {
    const fetched = serve(COUNTS, { ...COUNTS, openOrders: 4 })
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(2))

    act(() => onlineManager.setOnline(false))
    act(() => onlineManager.setOnline(true))

    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(4))
    expect(fetched).toHaveBeenCalledTimes(2)
  })

  it("reads again on a slow clock, so the number is right with the socket down", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const fetched = serve(COUNTS, { ...COUNTS, openOrders: 6 })
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(2))

    await act(() => vi.advanceTimersByTimeAsync(PANEL_COUNTS_EVERY_MS - 1_000))
    expect(fetched).toHaveBeenCalledTimes(1)

    await act(() => vi.advanceTimersByTimeAsync(1_500))
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(6))
    expect(fetched).toHaveBeenCalledTimes(2)
  })

  /** BEELINK-169: the proxy renews a session still good, so a 401 here means it is over. */
  it("stops at an ended session: one refusal, no retry, no more clock — and the panel goes to sign in", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const assign = vi.fn()
    vi.stubGlobal("location", { ...window.location, pathname: "/admin/loja/orders", search: "", assign })
    const fetched = serve(COUNTS, { status: 401, errorCode: "AUTH_UNAUTHENTICATED" })
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(2))

    await act(() => vi.advanceTimersByTimeAsync(PANEL_COUNTS_EVERY_MS + 500))
    await waitFor(() => expect(result.current.menu.isError).toBe(true))

    expect(fetched).toHaveBeenCalledTimes(2)
    expect(assign).toHaveBeenCalledTimes(1)
    expect(assign).toHaveBeenCalledWith("/api/session/expired?voltar=%2Fadmin%2Floja%2Forders")

    // Not a stream of 401s: the clock is stopped for good.
    await act(() => vi.advanceTimersByTimeAsync(PANEL_COUNTS_EVERY_MS * 5))
    expect(fetched).toHaveBeenCalledTimes(2)
  })

  it("keeps the last number through a failure that is not the session's, and recovers on the next read", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const down = { status: 503, errorCode: "SERVICE_UNAVAILABLE" }
    // One read, then the retries of the failed one (three, the client's rule), then the clock's next.
    const fetched = serve(COUNTS, down, down, down, down, { ...COUNTS, openOrders: 9 })
    const { result } = mountBoth()
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(2))

    await act(() => vi.advanceTimersByTimeAsync(PANEL_COUNTS_EVERY_MS + 500))
    await waitFor(() => expect(result.current.menu.isError).toBe(true))
    // The badge keeps what it knew; it does not blank, and it does not go to zero.
    expect(result.current.menu.data?.openOrders).toBe(2)

    await act(() => vi.advanceTimersByTimeAsync(PANEL_COUNTS_EVERY_MS + 500))
    await waitFor(() => expect(result.current.menu.data?.openOrders).toBe(9))
    expect(result.current.menu.isError).toBe(false)
    expect(fetched).toHaveBeenCalledTimes(6)
  })
})
