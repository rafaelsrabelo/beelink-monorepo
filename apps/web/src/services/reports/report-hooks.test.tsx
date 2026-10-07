// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { SalesByOriginReport } from "@harness-monorepo/contracts"

// App
import { reportKeys, useSalesByOrigin } from "./report-hooks"
import { ReportRequestError } from "./report-requests"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const week = { from: "2026-09-30", to: "2026-10-06" }
const month = { from: "2026-09-07", to: "2026-10-06" }
const report: SalesByOriginReport = {
  ...week,
  rows: [{ kind: "CAMPAIGN", source: "facebook", medium: "cpc", campaign: "teste", orders: 2, metaAdOrders: 1, revenueCents: 11980 }],
  totals: { orders: 2, revenueCents: 11980 },
}

/** A client of the test's own, so what it keeps can be looked into; nothing is retried, as nothing here fails by chance. */
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

afterEach(() => vi.unstubAllGlobals())

describe("the shop's sales by origin (BEELINK-275)", () => {
  it("reads the period through the panel's own route, under the shop's and the period's own key", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(report))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useSalesByOrigin("loja", week), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(report))

    expect(fetched.mock.calls.map(([url, init]) => `${init?.method} ${url}`)).toEqual(["GET /api/stores/loja/reports/sales-by-origin?from=2026-09-30&to=2026-10-06"])
    // `refuseCrossOrigin` answers 415 to a call that does not say it speaks JSON.
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json")
    expect(client.getQueryData(reportKeys.salesByOrigin("loja", week))).toEqual(report)
    expect(client.getQueryData(reportKeys.salesByOrigin("loja", month))).toBeUndefined()
    expect(client.getQueryData(reportKeys.salesByOrigin("outra", week))).toBeUndefined()
  })

  it("reads again for another period, and shows nothing of the one it left meanwhile", async () => {
    const fetched = vi.fn<Fetched>(async (url) => Response.json({ ...report, from: new URL(url, "http://x").searchParams.get("from") }))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result, rerender } = renderHook(({ query }) => useSalesByOrigin("loja", query), { wrapper, initialProps: { query: week } })
    await waitFor(() => expect(result.current.data?.from).toBe(week.from))

    rerender({ query: month })

    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data?.from).toBe(month.from))
    expect(fetched).toHaveBeenCalledTimes(2)
  })

  it("fails with the API's code, never a sentence", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "REPORT_PERIOD_INVALID", message: "from is after to" }, { status: 400 })))
    const { wrapper } = mount()
    const { result } = renderHook(() => useSalesByOrigin("loja", week), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toBeInstanceOf(ReportRequestError)
    expect((result.current.error as ReportRequestError).errorCode).toBe("REPORT_PERIOD_INVALID")
  })

  it("asks nothing before there is a shop to ask about", () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(report))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()

    renderHook(() => useSalesByOrigin("", week), { wrapper })

    expect(fetched).not.toHaveBeenCalled()
  })
})
