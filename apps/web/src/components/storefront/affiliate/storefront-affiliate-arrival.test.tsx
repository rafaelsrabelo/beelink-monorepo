// Libs
import { render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { StorefrontAffiliateArrival } from "./storefront-affiliate-arrival"
import { useAffiliateReferralUi } from "@/stores/affiliate-referral"

const router = vi.hoisted(() => ({ refresh: vi.fn() }))
vi.mock("next/navigation", () => ({ useRouter: () => router }))

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  vi.unstubAllGlobals()
  router.refresh.mockReset()
  useAffiliateReferralUi.setState({ arrivedOn: {}, closed: {} })
})

function arriving(status: number) {
  const fetched = vi.fn(async () => new Response(null, { status }))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

describe("an arrival by an affiliate's link (IMPULSEIA-105)", () => {
  it("tells the shop which link, takes the name out of the address, and draws the page again with the card where it arrived", async () => {
    window.history.replaceState(null, "", "/lessari?utm_source=instagram&afiliado=joao")
    const fetched = arriving(200)

    render(<StorefrontAffiliateArrival slug="lessari" />)

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce())
    expect(fetched).toHaveBeenCalledWith("/lessari/api/affiliate-arrival", expect.objectContaining({ body: '{"slug":"joao"}' }))
    expect(`${window.location.pathname}${window.location.search}`).toBe("/lessari?utm_source=instagram")
    expect(useAffiliateReferralUi.getState().arrivedOn).toEqual({ lessari: "/lessari" })
  })

  it("takes the name out of the address and draws nothing again for a link that credits nobody", async () => {
    window.history.replaceState(null, "", "/lessari/produtos/whey?afiliado=joao")
    const fetched = arriving(204)

    render(<StorefrontAffiliateArrival slug="lessari" />)

    await waitFor(() => expect(fetched).toHaveBeenCalledOnce())
    expect(window.location.search).toBe("")
    expect(router.refresh).not.toHaveBeenCalled()
    expect(useAffiliateReferralUi.getState().arrivedOn).toEqual({})
  })

  it("asks nothing of a page that arrived by no link", () => {
    window.history.replaceState(null, "", "/lessari/produtos?utm_source=instagram")
    const fetched = arriving(200)

    render(<StorefrontAffiliateArrival slug="lessari" />)

    expect(fetched).not.toHaveBeenCalled()
    expect(window.location.search).toBe("?utm_source=instagram")
  })
})
