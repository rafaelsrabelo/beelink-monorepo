// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CourierApplicationPayload } from "@harness-monorepo/contracts"

// App
import { useSendCourierApplication } from "./courier-application-hooks"
import { CourierApplicationRequestError } from "./courier-application-requests"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

/** Made up: a CPF whose check digits are right and an address nobody owns. */
const ZULEICA = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  email: "zuleica.tavares@exemplo.test",
  whatsapp: "(85) 98765-4321",
  city: "FORTALEZA_CE",
  vehicle: "BICYCLE",
  acceptedTerms: true,
  website: "",
} satisfies CourierApplicationPayload

function mount() {
  // The app's own defaults retry a query three times; a mutation's are left as the hook sets them.
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useSendCourierApplication(), { wrapper })
}

function answers(response: () => Response | Promise<Response>) {
  const fetched = vi.fn<Fetched>(async () => response())
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const refusal = (status: number, errorCode: string) => Response.json({ statusCode: status, errorCode, message: "x" }, { status })

afterEach(() => vi.unstubAllGlobals())

describe("useSendCourierApplication (BEELINK-322)", () => {
  it("posts the application to this app's own route, as JSON, and succeeds on the 204 that says nothing", async () => {
    const fetched = answers(() => new Response(null, { status: 204 }))
    const { result } = mount()

    act(() => result.current.mutate(ZULEICA))

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fetched).toHaveBeenCalledTimes(1)
    const [url, init] = fetched.mock.calls[0]!
    expect(url).toBe("/api/courier-applications")
    expect(init?.method).toBe("POST")
    // `refuseCrossOrigin` answers 415 to a call that does not say it speaks JSON.
    expect((init?.headers as Record<string, string>)["content-type"]).toBe("application/json")
    expect(JSON.parse(String(init?.body))).toEqual(ZULEICA)
    expect(result.current.data).toBeUndefined()
  })

  it.each([
    ["a field's refusal", 400, "COURIER_DOCUMENT_INVALID"],
    ["the limit", 429, "RATE_LIMITED"],
    ["a failure the API named", 500, "INTERNAL_SERVER_ERROR"],
  ])("fails with the API's code on %s", async (_, status, errorCode) => {
    answers(() => refusal(status, errorCode))
    const { result } = mount()

    act(() => result.current.mutate(ZULEICA))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toBeInstanceOf(CourierApplicationRequestError)
    expect(result.current.error?.errorCode).toBe(errorCode)
  })

  it.each([
    ["the network gave no answer", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["the answer was not the API's", () => new Response("<html>Bad Gateway</html>", { status: 502, headers: { "content-type": "text/html" } })],
  ])("fails as UNKNOWN when %s", async (_, response) => {
    answers(response)
    const { result } = mount()

    act(() => result.current.mutate(ZULEICA))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.errorCode).toBe("UNKNOWN")
  })

  /** A send repeated behind the person's back would spend the per-address limit. */
  it("sends once, whatever the answer: nothing is retried by itself", async () => {
    const fetched = answers(() => refusal(500, "INTERNAL_SERVER_ERROR"))
    const { result } = mount()

    act(() => result.current.mutate(ZULEICA))

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(fetched).toHaveBeenCalledTimes(1)
  })

  it("is ready for another send once reset", async () => {
    answers(() => new Response(null, { status: 204 }))
    const { result } = mount()
    act(() => result.current.mutate(ZULEICA))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    act(() => result.current.reset())

    await waitFor(() => expect(result.current.isIdle).toBe(true))
  })
})
