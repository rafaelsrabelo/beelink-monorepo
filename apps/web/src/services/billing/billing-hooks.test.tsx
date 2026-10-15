// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { StoreSubscription, StoreSubscriptionAnswer, SubscriptionChoice } from "@harness-monorepo/contracts"

// App
import { billingKeys } from "./billing-keys"
import { useBillingAccount, useChooseCycle, useSaveBillingAccount, useStoreSubscription, useSubscriptionCheck, type SubscriptionCheckMode } from "./billing-hooks"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const ROUTE = "/api/stores/loja/subscription"
const INVOICE = "https://sandbox.asaas.com/i/exemplo"

const trialing: StoreSubscription = {
  id: "sub-1",
  status: "TRIALING",
  trialStartedAt: "2026-10-15T14:00:00.000Z",
  trialEndsAt: "2026-10-23T03:00:00.000Z",
  trialLastDay: "2026-10-22",
  trialDaysLeft: 7,
  plan: null,
  cycle: null,
  priceCents: null,
  currentPeriodEndsAt: null,
  cancelRequestedAt: null,
  freePeriodEndsAt: null,
  paymentMethod: null,
  invoiceUrl: null,
  card: null,
  graceEndsAt: null,
  lock: null,
}
const chosen: StoreSubscription = { ...trialing, plan: { id: "p", slug: "beelink", name: "Beelink" }, cycle: "MONTHLY", priceCents: 10000, invoiceUrl: INVOICE }
const read: StoreSubscriptionAnswer = { billingEnforced: true, subscription: trialing }
const choice: SubscriptionChoice = { invoiceUrl: INVOICE, subscription: chosen }

/** A client of the test's own, so what it keeps can be looked into; nothing is retried, as nothing here fails by chance. */
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

