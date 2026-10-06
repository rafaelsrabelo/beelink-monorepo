// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { MetaPixelConnection } from "@harness-monorepo/contracts"

// App
import { integrationKeys } from "./integration-keys"
import { IntegrationError } from "./integration-requests"
import { useMetaPixelConnection, useRemoveMetaPixel, useSaveMetaPixel } from "./meta-pixel-hooks"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

/** IDs of the right shape, and nobody's pixel. */
const ID = "123456789012345"
const OTHER = "987654321098765"
const PIXEL = "/api/stores/loja/integrations/meta-pixel"

const disconnected: MetaPixelConnection = { status: "DISCONNECTED", pixelId: null, connectedAt: null }
const connected: MetaPixelConnection = { status: "CONNECTED", pixelId: ID, connectedAt: "2026-10-06T12:00:00.000Z" }

/** A client of the test's own, so what it keeps can be looked into; nothing is retried, as nothing here fails by chance. */
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

const methodsOf = (fetched: ReturnType<typeof vi.fn<Fetched>>) => fetched.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`)

afterEach(() => vi.unstubAllGlobals())

describe("the shop's Meta Pixel (BEELINK-270)", () => {
  it("reads the connection through the panel's own route, under the shop's own key", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(disconnected))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useMetaPixelConnection("loja"), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(disconnected))

    expect(methodsOf(fetched)).toEqual([`GET ${PIXEL}`])
    // `refuseCrossOrigin` answers 415 to a call that does not say it speaks JSON.
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json")
    expect(client.getQueryData(integrationKeys.metaPixel("loja"))).toEqual(disconnected)
    expect(client.getQueryData(integrationKeys.metaPixel("outra"))).toBeUndefined()
  })

  /** The answer is the connection itself: the page and the list change with no second read. */
  it("saves the ID in the body, and keeps the answer as the connection", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "POST" ? connected : disconnected))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), save: useSaveMetaPixel("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.status).toBe("DISCONNECTED"))

    act(() => result.current.save.mutate({ pixelId: ID }))
    await waitFor(() => expect(result.current.connection.data).toEqual(connected))

    expect(methodsOf(fetched)).toEqual([`GET ${PIXEL}`, `POST ${PIXEL}`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ pixelId: ID })
    expect(result.current.save.isSuccess).toBe(true)
  })

  it("replaces the ID saved with another, by the same call", async () => {
    const replaced: MetaPixelConnection = { status: "CONNECTED", pixelId: OTHER, connectedAt: "2026-10-07T09:00:00.000Z" }
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "POST" ? replaced : connected)))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), save: useSaveMetaPixel("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.pixelId).toBe(ID))

    act(() => result.current.save.mutate({ pixelId: OTHER }))

    await waitFor(() => expect(result.current.connection.data).toEqual(replaced))
  })

  it("says the API's code for an ID it refused, and leaves the connection as it was read", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "POST" ? Response.json({ statusCode: 400, errorCode: "META_PIXEL_ID_INVALID", message: "x" }, { status: 400 }) : Response.json(disconnected))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), save: useSaveMetaPixel("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.isSuccess).toBe(true))

    act(() => result.current.save.mutate({ pixelId: "abc" }))
    await waitFor(() => expect(result.current.save.isError).toBe(true))

    expect(result.current.save.error).toBeInstanceOf(IntegrationError)
    expect(result.current.save.error).toMatchObject({ errorCode: "META_PIXEL_ID_INVALID" })
    expect(result.current.connection.data).toEqual(disconnected)
  })

  it("answers UNKNOWN for a failure that is no answer of the API's", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new TypeError("Failed to fetch"))))
    const { wrapper } = mount()
    const { result } = renderHook(() => useSaveMetaPixel("loja"), { wrapper })

    act(() => result.current.mutate({ pixelId: ID }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).not.toBeInstanceOf(IntegrationError)
  })

  it("reads the connection again once the pixel is removed", async () => {
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
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), remove: useRemoveMetaPixel("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.status).toBe("CONNECTED"))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.connection.data).toEqual(disconnected))

    expect(methodsOf(fetched)).toEqual([`GET ${PIXEL}`, `DELETE ${PIXEL}`, `GET ${PIXEL}`])
  })

  it("keeps the connection as it was read when removing does not go through", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? Response.json({ statusCode: 503, errorCode: "UNAVAILABLE", message: "x" }, { status: 503 }) : Response.json(connected))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), remove: useRemoveMetaPixel("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.isSuccess).toBe(true))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.remove.isError).toBe(true))

    expect(result.current.connection.data).toEqual(connected)
  })
})
