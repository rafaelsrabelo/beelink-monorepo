// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { useShopperZipCodeLookup } from "./cep-hooks"

type Fetched = (url: string, init?: RequestInit) => Promise<Response>

function mount() {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return renderHook(() => useShopperZipCodeLookup("loja"), { wrapper }).result.current
}

function answers(response: () => Response) {
  const fetched = vi.fn<Fetched>(async () => response())
  vi.stubGlobal("fetch", fetched)
  return fetched
}

const refusal = (status: number, errorCode: string) => Response.json({ statusCode: status, errorCode, message: "x" }, { status })

afterEach(() => vi.unstubAllGlobals())

describe("useShopperZipCodeLookup", () => {
  it("asks the shop's own lane and answers the parts it found", async () => {
    const fetched = answers(() => Response.json({ zipCode: "60160230", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" }))

    await expect(mount()("60160-230")).resolves.toEqual({ status: "found", street: "Rua Tibúrcio Cavalcante", neighborhood: "Meireles", city: "Fortaleza", state: "CE" })
    expect(fetched.mock.calls[0]?.[0]).toBe("/loja/api/cep/60160230")
  })

  /** Three things the shopper reads differently: a CEP that is not one, one nobody knows, and the service down. */
  it("tells a CEP that is not one from one nobody knows, and both from the service being down", async () => {
    answers(() => refusal(400, "CEP_INVALID"))
    await expect(mount()("00000000")).resolves.toEqual({ status: "invalid" })

    answers(() => refusal(404, "CEP_NOT_FOUND"))
    await expect(mount()("99999999")).resolves.toEqual({ status: "not-found" })

    answers(() => refusal(502, "CEP_UNAVAILABLE"))
    await expect(mount()("60160230")).resolves.toEqual({ status: "unavailable" })
  })
})
