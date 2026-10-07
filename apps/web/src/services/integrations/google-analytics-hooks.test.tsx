// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { GoogleAnalyticsConnection } from "@harness-monorepo/contracts"

// App
import { useGoogleAnalyticsConnection, useRemoveGoogleAnalytics, useSaveGoogleAnalytics } from "./google-analytics-hooks"
import { integrationKeys } from "./integration-keys"
import { IntegrationError } from "./integration-requests"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

/** IDs of the right shape, and nobody's property. */
const ID = "G-AB12CD34EF"
const OTHER = "G-ZY98XW76VU"
const ROUTE = "/api/stores/loja/integrations/google-analytics"

const disconnected: GoogleAnalyticsConnection = { status: "DISCONNECTED", measurementId: null, connectedAt: null }
const connected: GoogleAnalyticsConnection = { status: "CONNECTED", measurementId: ID, connectedAt: "2026-10-07T12:00:00.000Z" }

/** A client of the test's own, so what it keeps can be looked into; nothing is retried, as nothing here fails by chance. */
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

const methodsOf = (fetched: ReturnType<typeof vi.fn<Fetched>>) => fetched.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`)

afterEach(() => vi.unstubAllGlobals())

describe("the shop's Google Analytics (BEELINK-302)", () => {
  it("reads the connection through the panel's own route, under the shop's own key — and not the pixel's", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(disconnected))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useGoogleAnalyticsConnection("loja"), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(disconnected))

    expect(methodsOf(fetched)).toEqual([`GET ${ROUTE}`])
    // `refuseCrossOrigin` answers 415 to a call that does not say it speaks JSON.
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json")
    expect(client.getQueryData(integrationKeys.googleAnalytics("loja"))).toEqual(disconnected)
    expect(client.getQueryData(integrationKeys.googleAnalytics("outra"))).toBeUndefined()
    expect(client.getQueryData(integrationKeys.metaPixel("loja"))).toBeUndefined()
  })

  /** The answer is the connection itself: the page and the list change with no second read. */
  it("saves the ID in the body, and keeps the answer as the connection", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "POST" ? connected : disconnected))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useGoogleAnalyticsConnection("loja"), save: useSaveGoogleAnalytics("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.status).toBe("DISCONNECTED"))

    act(() => result.current.save.mutate({ measurementId: ID }))
    await waitFor(() => expect(result.current.connection.data).toEqual(connected))

    expect(methodsOf(fetched)).toEqual([`GET ${ROUTE}`, `POST ${ROUTE}`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ measurementId: ID })
    expect(result.current.save.isSuccess).toBe(true)
  })

  it("replaces the ID saved with another, by the same call", async () => {
    const replaced: GoogleAnalyticsConnection = { status: "CONNECTED", measurementId: OTHER, connectedAt: "2026-10-08T09:00:00.000Z" }
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "POST" ? replaced : connected)))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useGoogleAnalyticsConnection("loja"), save: useSaveGoogleAnalytics("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.measurementId).toBe(ID))

    act(() => result.current.save.mutate({ measurementId: OTHER }))

    await waitFor(() => expect(result.current.connection.data).toEqual(replaced))
  })

  it("says the API's code for an ID it refused, and leaves the connection as it was read", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "POST" ? Response.json({ statusCode: 400, errorCode: "GOOGLE_ANALYTICS_ID_INVALID", message: "x" }, { status: 400 }) : Response.json(disconnected))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useGoogleAnalyticsConnection("loja"), save: useSaveGoogleAnalytics("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.isSuccess).toBe(true))

    act(() => result.current.save.mutate({ measurementId: "UA-12345-1" }))
    await waitFor(() => expect(result.current.save.isError).toBe(true))

    expect(result.current.save.error).toBeInstanceOf(IntegrationError)
    expect(result.current.save.error).toMatchObject({ errorCode: "GOOGLE_ANALYTICS_ID_INVALID" })
    expect(result.current.connection.data).toEqual(disconnected)
  })

  it("answers UNKNOWN for a failure that is no answer of the API's", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new TypeError("Failed to fetch"))))
    const { wrapper } = mount()
    const { result } = renderHook(() => useSaveGoogleAnalytics("loja"), { wrapper })

    act(() => result.current.mutate({ measurementId: ID }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).not.toBeInstanceOf(IntegrationError)
  })

  it("reads the connection again once the ID is removed", async () => {
    let state = connected
    const fetched = vi.fn<Fetched>(async (_url, init) => {
      if (init?.method === "DELETE") {
        state = disconnected
        return Response.json({})
      }
      return Response.json(state)
    })
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useGoogleAnalyticsConnection("loja"), remove: useRemoveGoogleAnalytics("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.status).toBe("CONNECTED"))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.connection.data).toEqual(disconnected))

    expect(methodsOf(fetched)).toEqual([`GET ${ROUTE}`, `DELETE ${ROUTE}`, `GET ${ROUTE}`])
  })

  it("keeps the connection as it was read when removing does not go through", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? Response.json({ statusCode: 503, errorCode: "UNAVAILABLE", message: "x" }, { status: 503 }) : Response.json(connected))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useGoogleAnalyticsConnection("loja"), remove: useRemoveGoogleAnalytics("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.isSuccess).toBe(true))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.remove.isError).toBe(true))

    expect(result.current.connection.data).toEqual(connected)
  })
})