const callsOf = (fetched: ReturnType<typeof vi.fn<Fetched>>) => fetched.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`)
const refusal = (status: number, errorCode: string) => Response.json({ statusCode: status, errorCode, message: "x" }, { status })

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "visible" })
})

describe("a page's subscription, read and chosen (BEELINK-293)", () => {
  it("reads it through the panel's own route, under the page's own key, saying it speaks JSON", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(read))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useStoreSubscription("loja"), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(read))

    expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`])
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json")
    expect(client.getQueryData(billingKeys.subscription("outra"))).toBeUndefined()
  })

  it("chooses the cycle, and keeps the answer as the page's subscription and as its first check", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "PUT" ? choice : read))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useChooseCycle("loja"), { wrapper })

    await act(() => result.current.mutateAsync({ cycle: "MONTHLY" }))

    expect(callsOf(fetched)).toEqual([`PUT ${ROUTE}`])
    expect(JSON.parse(String(fetched.mock.calls[0]?.[1]?.body))).toEqual({ cycle: "MONTHLY" })
    const kept: StoreSubscriptionAnswer = { billingEnforced: true, subscription: chosen }
    expect(client.getQueryData(billingKeys.subscription("loja"))).toEqual(kept)
    expect(client.getQueryData(billingKeys.check("loja"))).toEqual(kept)
  })

  it.each(["BILLING_SUBSCRIPTION_PAID", "BILLING_PAGE_ACTIVE", "BILLING_PAGE_EXEMPT", "BILLING_NOT_ENFORCED", "BILLING_SUBSCRIPTION_MISSING"])(
    "reads the subscription again when the choice is refused with %s: the page moved",
    async (code) => {
      const fetched = vi.fn<Fetched>(async (_url, init) => (init?.method === "PUT" ? refusal(409, code) : Response.json(read)))
      vi.stubGlobal("fetch", fetched)
      const { wrapper } = mount()
      const { result } = renderHook(() => ({ read: useStoreSubscription("loja"), choose: useChooseCycle("loja") }), { wrapper })
      await waitFor(() => expect(result.current.read.isSuccess).toBe(true))

      await act(() => result.current.choose.mutateAsync({ cycle: "MONTHLY" }).catch(() => null))

      await waitFor(() => expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`, `PUT ${ROUTE}`, `GET ${ROUTE}`]))
    },
  )

  it("reads the account again when the API says it never said who is charged", async () => {
    const fetched = vi.fn<Fetched>(async (url, init) => (init?.method === "PUT" ? refusal(409, "BILLING_ACCOUNT_REQUIRED") : Response.json({ account: null })))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ account: useBillingAccount(), choose: useChooseCycle("loja") }), { wrapper })
    await waitFor(() => expect(result.current.account.isSuccess).toBe(true))

    await act(() => result.current.choose.mutateAsync({ cycle: "MONTHLY" }).catch(() => null))

    await waitFor(() => expect(callsOf(fetched)).toEqual(["GET /api/billing/account", `PUT ${ROUTE}`, "GET /api/billing/account"]))
  })

  it("keeps who is charged, and the answer is the account as it then reads", async () => {
    const saved = { name: "Maria Souza Lima", document: "***.982.247-**", documentType: "CPF", customerReady: true }
    const fetched = vi.fn<Fetched>(async () => Response.json(saved))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useSaveBillingAccount(), { wrapper })

    await act(() => result.current.mutateAsync({ name: "Maria Souza Lima", document: "529.982.247-25" }))

    expect(callsOf(fetched)).toEqual(["PUT /api/billing/account"])
    expect(client.getQueryData(billingKeys.account())).toEqual({ account: saved })
  })

  it("does not ask for the account again where this deployment cannot charge", async () => {
    const fetched = vi.fn<Fetched>(async () => refusal(503, "BILLING_UNAVAILABLE"))
    vi.stubGlobal("fetch", fetched)
    const client = new QueryClient()
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useBillingAccount(), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetched).toHaveBeenCalledOnce()
  })
})

describe("the check, while the screen waits", () => {
  const unpaid: StoreSubscriptionAnswer = { billingEnforced: true, subscription: chosen }
  const tab = (state: "hidden" | "visible") => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state })
    window.dispatchEvent(new Event("visibilitychange"))
  }
  const pass = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)))

  function watching(initial: SubscriptionCheckMode) {
    const fetched = vi.fn<Fetched>(async () => Response.json(unpaid))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const view = renderHook(({ mode }) => useSubscriptionCheck("loja", mode), { wrapper, initialProps: { mode: initial } })
    return { fetched, client, ...view, checks: () => callsOf(fetched).filter((call) => call === `POST ${ROUTE}/check`).length }
  }

  it("asks nothing when there is nothing to learn", async () => {
    const { fetched } = watching("off")
    await act(async () => {})

    expect(fetched).not.toHaveBeenCalled()
  })

  it("asks once on arriving with an invoice out, and writes the answer where the screen reads the page", async () => {
    const { client, checks } = watching("once")

    await waitFor(() => expect(checks()).toBe(1))
    await waitFor(() => expect(client.getQueryData(billingKeys.subscription("loja"))).toEqual(unpaid))
  })

  it("asks by a clock while the tab is in sight — not before its first tick when a choice just answered — and never while it is hidden", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T15:00:00.000Z"), shouldAdvanceTime: true })
    const { client, checks, rerender } = watching("off")
    // What a choice leaves behind: its answer, which stands as the first check.
    act(() => void client.setQueryData(billingKeys.check("loja"), unpaid))

    rerender({ mode: "watch" })
    await pass(1_000)
    expect(checks()).toBe(0)

    await pass(10_000)
    expect(checks()).toBe(1)

    tab("hidden")
    await pass(60_000)
    expect(checks()).toBe(1)

    // Back to the tab: asked at once, whatever the clock says.
    tab("visible")
    await pass(1)
    expect(checks()).toBe(2)
  })

  it("stops asking by itself once the wait passed ten minutes", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T15:00:00.000Z"), shouldAdvanceTime: true })
    const { checks } = watching("watch")

    await pass(10 * 60_000)
    const asked = checks()
    await pass(5 * 60_000)

    expect(asked).toBeGreaterThan(5)
    expect(checks()).toBe(asked)
  })

  it("stops the clock at the API's limit of calls", async () => {
    vi.useFakeTimers({ now: new Date("2026-10-15T15:00:00.000Z"), shouldAdvanceTime: true })
    const fetched = vi.fn<Fetched>(async () => refusal(429, "RATE_LIMITED"))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    renderHook(() => useSubscriptionCheck("loja", "watch"), { wrapper })

    await pass(2 * 60_000)

    expect(fetched).toHaveBeenCalledOnce()
  })
})
