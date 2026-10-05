// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { AsaasConnection, AsaasSettings } from "@harness-monorepo/contracts"

// App
import { useAsaasConnection, useAsaasSettings, useConnectAsaas, useDisconnectAsaas, useSaveAsaasSettings } from "./asaas-hooks"
import { integrationKeys } from "./integration-keys"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

/** Typed by the tests, and nobody's key. */
const KEY = "$aact_hmlg_chave-de-teste"
const CONNECTION = "/api/stores/loja/integrations/asaas"

const disconnected: AsaasConnection = { available: true, environment: "SANDBOX", status: "DISCONNECTED", account: null, webhook: null, connectedAt: null }
const connected: AsaasConnection = { ...disconnected, status: "CONNECTED", account: { name: "Lessari Moda LTDA", document: "**.222.333/0001-**" }, webhook: "SKIPPED", connectedAt: "2026-10-05T12:00:00.000Z" }
const settings: AsaasSettings = { pix: true, card: true, maxInstallments: 1, offline: true, updatedAt: null }

/** A client of the test's own, so what it keeps can be looked into; nothing is retried, as nothing here fails by chance. */
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

/** Everything the client keeps, as text: what a leaked key would have to be found in. */
function keptBy(client: QueryClient): string {
  const mutations = client.getMutationCache().getAll().map((mutation) => mutation.state)
  const queries = client.getQueryCache().getAll().map((query) => query.state)
  return JSON.stringify({ mutations, queries })
}

