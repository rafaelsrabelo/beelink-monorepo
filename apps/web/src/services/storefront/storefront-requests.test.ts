// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { RestockRequestError, sendRestockRequest } from "./storefront-requests"

afterEach(() => vi.unstubAllGlobals())

describe("sendRestockRequest", () => {
  it("posts to this app's own handler, never to the API", async () => {
    const fetchSpy = vi.fn(async () => new Response(null, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)

    await sendRestockRequest("lessari", "p1", { variantId: "v1", phone: "11977776666" })

    expect(fetchSpy).toHaveBeenCalledWith(
      "/api/storefront/lessari/products/p1/restock-requests",
      expect.objectContaining({ method: "POST" }),
    )
  })

  it("throws the API's code, so the page picks the sentence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ statusCode: 429, errorCode: "RATE_LIMITED", message: "x" }, { status: 429 })),
    )

    const sending = sendRestockRequest("lessari", "p1", { variantId: "v1", phone: "11977776666" })

    await expect(sending).rejects.toBeInstanceOf(RestockRequestError)
    await expect(sending).rejects.toMatchObject({ errorCode: "RATE_LIMITED" })
  })
})
