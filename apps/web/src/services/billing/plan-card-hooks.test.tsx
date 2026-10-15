// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { BillingAccountAnswer, PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// App
import { billingKeys } from "./billing-keys"
import { usePlanCard } from "./plan-card-hooks"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

/** A page in trial whose last day is 22/10/2026, with nothing paid, chosen or given. */
function trialing(overrides: Partial<StoreSubscription> = {}): StoreSubscription {
  return {
    id: "sub",
    status: "TRIALING",
    trialStartedAt: "2026-10-15T15:00:00.000Z",
    trialEndsAt: "2026-10-23T03:00:00.000Z",
    trialLastDay: "2026-10-22",
    trialDaysLeft: 7,
    plan: null,
    cycle: null,
    priceCents: null,
    currentPeriodEndsAt: null,
    cancelRequestedAt: null,
    freePeriodEndsAt: null,
    freePeriodLastDay: null,
    freePeriodDaysLeft: null,
    couponRedeemedAt: null,
    paymentMethod: null,
    invoiceUrl: null,
    card: null,
    graceEndsAt: null,
    lock: null,
    ...overrides,
  }
}

const on = (subscription: StoreSubscription | null): StoreSubscriptionAnswer => ({ billingEnforced: true, subscription })
const off = (subscription: StoreSubscription | null): StoreSubscriptionAnswer => ({ billingEnforced: false, subscription })

const CATALOG: PlanCatalog = { trialDays: 7, plans: [{ id: "p", slug: "beelink", name: "Beelink", cycles: [{ cycle: "MONTHLY", months: 1, priceCents: 10000 }] }] }
const ACCOUNT: BillingAccountAnswer = { account: null }
const SUBSCRIBE = "/admin/loja/subscribe"
const BEELINK = { id: "p", slug: "beelink", name: "Beelink" }

/** The BFF's billing routes; anything else is a call the card must not make. */
function serve(answers: { plans?: Response | Promise<Response>; account?: () => Response | Promise<Response> } = {}) {
  const fetched = vi.fn<Fetched>(async (url) => {
    if (url === "/api/billing/plans") return answers.plans ?? Response.json(CATALOG)
    if (url === "/api/billing/account") return answers.account?.() ?? Response.json(ACCOUNT)
    return Response.json({ statusCode: 404, errorCode: "UNEXPECTED_CALL", message: url }, { status: 404 })
  })
  vi.stubGlobal("fetch", fetched)
  return { fetched, asked: () => fetched.mock.calls.map(([url]) => url) }
}

let client: QueryClient

/** The card's hook over a client where the gate's reads are written by hand, as the gate would write them. */
function mount(slug: string | null = "loja") {
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(({ at }: { at: string | null }) => usePlanCard(at, "pt-BR"), { wrapper, initialProps: { at: slug } })
}

/**
 * What the gate writes once the page's subscription answers — and the observers told of it, which TanStack
 * does on a timer of its own: without the wait, a hook that should have answered null is looked at before
 * it heard anything, and passes for the wrong reason.
 */
