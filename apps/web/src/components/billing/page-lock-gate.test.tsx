// React
import { useEffect, type ReactNode } from "react"

// Libs
import { QueryClientProvider, useQuery, type QueryClient } from "@tanstack/react-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { PlanCatalog, StoreSubscription, StoreSubscriptionAnswer } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// Next
import { usePathname } from "next/navigation"

// App
import { makeQueryClient } from "@/components/providers"
import { pageSlugOf } from "@/lib/page-lock-view"
import { billingKeys } from "@/services/billing/billing-keys"
import { fetchPanelCounts, PanelCountsError } from "@/services/panel/panel-counts-requests"
import { PageLockGate } from "./page-lock-gate"

const mocks = vi.hoisted(() => ({ pathname: "/admin/loja/orders" }))

vi.mock("next/navigation", () => ({ usePathname: () => mocks.pathname, useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }))

const SUBSCRIPTION = "/api/stores/loja/subscription"
const SCREEN_READ = "/api/stores/loja/panel-counts"

/** A page in trial whose last day is 22/10/2026. */
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

const expired = trialing({ status: "TRIAL_EXPIRED", trialDaysLeft: 0, lock: "TRIAL_EXPIRED" })
const on = (subscription: StoreSubscription): StoreSubscriptionAnswer => ({ billingEnforced: true, subscription })
const LOCKED = { statusCode: 403, errorCode: "PAGE_LOCKED", message: "", details: { reason: "TRIAL_EXPIRED" } }

const CATALOG: PlanCatalog = {
  trialDays: 7,
  plans: [{ id: "p", slug: "beelink", name: "Beelink", cycles: [{ cycle: "MONTHLY", months: 1, priceCents: 10000 }, { cycle: "SEMIANNUAL", months: 6, priceCents: 54000 }] }],
}
const STORES = [
  { slug: "loja", name: "Loja Amora", logoUrl: null, type: "ECOMMERCE" },
  { slug: "outra", name: "Outra", logoUrl: null, type: "ECOMMERCE" },
]

type Answer = object | { status: number; body: object } | Promise<Response>

/** The BFF, stood in for by address: each answer is the next one queued for its address, the last one for good. */
function serve(answers: Record<string, Answer[]>) {
  const asked: Record<string, number> = {}
  const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) => {
    const path = url.split("?")[0]!
    const queue = answers[path]
    if (!queue) return Response.json({ statusCode: 404, errorCode: "UNEXPECTED_CALL", message: url }, { status: 404 })
    const at = asked[path] ?? 0
    asked[path] = at + 1
    const answer = queue[Math.min(at, queue.length - 1)]!
    if (answer instanceof Promise) return answer
    if ("status" in answer && "body" in answer) return Response.json(answer.body, { status: answer.status as number })
    return Response.json(answer)
  })
  vi.stubGlobal("fetch", fetched)
  return { fetched, times: (path: string) => fetched.mock.calls.filter(([url]) => url.split("?")[0] === path).length }
}

/** A deferred answer, to choose which read arrives first. */
function later() {
  let settle: (response: Response) => void = () => {}
  const answer = new Promise<Response>((resolve) => (settle = resolve))
  return { answer, json: (body: object, status = 200) => settle(Response.json(body, { status })) }
}

/** The channel, counted: how many are open now. */
const channel = { open: 0 }
function Ear() {
  useEffect(() => {
    channel.open += 1
    return () => void (channel.open -= 1)
  }, [])
  return null
}

/** A screen of the page in the address, reading through the panel's own BFF as the screens do. */
function Screen() {
  const slug = pageSlugOf(usePathname()) ?? ""
  const read = useQuery({ queryKey: ["screen", slug], queryFn: () => fetchPanelCounts(slug) })
  return <p>{read.data ? `a tela de ${slug}` : read.error ? `a tela recusada: ${read.error.message}` : "a tela lendo"}</p>
}

let client: QueryClient

function renderGate(children: ReactNode = <Screen />) {
  return render(
    <QueryClientProvider client={client}>
      <PageLockGate realtime={<Ear />} locale="pt-BR" messages={ui}>
        {children}
      </PageLockGate>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  mocks.pathname = "/admin/loja/orders"
  channel.open = 0
  client = makeQueryClient()
  client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retryDelay: 1 } })
})

afterEach(() => {
  client.clear()
  vi.unstubAllGlobals()
})

