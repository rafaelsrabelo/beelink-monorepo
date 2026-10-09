// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomDomainOverview } from "@harness-monorepo/contracts"

// App
import { storeKeys } from "../stores/store-hooks"
import { useCheckCustomDomain, useCustomDomain, useRemoveCustomDomain, useSaveCustomDomain } from "./custom-domain-hooks"
import { customDomainKeys } from "./custom-domain-keys"
import { CustomDomainRequestError } from "./custom-domain-requests"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

const ROUTE = "/api/stores/loja/custom-domain"
/** Documentation addresses (RFC 5737): nobody's servers. */
const TARGET = "203.0.113.10"
const ELSEWHERE = "198.51.100.7"

const none: CustomDomainOverview = { targetIps: [TARGET], domain: null, check: null }
/** What a save answers for a domain still parked at its registrar: the check it ran, with where the records point. */
const checked: CustomDomainOverview = {
  targetIps: [TARGET],
  domain: { host: "minhaloja.com.br", status: "PENDING", checkedAt: "2026-10-08T12:00:00.000Z", problem: "DNS_POINTS_ELSEWHERE" },
  check: { problem: "DNS_POINTS_ELSEWHERE", addresses: [ELSEWHERE], www: { problem: "DNS_NOT_FOUND", addresses: [] } },
}
/** The same domain as a plain read tells it: no check. */
const read: CustomDomainOverview = { ...checked, check: null }
const active: CustomDomainOverview = {
  targetIps: [TARGET],
  domain: { host: "minhaloja.com.br", status: "ACTIVE", checkedAt: "2026-10-08T13:00:00.000Z", problem: null },
  check: { problem: null, addresses: [TARGET], www: { problem: null, addresses: [TARGET] } },
}

/** A client of the test's own, so what it keeps can be looked into; nothing is retried, as nothing here fails by chance. */
function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { client, wrapper }
}

const callsOf = (fetched: ReturnType<typeof vi.fn<Fetched>>) => fetched.mock.calls.map(([url, init]) => `${init?.method ?? "GET"} ${url}`)
const refusal = (status: number, errorCode: string) => Response.json({ statusCode: status, errorCode, message: "x" }, { status })

afterEach(() => vi.unstubAllGlobals())

