// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { OrderPaymentStatus } from "@harness-monorepo/contracts"

// App
import { PAYMENT_POLL_MS } from "@/lib/order-payment-view"
import { OrderPaymentWatch } from "./order-payment-watch"

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

const NOW = new Date("2026-10-06T15:00:00.000Z")
const LATER = "2026-10-08T02:59:59.999Z"
const charge = (status: OrderPaymentStatus) => ({ payment: { status, method: "PIX", installments: 1, amountCents: 5990, refundedCents: 0, expiresAt: LATER, paidAt: null, pix: status === "PENDING" ? { payload: "000201", image: "aGk=", expiresAt: LATER } : null, invoiceUrl: null } })

/** The shop's payment handler, answering each read in turn and the last one for good. */
function handler(answers: object[]) {
  let reads = 0
  vi.stubGlobal("fetch", async () => {
    const body = answers[Math.min(reads, answers.length - 1)]
    reads += 1
    return { ok: true, status: 200, json: async () => body } as Response
  })
  return { reads: () => reads }
}

function renderWatch(status: OrderPaymentStatus | null, order = { cancelled: false, awaitingTotal: false }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <OrderPaymentWatch slug="loja" number={14} status={status} order={order} />
    </QueryClientProvider>,
  )
}

const pass = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
    for (let turn = 0; turn < 4; turn += 1) await vi.advanceTimersByTimeAsync(1)
  })

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  router.refresh.mockReset()
})

describe("OrderPaymentWatch — the order's page following its payment", () => {
  it("draws nothing, and leaves the page alone while the charge is what the page says", async () => {
    const shop = handler([charge("PENDING")])
    const { container } = renderWatch("PENDING")
    await pass(0)

    expect(container).toBeEmptyDOMElement()
    expect(shop.reads()).toBe(1)
    expect(router.refresh).not.toHaveBeenCalled()
  })

  it("reads the charge again while it waits for money, half as often as the payment screen", async () => {
    const shop = handler([charge("PENDING")])
    renderWatch("PENDING")
    await pass(0)

    await pass(PAYMENT_POLL_MS)
    expect(shop.reads()).toBe(1)
    await pass(PAYMENT_POLL_MS)
    expect(shop.reads()).toBe(2)
  })

  it("reads the page again, once, the moment the charge is paid — and stops asking", async () => {
    const shop = handler([charge("PENDING"), charge("RECEIVED")])
    renderWatch("PENDING")
    await pass(0)
    expect(router.refresh).not.toHaveBeenCalled()

    await pass(PAYMENT_POLL_MS * 2)
    expect(router.refresh).toHaveBeenCalledTimes(1)

    await pass(PAYMENT_POLL_MS * 6)
    expect(shop.reads()).toBe(2)
    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it("reads the page again when a charge appears on an order drawn with none", async () => {
    handler([charge("PENDING")])
    renderWatch(null)
    await pass(0)

    expect(router.refresh).toHaveBeenCalledTimes(1)
  })

  it("asks once and no more while the wait is on the shop for the delivery fee", async () => {
    const shop = handler([{ payment: null }])
    renderWatch(null, { cancelled: false, awaitingTotal: true })
    await pass(PAYMENT_POLL_MS * 6)

    expect(shop.reads()).toBe(1)
    expect(router.refresh).not.toHaveBeenCalled()
  })
})