describe("PageLockGate — billing switched off (BEELINK-296)", () => {
  it("draws the screen at once and exactly as it was drawn without the gate, whatever the subscription says, and asks nothing but it", async () => {
    const { fetched } = serve({ [SUBSCRIPTION]: [{ billingEnforced: false, subscription: { ...expired, trialDaysLeft: 0 } }] })
    const { container } = renderGate(<p>a tela</p>)
    const drawn = container.innerHTML

    expect(drawn).toBe("<p>a tela</p>")
    expect(channel.open).toBe(1)
    await waitFor(() => expect(client.getQueryState(billingKeys.subscription("loja"))?.status).toBe("success"))
    expect(container.innerHTML).toBe(drawn)
    expect(channel.open).toBe(1)
    expect(fetched.mock.calls.map(([url]) => url)).toEqual([SUBSCRIPTION])
  })

  it("draws no strip for a trial's last day: off, nothing is said of a plan", async () => {
    serve({ [SUBSCRIPTION]: [{ billingEnforced: false, subscription: trialing({ trialDaysLeft: 0 }) }] })
    const { container } = renderGate(<p>a tela</p>)

    await waitFor(() => expect(client.getQueryState(billingKeys.subscription("loja"))?.status).toBe("success"))
    expect(container.innerHTML).toBe("<p>a tela</p>")
  })

  it("asks nothing at all outside a page — the dashboard", () => {
    mocks.pathname = "/dashboard"
    const { fetched } = serve({})
    renderGate(<p>o início</p>)

    expect(screen.getByText("o início")).toBeInTheDocument()
    expect(channel.open).toBe(1)
    expect(fetched).not.toHaveBeenCalled()
  })
})

describe("PageLockGate — a locked page (BEELINK-296)", () => {
  it("puts the notice in place of the screen — the reason and its day, the catalogue's prices, the way to the Assinar screen — and opens no channel", async () => {
    serve({ [SUBSCRIPTION]: [on(expired)], [SCREEN_READ]: [{ status: 403, body: LOCKED }], "/api/billing/plans": [CATALOG], "/api/stores": [STORES] })
    renderGate()

    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
    expect(screen.getByText(/terminou em 22\/10\/2026/)).toBeInTheDocument()
    expect(await screen.findByText(/^Mensal: R\$\s100,00 por mês$/)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Escolher um plano" })).toHaveAttribute("href", "/admin/loja/subscribe")
    expect(await screen.findByText("Suas outras páginas continuam funcionando normalmente.")).toBeInTheDocument()
    expect(screen.queryByText(/a tela/)).toBeNull()
    expect(channel.open).toBe(0)
  })

  it("never covers the Assinar screen, the way out, nor draws a strip over it", async () => {
    mocks.pathname = "/admin/loja/subscribe"
    serve({ [SUBSCRIPTION]: [on(expired)] })
    renderGate(<p>a tela Assinar</p>)

    await waitFor(() => expect(client.getQueryState(billingKeys.subscription("loja"))?.status).toBe("success"))
    expect(screen.getByText("a tela Assinar")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Seu teste grátis acabou" })).toBeNull()
    expect(channel.open).toBe(0)
  })

  it("puts the notice's skeleton in place of a screen whose read was refused before the subscription answered, then the notice", async () => {
    const subscription = later()
    serve({ [SUBSCRIPTION]: [subscription.answer], [SCREEN_READ]: [{ status: 403, body: LOCKED }], "/api/billing/plans": [CATALOG], "/api/stores": [STORES] })
    renderGate()

    expect(screen.getByText("a tela lendo")).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText(/a tela/)).toBeNull())
    expect(screen.getByRole("heading", { level: 1, name: "Assinatura da página" })).toHaveClass("sr-only")
    expect(channel.open).toBe(0)

    await act(async () => subscription.json(on(expired)))
    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
  })

  it("reads the subscription again, once, when a page read open has a read refused for its lock — the trial ended with the panel open", async () => {
    const screenRead = later()
    const { times } = serve({ [SUBSCRIPTION]: [on(trialing({ trialDaysLeft: 0 })), on(expired)], [SCREEN_READ]: [screenRead.answer], "/api/billing/plans": [CATALOG], "/api/stores": [STORES], "/api/billing/account": [{ account: null }] })
    renderGate()
    await waitFor(() => expect(client.getQueryState(billingKeys.subscription("loja"))?.status).toBe("success"))

    await act(async () => screenRead.json(LOCKED, 403))

    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
    expect(times(SUBSCRIPTION)).toBe(2)
  })

  it("says the subscription could not be read when a read was refused for the lock, and reads it again on asking", async () => {
    // Four failures: the read and the three tries the panel's client gives anything but a lock or an ended session.
    const failed = { status: 500, body: { statusCode: 500, errorCode: "INTERNAL", message: "" } }
    const { times } = serve({ [SUBSCRIPTION]: [failed, failed, failed, failed, on(expired)], [SCREEN_READ]: [{ status: 403, body: LOCKED }], "/api/billing/plans": [CATALOG], "/api/stores": [STORES] })
    renderGate()

    const retry = await screen.findByRole("button", { name: "Tentar de novo" }, { timeout: 3_000 })
    expect(screen.getByText("Não foi possível ler a assinatura desta página.")).toBeInTheDocument()
    const before = times(SUBSCRIPTION)
    await userEvent.click(retry)

    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
    expect(times(SUBSCRIPTION)).toBe(before + 1)
  })

  it("has a write refused for the lock read the subscription again, and the notice follows", async () => {
    const { times } = serve({ [SUBSCRIPTION]: [on(trialing()), on(expired)], [SCREEN_READ]: [{ openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }], "/api/billing/plans": [CATALOG], "/api/stores": [STORES] })
    renderGate()
    expect(await screen.findByText("a tela de loja")).toBeInTheDocument()

    await act(() => client.getMutationCache().build(client, { mutationFn: () => Promise.reject(new PanelCountsError("PAGE_LOCKED")) }).execute(undefined).catch(() => undefined))

    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
    expect(times(SUBSCRIPTION)).toBe(2)
  })
})

