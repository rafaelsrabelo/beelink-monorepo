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
import { useMetaPixelConnection, useRemoveMetaPixel, useRemoveMetaPixelToken, useSaveMetaPixel, useSaveMetaPixelToken, useSendMetaPixelTestEvent } from "./meta-pixel-hooks"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

/** IDs of the right shape, and nobody's pixel. */
const ID = "123456789012345"
const OTHER = "987654321098765"
const PIXEL = "/api/stores/loja/integrations/meta-pixel"

const disconnected: MetaPixelConnection = { status: "DISCONNECTED", pixelId: null, connectedAt: null, conversions: { available: true, token: "NONE", refusal: null, refusedAt: null } }
const connected: MetaPixelConnection = { status: "CONNECTED", pixelId: ID, connectedAt: "2026-10-06T12:00:00.000Z", conversions: { available: true, token: "NONE", refusal: null, refusedAt: null } }

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
    const replaced: MetaPixelConnection = { status: "CONNECTED", pixelId: OTHER, connectedAt: "2026-10-07T09:00:00.000Z", conversions: { available: true, token: "NONE", refusal: null, refusedAt: null } }
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

describe("the pixel's Conversions API token (BEELINK-274)", () => {
  /** The shape of a token, and nobody's. */
  const TOKEN = "EAABnobodys0token0000000000000000000000"
  const withToken: MetaPixelConnection = { ...connected, conversions: { available: true, token: "SET", refusal: null, refusedAt: null } }

  it("saves the token in the body, keeps the answer as the connection — and keeps the token nowhere", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "POST" ? withToken : connected))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), token: useSaveMetaPixelToken("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.conversions.token).toBe("NONE"))

    act(() => result.current.token.save(TOKEN))
    await waitFor(() => expect(result.current.token.savedCount).toBe(1))

    expect(methodsOf(fetched)).toEqual([`GET ${PIXEL}`, `POST ${PIXEL}/token`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ accessToken: TOKEN })
    expect(result.current.connection.data).toEqual(withToken)
    expect(result.current.token).toMatchObject({ isPending: false, refusal: null })
    // The mutation that carried it is gone, variables and all; nothing the client keeps holds the token.
    await waitFor(() => expect(client.getMutationCache().getAll().every((mutation) => mutation.state.variables === undefined)).toBe(true))
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toContain(TOKEN)
  })

  it("keeps the API's code for a refusal, and nothing of what was sent, until the next try or until told to forget", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json({ statusCode: 400, errorCode: "META_PIXEL_TOKEN_INVALID", message: "x" }, { status: 400 }))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useSaveMetaPixelToken("loja"), { wrapper })

    act(() => result.current.save(TOKEN))
    await waitFor(() => expect(result.current.refusal).toBe("META_PIXEL_TOKEN_INVALID"))

    expect(result.current.savedCount).toBe(0)
    await waitFor(() => expect(client.getMutationCache().getAll().every((mutation) => mutation.state.variables === undefined)).toBe(true))
    act(() => result.current.forget())
    expect(result.current.refusal).toBeNull()
  })

  it("removes the token and reads the connection again", async () => {
    let removed = false
    const fetched = vi.fn<Fetched>(async (_url, init) => {
      if (init?.method === "DELETE") {
        removed = true
        return Response.json({})
      }
      return Response.json(removed ? connected : withToken)
    })
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), remove: useRemoveMetaPixelToken("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.conversions.token).toBe("SET"))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.connection.data?.conversions.token).toBe("NONE"))

    expect(methodsOf(fetched)).toEqual([`GET ${PIXEL}`, `DELETE ${PIXEL}/token`, `GET ${PIXEL}`])
  })

  /** Meta's answer may have changed where the token stands: refused, or taken again. */
  it("sends a test event, answers what Meta said, and reads the connection again", async () => {
    const rejected: MetaPixelConnection = { ...connected, conversions: { available: true, token: "REJECTED", refusal: "TOKEN_REJECTED", refusedAt: "2026-10-06T13:00:00.000Z" } }
    let tested = false
    const fetched = vi.fn<Fetched>(async (url) => {
      if (String(url).endsWith("/test-event")) {
        tested = true
        return Response.json({ outcome: "TOKEN_REJECTED", detail: "Meta refused (400, code 190): expired" })
      }
      return Response.json(tested ? rejected : withToken)
    })
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useMetaPixelConnection("loja"), test: useSendMetaPixelTestEvent("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.conversions.token).toBe("SET"))

    act(() => result.current.test.mutate({ testEventCode: "TEST12345" }))
    await waitFor(() => expect(result.current.connection.data?.conversions.token).toBe("REJECTED"))

    expect(result.current.test.data).toEqual({ outcome: "TOKEN_REJECTED", detail: "Meta refused (400, code 190): expired" })
    expect(methodsOf(fetched)).toEqual([`GET ${PIXEL}`, `POST ${PIXEL}/test-event`, `GET ${PIXEL}`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ testEventCode: "TEST12345" })
  })

  it("throws the API's code when a test is not made at all", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }, { status: 429 })))
    const { wrapper } = mount()
    const { result } = renderHook(() => useSendMetaPixelTestEvent("loja"), { wrapper })

    act(() => result.current.mutate({ testEventCode: "TEST12345" }))
    await waitFor(() => expect(result.current.isError).toBe(true))

    expect(result.current.error).toMatchObject({ errorCode: "RATE_LIMITED" })
  })
})
