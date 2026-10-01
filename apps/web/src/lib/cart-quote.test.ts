// Libs
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOrderQuotePayload } from "@harness-monorepo/contracts"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ token: "shopper-access" as string | undefined, callApi: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (mocks.token ? { value: mocks.token } : undefined) }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}))
vi.mock("./api", () => ({ callApi: mocks.callApi }))

const { cartQuoteAt } = await import("./cart-quote")

const cart: CustomerOrderQuotePayload = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "DELIVERY" }
const priced = { lines: [], subtotalCents: 11980, promotionDiscountCents: 0, firstPurchase: null, coupon: null, couponDiscountCents: 0, manualDiscountCents: 0, discountCents: 0, deliveryFeeCents: null, totalCents: 11980 }

beforeEach(() => {
  mocks.token = "shopper-access"
  mocks.callApi.mockReset()
  mocks.callApi.mockResolvedValue(Response.json(priced))
})

/** BEELINK-245: the first price is asked as whoever the page is drawn for. */
describe("cartQuoteAt", () => {
  it("prices a visitor's cart at the public door, with no session and the visitor's address", async () => {
    await expect(cartQuoteAt("loja", cart, null)).resolves.toMatchObject({ shopperId: null, cart, quote: priced })

    expect(mocks.callApi).toHaveBeenCalledWith({ path: "/stores/loja/cart/quote", body: cart, accessToken: undefined, clientIp: "203.0.113.7" })
  })

  it("prices a signed-in shopper's cart as theirs, with their session, and says whose price it is", async () => {
    await expect(cartQuoteAt("loja", cart, "c1")).resolves.toMatchObject({ shopperId: "c1", cart, quote: priced })

    expect(mocks.callApi).toHaveBeenCalledWith({ path: "/stores/loja/customer/cart/quote", body: cart, accessToken: "shopper-access", clientIp: "203.0.113.7" })
  })

  it("leaves it to the browser when the shopper's price cannot be had here: no cookie left, or a session the API refused", async () => {
    mocks.token = undefined
    await expect(cartQuoteAt("loja", cart, "c1")).resolves.toBeNull()
    expect(mocks.callApi).not.toHaveBeenCalled()

    mocks.token = "expired"
    mocks.callApi.mockResolvedValue(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
    await expect(cartQuoteAt("loja", cart, "c1")).resolves.toBeNull()
  })

  it("is no price when the API could not answer with one", async () => {
    mocks.callApi.mockRejectedValue(new Error("ECONNREFUSED"))
    await expect(cartQuoteAt("loja", cart, null)).resolves.toBeNull()

    mocks.callApi.mockResolvedValue(new Response("<html>", { status: 200 }))
    await expect(cartQuoteAt("loja", cart, null)).resolves.toBeNull()
  })

  it("asks nothing for a cart with nothing to order", async () => {
    await expect(cartQuoteAt("loja", { ...cart, items: [] }, "c1")).resolves.toBeNull()
    expect(mocks.callApi).not.toHaveBeenCalled()
  })
})