describe("PageLockGate — the shopkeeper's other pages (BEELINK-296)", () => {
  it("leaves another page open: moving to it from a locked one draws its screen and opens its channel", async () => {
    const counts = { openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }
    serve({ [SUBSCRIPTION]: [on(expired)], "/api/stores/outra/subscription": [on(trialing())], [SCREEN_READ]: [{ status: 403, body: LOCKED }], "/api/stores/outra/panel-counts": [counts], "/api/billing/plans": [CATALOG], "/api/stores": [STORES] })
    const { rerender } = renderGate()
    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()

    mocks.pathname = "/admin/outra/orders"
    rerender(
      <QueryClientProvider client={client}>
        <PageLockGate realtime={<Ear />} locale="pt-BR" messages={ui}>
          <Screen />
        </PageLockGate>
      </QueryClientProvider>,
    )

    expect(await screen.findByText("a tela de outra")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Seu teste grátis acabou" })).toBeNull()
    expect(channel.open).toBe(1)
  })
})

describe("PageLockGate — the way back (BEELINK-296)", () => {
  it("once the page reads paid, draws the screen again from its read refused meanwhile, and opens the channel anew", async () => {
    const counts = { openOrders: 2, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }
    const { times } = serve({ [SUBSCRIPTION]: [on(expired)], [SCREEN_READ]: [{ status: 403, body: LOCKED }, counts], "/api/billing/plans": [CATALOG], "/api/stores": [STORES] })
    renderGate()
    expect(await screen.findByRole("heading", { level: 1, name: "Seu teste grátis acabou" })).toBeInTheDocument()
    expect(channel.open).toBe(0)
    const refusedReads = times(SCREEN_READ)

    // What the Assinar screen's check writes once Asaas says the charge was paid.
    act(() => void client.setQueryData(billingKeys.subscription("loja"), on({ ...expired, status: "ACTIVE", lock: null, currentPeriodEndsAt: "2026-11-16T03:00:00.000Z" })))

    expect(await screen.findByText("a tela de loja")).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Seu teste grátis acabou" })).toBeNull()
    expect(times(SCREEN_READ)).toBe(refusedReads + 1)
    expect(channel.open).toBe(1)
  })
})

describe("PageLockGate — the strips (BEELINK-296)", () => {
  it("draws the trial's strip over the screen in its last days, leading to the Assinar screen", async () => {
    serve({ [SUBSCRIPTION]: [on(trialing({ trialDaysLeft: 1 }))], [SCREEN_READ]: [{ openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }], "/api/billing/account": [{ account: null }] })
    renderGate()

    const strip = await screen.findByRole("region", { name: "O teste grátis desta página termina amanhã, 22/10/2026." })
    expect(strip).toHaveTextContent("Nada é cobrado sozinho")
    expect(screen.getByRole("link", { name: "Escolher um plano" })).toHaveAttribute("href", "/admin/loja/subscribe")
    expect(await screen.findByText("a tela de loja")).toBeInTheDocument()
    expect(channel.open).toBe(1)
  })

  it("draws none where this deployment cannot charge — no Asaas key of bee-link's, nothing locks", async () => {
    const { times } = serve({ [SUBSCRIPTION]: [on(trialing({ trialDaysLeft: 0 }))], [SCREEN_READ]: [{ openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }], "/api/billing/account": [{ status: 503, body: { statusCode: 503, errorCode: "BILLING_UNAVAILABLE", message: "" } }] })
    renderGate()

    await waitFor(() => expect(times("/api/billing/account")).toBe(1))
    expect(await screen.findByText("a tela de loja")).toBeInTheDocument()
    expect(screen.queryByRole("region")).toBeNull()
  })

  it("draws the grace's strip for a page past due, with the last day to pay", async () => {
    const pastDue = trialing({ status: "PAST_DUE", trialDaysLeft: 0, cycle: "MONTHLY", priceCents: 5990, currentPeriodEndsAt: "2026-10-13T03:00:00.000Z", graceEndsAt: "2026-10-20T03:00:00.000Z" })
    serve({ [SUBSCRIPTION]: [on(pastDue)], [SCREEN_READ]: [{ openOrders: 0, unreadConversations: 0, unreadMessages: 0, unseenReviews: 0 }], "/api/billing/account": [{ account: null }] })
    renderGate()

    const strip = await screen.findByRole("region", { name: "A renovação desta página não foi paga" })
    expect(strip).toHaveTextContent("Pague até 19/10/2026 para a página não travar.")
    expect(screen.getByRole("link", { name: "Pagar a renovação" })).toHaveAttribute("href", "/admin/loja/subscribe")
  })
})