describe("the shop's own domain (BEELINK-285)", () => {
  it("reads the domain through the panel's own route, under the shop's own key", async () => {
    const fetched = vi.fn<Fetched>(async () => Response.json(none))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => useCustomDomain("loja"), { wrapper })

    await waitFor(() => expect(result.current.data).toEqual(none))

    expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`])
    // `refuseCrossOrigin` answers 415 to a call that does not say it speaks JSON.
    expect(new Headers(fetched.mock.calls[0]?.[1]?.headers).get("content-type")).toBe("application/json")
    expect(client.getQueryData(customDomainKeys.overview("loja"))).toEqual(none)
    expect(client.getQueryData(customDomainKeys.overview("outra"))).toBeUndefined()
  })

  /** The answer is the domain itself, already checked: the screen changes with no second read. */
  it("saves the domain as it was pasted, and keeps the answer — the check it ran included", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "PUT" ? checked : none))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), save: useSaveCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.isSuccess).toBe(true))

    act(() => result.current.save.mutate({ domain: " https://www.MinhaLoja.com.br/ " }))
    await waitFor(() => expect(result.current.domain.data).toEqual(checked))

    expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`, `PUT ${ROUTE}`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({ domain: " https://www.MinhaLoja.com.br/ " })
  })

  it("checks the saved domain again with an empty body, and keeps what the check answered", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "POST" ? active : read))
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), check: useCheckCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.data?.domain?.status).toBe("PENDING"))

    act(() => result.current.check.mutate())
    await waitFor(() => expect(result.current.domain.data).toEqual(active))

    expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`, `POST ${ROUTE}/check`])
    expect(JSON.parse(String(fetched.mock.calls[1]?.[1]?.body))).toEqual({})
  })

  /**
   * A read tells no check. Without this, coming back to the tab after fixing the records at the
   * provider — the very thing the screen sends a shopkeeper to do — would wipe where they point.
   */
  it("goes on telling where the records were found to point when the domain is read again unchanged", async () => {
    const fetched = vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "PUT" ? checked : read))
    vi.stubGlobal("fetch", fetched)
    const { client, wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), save: useSaveCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.isSuccess).toBe(true))
    expect(result.current.domain.data?.check).toBeNull()
    act(() => result.current.save.mutate({ domain: "minhaloja.com.br" }))
    await waitFor(() => expect(result.current.domain.data?.check?.addresses).toEqual([ELSEWHERE]))

    await act(() => client.invalidateQueries({ queryKey: customDomainKeys.overview("loja") }))

    // Read again, and answered with no check: what is kept is the read with the check it had.
    expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`, `PUT ${ROUTE}`, `GET ${ROUTE}`])
    expect(client.getQueryData(customDomainKeys.overview("loja"))).toEqual(checked)
    expect(client.getQueryData(customDomainKeys.overview("loja"))).not.toBe(checked)
  })

  it.each([
    ["was checked again since, elsewhere", { ...read, domain: { ...read.domain!, checkedAt: "2026-10-08T15:00:00.000Z", problem: "DNS_NOT_FOUND" as const } }],
    ["is another domain now", { ...read, domain: { ...read.domain!, host: "outraloja.com.br" } }],
    ["was removed", none],
  ])("drops the check it kept once the domain read %s", async (_what, later) => {
    let answer: CustomDomainOverview = read
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => Response.json(init?.method === "PUT" ? checked : answer)))
    const { client, wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), save: useSaveCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.isSuccess).toBe(true))
    act(() => result.current.save.mutate({ domain: "minhaloja.com.br" }))
    await waitFor(() => expect(result.current.domain.data?.check).not.toBeNull())

    answer = later
    await act(() => client.invalidateQueries({ queryKey: customDomainKeys.overview("loja") }))

    await waitFor(() => expect(result.current.domain.data).toEqual(later))
  })

  /** The panel's home draws its card from `Store.customDomain`: a domain that changed is read again there. */
  it("has the shop's own record read again after a save, a check and a removal — and after none that was refused", async () => {
    let refuse = false
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (refuse ? refusal(409, "CUSTOM_DOMAIN_TAKEN") : Response.json(init?.method === "DELETE" ? {} : checked))))
    const { client, wrapper } = mount()
    const stale = () => client.getQueryState(storeKeys.detail("loja"))?.isInvalidated
    const fresh = () => client.setQueryData(storeKeys.detail("loja"), { slug: "loja" })
    const { result } = renderHook(() => ({ save: useSaveCustomDomain("loja"), check: useCheckCustomDomain("loja"), remove: useRemoveCustomDomain("loja") }), { wrapper })

    for (const run of [() => result.current.save.mutateAsync({ domain: "minhaloja.com.br" }), () => result.current.check.mutateAsync(), () => result.current.remove.mutateAsync()]) {
      fresh()
      expect(stale()).toBe(false)
      await act(() => run())
      expect(stale()).toBe(true)
    }

    refuse = true
    fresh()
    await act(() => result.current.save.mutateAsync({ domain: "outra.com.br" }).catch(() => undefined))
    await act(() => result.current.check.mutateAsync().catch(() => undefined))
    await act(() => result.current.remove.mutateAsync().catch(() => undefined))
    expect(stale()).toBe(false)
    // Another shop's record is nobody's to read again.
    expect(client.getQueryState(storeKeys.detail("outra"))).toBeUndefined()
  })

  it.each([
    ["CUSTOM_DOMAIN_TAKEN", 409],
    ["CUSTOM_DOMAIN_INVALID", 400],
    ["CUSTOM_DOMAIN_UNAVAILABLE", 503],
    ["RATE_LIMITED", 429],
  ])("says the API's code for a domain it refused (%s), and leaves the domain as it was read", async (errorCode, status) => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "PUT" ? refusal(status, errorCode) : Response.json(none))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), save: useSaveCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.isSuccess).toBe(true))

    act(() => result.current.save.mutate({ domain: "minhaloja.com.br" }))
    await waitFor(() => expect(result.current.save.isError).toBe(true))

    expect(result.current.save.error).toBeInstanceOf(CustomDomainRequestError)
    expect(result.current.save.error).toMatchObject({ errorCode })
    expect(result.current.domain.data).toEqual(none)
  })

  it("says the API's code for a check it refused, and leaves the domain as it was read", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "POST" ? refusal(409, "CUSTOM_DOMAIN_NOT_SET") : Response.json(read))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), check: useCheckCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.isSuccess).toBe(true))

    act(() => result.current.check.mutate())
    await waitFor(() => expect(result.current.check.isError).toBe(true))

    expect(result.current.check.error).toMatchObject({ errorCode: "CUSTOM_DOMAIN_NOT_SET" })
    expect(result.current.domain.data).toEqual(read)
  })

  it("answers UNKNOWN for a failure that is no answer of the API's", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async () => Promise.reject(new TypeError("Failed to fetch"))))
    const { wrapper } = mount()
    const { result } = renderHook(() => useSaveCustomDomain("loja"), { wrapper })

    act(() => result.current.mutate({ domain: "minhaloja.com.br" }))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).not.toBeInstanceOf(CustomDomainRequestError)
  })

  it("reads the domain again once it is removed", async () => {
    let state = read
    const fetched = vi.fn<Fetched>(async (_url, init) => {
      if (init?.method === "DELETE") {
        state = none
        return Response.json({})
      }
      return Response.json(state)
    })
    vi.stubGlobal("fetch", fetched)
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), remove: useRemoveCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.data?.domain?.host).toBe("minhaloja.com.br"))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.domain.data).toEqual(none))

    expect(callsOf(fetched)).toEqual([`GET ${ROUTE}`, `DELETE ${ROUTE}`, `GET ${ROUTE}`])
  })

  it("keeps the domain as it was read when removing does not go through", async () => {
    vi.stubGlobal("fetch", vi.fn<Fetched>(async (_url, init) => (init?.method === "DELETE" ? refusal(503, "SERVICE_UNAVAILABLE") : Response.json(read))))
    const { wrapper } = mount()
    const { result } = renderHook(() => ({ domain: useCustomDomain("loja"), remove: useRemoveCustomDomain("loja") }), { wrapper })
    await waitFor(() => expect(result.current.domain.isSuccess).toBe(true))

    act(() => result.current.remove.mutate())
    await waitFor(() => expect(result.current.remove.isError).toBe(true))

    expect(result.current.domain.data).toEqual(read)
  })
})
