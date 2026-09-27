// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { placeShopperOrder, RestockRequestError, sendRestockRequest, ShopperOrderError } from "./storefront-requests"

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

describe("placeShopperOrder", () => {
  const cart = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "PICKUP" as const, paymentMethod: "PIX" as const }

  it("posts to the shop's own handler, where the shopper's cookies reach, and answers the placed order", async () => {
    const fetchSpy = vi.fn(async () => Response.json({ number: 12 }, { status: 201 }))
    vi.stubGlobal("fetch", fetchSpy)

    await expect(placeShopperOrder("lessari", cart)).resolves.toMatchObject({ number: 12 })
    expect(fetchSpy).toHaveBeenCalledWith("/lessari/api/orders", expect.objectContaining({ method: "POST", body: JSON.stringify(cart) }))
  })

  it("throws the refusal's code, and a limit with no body as RATE_LIMITED", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "ORDER_STOCK_INSUFFICIENT", message: "x" }, { status: 409 })))
    const placing = placeShopperOrder("lessari", cart)
    await expect(placing).rejects.toBeInstanceOf(ShopperOrderError)
    await expect(placing).rejects.toMatchObject({ errorCode: "ORDER_STOCK_INSUFFICIENT" })

    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })))
    await expect(placeShopperOrder("lessari", cart)).rejects.toMatchObject({ errorCode: "RATE_LIMITED" })
  })
})
