// Libs
import { render, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { StorefrontAffiliateArrival } from "./storefront-affiliate-arrival"

beforeEach(() => {
  window.history.replaceState(null, "", "/")
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function arriving(status: number) {
  const fetched = vi.fn(async () => new Response(null, { status }))
  vi.stubGlobal("fetch", fetched)
  return fetched
}

describe("a visit on an affiliate's sub-site (IMPULSEIA-105)", () => {
  it("tells the shop whose sub-site it is, once however many times the effect runs", async () => {
    window.history.replaceState(null, "", "/lessari/joao/produtos/whey?utm_source=instagram")
    const fetched = arriving(200)

    render(
      <StrictMode>
        <StorefrontAffiliateArrival slug="lessari" name="joao" />
      </StrictMode>,
    )

    await waitFor(() => expect(fetched).toHaveBeenCalledOnce())
    expect(fetched).toHaveBeenCalledWith("/lessari/api/affiliate-arrival", expect.objectContaining({ body: '{"slug":"joao"}' }))
  })

  it("tells it again on the next page, whose count the shop's handler keeps to one a session", async () => {
    window.history.replaceState(null, "", "/lessari/joao")
    const fetched = arriving(204)

    const { unmount } = render(<StorefrontAffiliateArrival slug="lessari" name="joao" />)
    await waitFor(() => expect(fetched).toHaveBeenCalledOnce())
    unmount()

    window.history.replaceState(null, "", "/lessari/joao/carrinho")
    render(<StorefrontAffiliateArrival slug="lessari" name="joao" />)
    await waitFor(() => expect(fetched).toHaveBeenCalledTimes(2))
  })
})