async function answered(slug: string, answer: StoreSubscriptionAnswer) {
  await act(async () => {
    client.setQueryData(billingKeys.subscription(slug), answer)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  client.clear()
  vi.unstubAllGlobals()
})

describe("usePlanCard — where the menu has no card (BEELINK-220)", () => {
  it("asks for nothing and has no card before the page's subscription answers — not even a skeleton", () => {
    const { asked } = serve()
    const { result } = mount()

    expect(result.current).toBeNull()
    expect(asked()).toEqual([])
  })

  it("has none with billing off, whatever the row says, and asks for neither the catalogue nor the account", async () => {
    const { asked } = serve()
    const { result } = mount()

    await answered("loja", off(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" })))
    expect(result.current).toBeNull()
    await answered("loja", off(trialing({ trialDaysLeft: 0 })))
    expect(result.current).toBeNull()
    expect(asked()).toEqual([])
  })

  it("has none for a page owing nothing, one with no subscription, or away from a page", async () => {
    serve()
    const { result, rerender } = mount()

    await answered("loja", on(trialing({ status: "EXEMPT" })))
    expect(result.current).toBeNull()
    await answered("loja", on(null))
    expect(result.current).toBeNull()
    rerender({ at: null })
    expect(result.current).toBeNull()
  })

  it("never asks for the page's subscription itself: that read is the gate's", async () => {
    const { asked } = serve()
    mount()

    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(asked().filter((url) => url.includes("/subscription"))).toEqual([])
    expect(client.getQueryState(billingKeys.subscription("loja"))?.fetchStatus).toBe("idle")
  })
})

describe("usePlanCard — the card (BEELINK-220)", () => {
  it("names the plan on sale for a page that chose none — its skeleton while the catalogue is read — and leads to the Assinar screen", async () => {
    let answer!: (response: Response) => void
    const { asked } = serve({ plans: new Promise<Response>((resolve) => (answer = resolve)) })
    const { result } = mount()

    await answered("loja", on(trialing()))
    expect(result.current).toEqual({ view: null, href: SUBSCRIBE })

    answer(Response.json(CATALOG))
    await waitFor(() => expect(result.current?.view).toEqual({ plan: "Beelink", standing: { status: "TRIALING", daysLeft: 7 }, urgent: false }))
    expect(result.current?.href).toBe(SUBSCRIBE)
    expect(asked()).toEqual(["/api/billing/plans"])
  })

  it("names the plan the page chose, and asks the catalogue nothing", async () => {
    const { asked } = serve()
    const { result } = mount()

    await answered("loja", on(trialing({ status: "ACTIVE", plan: BEELINK, cycle: "MONTHLY", priceCents: 5990, currentPeriodEndsAt: "2026-11-13T03:00:00.000Z" })))
    expect(result.current?.view).toEqual({ plan: "Beelink", standing: { status: "ACTIVE", renewsOn: "12/11/2026" }, urgent: false })
    expect(asked()).toEqual([])
  })

  it("names the page's subscription when the catalogue cannot name the plan", async () => {
    serve({ plans: Response.json({ statusCode: 500, errorCode: "UNKNOWN", message: "x" }, { status: 500 }) })
    const { result } = mount()

    await answered("loja", on(trialing()))
    await waitFor(() => expect(result.current?.view).toEqual({ plan: null, standing: { status: "TRIALING", daysLeft: 7 }, urgent: false }))
  })

  it("warns of a locked page at once, asking no account", async () => {
    const { asked } = serve()
    const { result } = mount()

    await answered("loja", on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, plan: BEELINK, lock: "TRIAL_EXPIRED" })))
    expect(result.current?.view).toEqual({ plan: "Beelink", standing: { status: "LOCKED" }, urgent: true })
    expect(asked()).toEqual([])
  })

  it("warns of a trial's last days only once the account's read says the page can lock — the strip's condition", async () => {
    let answer!: (response: Response) => void
    const { asked } = serve({ account: () => new Promise<Response>((resolve) => (answer = resolve)) })
    const { result } = mount()

    await answered("loja", on(trialing({ trialDaysLeft: 1, plan: BEELINK })))
    await waitFor(() => expect(asked()).toEqual(["/api/billing/account"]))
    expect(result.current?.view).toEqual({ plan: "Beelink", standing: { status: "TRIALING", daysLeft: 1 }, urgent: false })

    answer(Response.json(ACCOUNT))
    await waitFor(() => expect(result.current?.view?.urgent).toBe(true))
  })

  it("stays quiet where bee-link has no Asaas key: nothing locks, and the account's read says so", async () => {
    serve({ account: () => Response.json({ statusCode: 503, errorCode: "BILLING_UNAVAILABLE", message: "x" }, { status: 503 }) })
    const { result } = mount()

    await answered("loja", on(trialing({ trialDaysLeft: 0, plan: BEELINK })))
    await waitFor(() => expect(client.getQueryState(billingKeys.account())?.status).toBe("error"))
    expect(result.current?.view).toEqual({ plan: "Beelink", standing: { status: "TRIALING", daysLeft: 0 }, urgent: false })
  })

  it("moves with the entry the Assinar screen, the coupon and the check write", async () => {
    serve()
    const { result } = mount()

    await answered("loja", on(trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, plan: BEELINK, lock: "TRIAL_EXPIRED" })))
    expect(result.current?.view?.standing).toEqual({ status: "LOCKED" })

    await answered("loja", on(trialing({ status: "ACTIVE", plan: BEELINK, cycle: "MONTHLY", priceCents: 5990, currentPeriodEndsAt: "2026-11-13T03:00:00.000Z" })))
    expect(result.current?.view).toEqual({ plan: "Beelink", standing: { status: "ACTIVE", renewsOn: "12/11/2026" }, urgent: false })
  })
})

describe("usePlanCard — switching pages (BEELINK-220)", () => {
  it("holds the card's place with its skeleton while the other page is read, where billing is on — never saying the last page's standing", async () => {
    serve()
    const { result, rerender } = mount()
    await answered("loja", on(trialing({ status: "ACTIVE", plan: BEELINK, currentPeriodEndsAt: "2026-11-13T03:00:00.000Z" })))
    expect(result.current?.view?.standing.status).toBe("ACTIVE")

    rerender({ at: "outra" })
    expect(result.current).toEqual({ view: null, href: "/admin/outra/subscribe" })

    await answered("outra", on(trialing({ status: "PAST_DUE", plan: BEELINK, graceEndsAt: "2026-10-20T03:00:00.000Z" })))
    expect(result.current?.view?.standing).toEqual({ status: "PAST_DUE" })
  })

  it("draws nothing while the other page is read where billing is off", async () => {
    serve()
    const { result, rerender } = mount()
    await answered("loja", off(trialing()))

    rerender({ at: "outra" })
    expect(result.current).toBeNull()
  })
})
