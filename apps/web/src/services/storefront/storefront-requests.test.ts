// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { makeOrderPayment, placeShopperOrder, readOrderPayment, RestockRequestError, sendRestockRequest, ShopperOrderError } from "./storefront-requests"

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

/** BEELINK-205: the charge of an order is read and made at the shop's own handler — the bee-link API behind it, never Asaas. */
describe("readOrderPayment and makeOrderPayment", () => {
  const answer = { payment: { status: "PENDING", method: "PIX" } }

  it("reads at the shop's handler with a GET, and makes with a POST that sends nothing of its own", async () => {
    const fetchSpy = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => Response.json(answer))
    vi.stubGlobal("fetch", fetchSpy)

    expect(await readOrderPayment("lessari", 14)).toEqual(answer)
    expect(await makeOrderPayment("lessari", 14)).toEqual(answer)

    expect(fetchSpy.mock.calls.map(([url, init]) => [url, init?.method, init?.body])).toEqual([
      ["/lessari/api/orders/14/payment", "GET", undefined],
      ["/lessari/api/orders/14/payment", "POST", "{}"],
    ])
  })

  it("answers an order with no charge yet as such: null is an answer, not a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ payment: null })))

    expect(await readOrderPayment("lessari", 14)).toEqual({ payment: null })
  })

  it("throws the API's code, so the screen picks the sentence — and a limit with no body as one", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ statusCode: 409, errorCode: "PAYMENT_IN_PROGRESS", message: "x" }, { status: 409 })))
    await expect(makeOrderPayment("lessari", 14)).rejects.toMatchObject({ errorCode: "PAYMENT_IN_PROGRESS" })
    await expect(makeOrderPayment("lessari", 14)).rejects.toBeInstanceOf(ShopperOrderError)

    vi.stubGlobal("fetch", vi.fn(async () => new Response("slow down", { status: 429 })))
    await expect(makeOrderPayment("lessari", 14)).rejects.toMatchObject({ errorCode: "RATE_LIMITED" })
  })

  it("takes a 2xx that is not a payment's answer for a failure, never for an order with no charge", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("<html>", { status: 200 })))
    await expect(readOrderPayment("lessari", 14)).rejects.toMatchObject({ errorCode: "UNKNOWN" })

    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ok: true })))
    await expect(readOrderPayment("lessari", 14)).rejects.toMatchObject({ errorCode: "UNKNOWN" })
  })
})