const methodsOf = (fetched: ReturnType<typeof vi.fn<Fetched>>) => fetched.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`)

afterEach(() => vi.unstubAllGlobals())

describe("useConnectAsaas", () => {
  it("sends the key in the body, never in the address, and reads the connection again once it is taken", async () => {
    let state = disconnected
    const fetched = vi.fn<Fetched>(async (_url, init) => {
      if (init?.method === "POST") state = connected
      return Response.json(state)
    })
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useAsaasConnection("loja"), asaas: useConnectAsaas("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.data?.status).toBe("DISCONNECTED"))

    act(() => result.current.asaas.connect(KEY))
    await waitFor(() => expect(result.current.asaas.connected).toBe(true))

    expect(methodsOf(fetched)).toEqual([`GET ${CONNECTION}`, `POST ${CONNECTION}`, `GET ${CONNECTION}`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ apiKey: KEY })
    // Read again before the try ends: the card never shows the key's field once more in between.
    expect(result.current.connection.data?.status).toBe("CONNECTED")
    expect(result.current.asaas).toMatchObject({ isPending: false, refusal: null, connected: true })
  })

  /** TanStack keeps a mutation, variables and all, for five minutes and for as long as it is observed. */
  it("keeps the key while Asaas is asked and not a moment longer, once connected", async () => {
    let answer: (response: Response) => void = () => {}
    vi.stubGlobal("fetch", vi.fn<Fetched>((_url, init) => (init?.method === "POST" ? new Promise<Response>((resolve) => (answer = resolve)) : Promise.resolve(Response.json(connected)))))
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useConnectAsaas("loja"), { wrapper })

    act(() => result.current.connect(KEY))
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(client.getMutationCache().getAll()).toHaveLength(1)
    expect(keptBy(client)).toContain(KEY)

    answer(Response.json(connected))
    await waitFor(() => expect(result.current.connected).toBe(true))
    await waitFor(() => expect(client.getMutationCache().getAll()).toEqual([]))
    expect(keptBy(client)).not.toContain(KEY)
  })

  /** A key of the other environment is refused here, and still opens an account there. */
  it("says the API's code for a refusal, reads nothing again, and keeps nothing of the refused key either", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) =>
      init?.method === "POST" ? Response.json({ statusCode: 400, errorCode: "INTEGRATION_KEY_WRONG_ENVIRONMENT", message: "x" }, { status: 400 }) : Response.json(disconnected),
    )
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useAsaasConnection("loja"), asaas: useConnectAsaas("loja") }), { wrapper })
    await waitFor(() => expect(result.current.connection.isSuccess).toBe(true))

    act(() => result.current.asaas.connect(KEY))
    await waitFor(() => expect(result.current.asaas.refusal).toBe("INTEGRATION_KEY_WRONG_ENVIRONMENT"))

    expect(result.current.asaas).toMatchObject({ isPending: false, connected: false })
    expect(methodsOf(fetched)).toEqual([`GET ${CONNECTION}`, `POST ${CONNECTION}`])
    await waitFor(() => expect(client.getMutationCache().getAll()).toEqual([]))
    expect(keptBy(client)).not.toContain(KEY)
  })

  it("forgets the last refusal as another try begins, and when told to", async () => {
    let refuse = true
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => (refuse ? Response.json({ errorCode: "INTEGRATION_KEY_INVALID" }, { status: 400 }) : Response.json(connected))))
    const { wrapper } = mount()
    const { result } = renderHook(() => useConnectAsaas("loja"), { wrapper })

    act(() => result.current.connect(KEY))
    await waitFor(() => expect(result.current.refusal).toBe("INTEGRATION_KEY_INVALID"))

    refuse = false
    act(() => result.current.connect(KEY))
    expect(result.current.refusal).toBeNull()
    await waitFor(() => expect(result.current.connected).toBe(true))

    act(() => result.current.forget())
    expect(result.current).toMatchObject({ connected: false, refusal: null })
  })

  it("answers UNKNOWN for a failure that is no answer of the API's", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new TypeError("Failed to fetch"))))
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useConnectAsaas("loja"), { wrapper })

    act(() => result.current.connect(KEY))
    await waitFor(() => expect(result.current.refusal).toBe("UNKNOWN"))
    await waitFor(() => expect(client.getMutationCache().getAll()).toEqual([]))
  })

  /** Nobody is left to let go of the mutation: its own short life has to. */
  it("keeps nothing of the key when the page is left while Asaas is still being asked", async () => {
    let answer: (response: Response) => void = () => {}
    vi.stubGlobal("fetch", vi.fn<Fetched>((_url, init) => (init?.method === "POST" ? new Promise<Response>((resolve) => (answer = resolve)) : Promise.resolve(Response.json(connected)))))
    const { client, wrapper } = mount()
    const { result, unmount } = renderHook(() => useConnectAsaas("loja"), { wrapper })

    act(() => result.current.connect(KEY))
    await waitFor(() => expect(result.current.isPending).toBe(true))
    unmount()
    answer(Response.json(connected))

    await waitFor(() => expect(client.getMutationCache().getAll()).toEqual([]))
    expect(keptBy(client)).not.toContain(KEY)
  })
})

describe("the rest of the shop's Asaas", () => {
  it("reads the connection again once disconnected, and leaves the ways of paying as they were", async () => {
    let state = connected
    const fetched = vi.fn<Fetched>(async (url, init) => {
      if (init?.method === "DELETE") state = disconnected
      return Response.json(url.endsWith("/settings") ? settings : init?.method === "DELETE" ? {} : state)
    })
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => ({ connection: useAsaasConnection("loja"), settings: useAsaasSettings("loja"), disconnect: useDisconnectAsaas("loja") }), { wrapper })
    await waitFor(() => expect(result.current.settings.isSuccess && result.current.connection.isSuccess).toBe(true))

    act(() => result.current.disconnect.mutate())
    await waitFor(() => expect(result.current.connection.data?.status).toBe("DISCONNECTED"))

    expect(methodsOf(fetched).filter((call) => call.endsWith("/settings"))).toEqual([`GET ${CONNECTION}/settings`])
    expect(client.getQueryData(integrationKeys.asaasSettings("loja"))).toEqual(settings)
  })

  it("saves the ways of paying whole, and keeps the answer as what they now are", async () => {
    const saved: AsaasSettings = { pix: true, card: true, maxInstallments: 6, offline: false, updatedAt: "2026-10-05T12:00:00.000Z" }
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "PUT" ? saved : settings))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ settings: useAsaasSettings("loja"), save: useSaveAsaasSettings("loja") }), { wrapper })
    await waitFor(() => expect(result.current.settings.data).toEqual(settings))

    act(() => result.current.save.mutate({ pix: true, card: true, maxInstallments: 6, offline: false }))
    await waitFor(() => expect(result.current.settings.data).toEqual(saved))

    expect(methodsOf(fetched)).toEqual([`GET ${CONNECTION}/settings`, `PUT ${CONNECTION}/settings`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ pix: true, card: true, maxInstallments: 6, offline: false })
  })
})
