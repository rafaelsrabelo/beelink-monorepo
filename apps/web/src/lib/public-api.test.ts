// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { callPublicApi } from "./public-api"

type Fetched = (url: string, init?: RequestInit & { next?: { revalidate?: number; tags?: string[] } }) => Promise<Response>

const answer = (body: object, pricesChangeAt?: string) => Response.json(body, pricesChangeAt ? { headers: { "x-prices-change-at": pricesChangeAt } } : {})
const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the storefront's public read", () => {
  it("asks the API once, keeping the answer for a minute under its tags", async () => {
    const fetched = vi.fn<Fetched>(async () => answer({ name: "Loja" }))
    vi.stubGlobal("fetch", fetched)

    const response = await callPublicApi({ path: "/stores/loja/public", tags: ["store:loja"] })
    expect(await response.json()).toEqual({ name: "Loja" })
    expect(fetched).toHaveBeenCalledOnce()
    expect(fetched.mock.calls[0]?.[0]).toBe("http://api.test/api/stores/loja/public")
    expect(fetched.mock.calls[0]?.[1]).toMatchObject({ method: "GET", next: { revalidate: 60, tags: ["store:loja"] } })
  })

  it("serves a kept answer whose prices still hold", async () => {
    const fetched = vi.fn<Fetched>(async () => answer({ priceCents: 9000 }, minutesFromNow(30)))
    vi.stubGlobal("fetch", fetched)

    expect(await (await callPublicApi({ path: "/stores/loja/catalog" })).json()).toEqual({ priceCents: 9000 })
    expect(fetched).toHaveBeenCalledOnce()
  })

  it("does not serve an answer kept past the instant its prices changed: it asks again, uncached", async () => {
    // The promotion ended a while ago; nobody visited since, so the kept answer still has its price.
    const fetched = vi.fn<Fetched>(async (_url, init) => (init?.cache === "no-store" ? answer({ priceCents: 10000 }) : answer({ priceCents: 9000 }, minutesFromNow(-45))))
    vi.stubGlobal("fetch", fetched)

    expect(await (await callPublicApi({ path: "/stores/loja/catalog", tags: ["catalog:loja"] })).json()).toEqual({ priceCents: 10000 })
    expect(fetched).toHaveBeenCalledTimes(2)
    expect(fetched.mock.calls[1]?.[0]).toBe("http://api.test/api/stores/loja/catalog")
    expect(fetched.mock.calls[1]?.[1]).toMatchObject({ method: "GET", cache: "no-store" })
    expect(fetched.mock.calls[1]?.[1]).not.toHaveProperty("next")
  })

  it("takes an instant it cannot read as none", async () => {
    const fetched = vi.fn<Fetched>(async () => answer({ ok: true }, "amanhã"))
    vi.stubGlobal("fetch", fetched)

    expect(await (await callPublicApi({ path: "/stores/loja/catalog" })).json()).toEqual({ ok: true })
    expect(fetched).toHaveBeenCalledOnce()
  })
})
