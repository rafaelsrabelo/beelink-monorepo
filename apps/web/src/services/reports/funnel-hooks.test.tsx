// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { StoreFunnelReport } from "@harness-monorepo/contracts"

// App
import { reportKeys, useStoreFunnel } from "./report-hooks"
import { ReportRequestError } from "./report-requests"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const week = { from: "2026-09-30", to: "2026-10-06" }
const month = { from: "2026-09-07", to: "2026-10-06" }
const report: StoreFunnelReport = {
  ...week,
  steps: [
    { step: "PAGE_VIEW", count: 10 },
    { step: "PRODUCT_VIEW", count: 4 },
    { step: "ADD_TO_CART", count: 2 },
    { step: "CHECKOUT_START", count: 1 },
    { step: "PURCHASE", count: 1 },
  ],
  panelSales: 0,
  countingSince: "2026-10-06",
  retentionMonths: 13,
}

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

afterEach(() => vi.unstubAllGlobals())

describe("the shop's funnel (BEELINK-276)", () => {
  it("reads the period through the panel's own route, under a key of its own — never the other report's", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(report))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useStoreFunnel("loja", week), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(report))

    expect(fetched.mock.calls.map(([url, init]) => `${init?.method} ${url}`)).toEqual(["GET /api/stores/loja/reports/funnel?from=2026-09-30&to=2026-10-06"])
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json")
    expect(client.getQueryData(reportKeys.funnel("loja", week))).toEqual(report)
    expect(client.getQueryData(reportKeys.funnel("loja", month))).toBeUndefined()
    expect(client.getQueryData(reportKeys.funnel("outra", week))).toBeUndefined()
    expect(client.getQueryData(reportKeys.salesByOrigin("loja", week))).toBeUndefined()
  })

  it("reads again for another period, and shows nothing of the one it left meanwhile", async () => {
    const fetched = vi.fn<Fetched>(async (url) => Response.json({ ...report, from: new URL(url, "http://x").searchParams.get("from") }))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result, rerender } = renderHook(({ query }) => useStoreFunnel("loja", query), { wrapper, initialProps: { query: week } })
    await waitFor(() => expect(result.current.data?.from).toBe(week.from))

    rerender({ query: month })

    expect(result.current.isPending).toBe(true)
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.data?.from).toBe(month.from))
  })

  it("fails with the API's code, never a sentence", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 403, errorCode: "STORE_FORBIDDEN", message: "x" }, { status: 403 })))
    const { wrapper } = mount()
    const { result } = renderHook(() => useStoreFunnel("loja", week), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))

    expect((result.current.error as ReportRequestError).errorCode).toBe("STORE_FORBIDDEN")
  })

  it("asks nothing before there is a shop to ask about", () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(report))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()

    renderHook(() => useStoreFunnel("", week), { wrapper })

    expect(fetched).not.toHaveBeenCalled()
  })
})
