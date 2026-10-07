// Libs
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomerOffersPayload } from "@harness-monorepo/contracts"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ token: "shopper-access" as string | undefined, callApi: vi.fn() }))
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (mocks.token ? { value: mocks.token } : undefined) }),
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}))
vi.mock("./api", () => ({ callApi: mocks.callApi }))

const { customerOffersAt, servedOffersAt } = await import("./customer-offers")

const offers = { hasOrder: false, firstPurchase: null, coupons: [] }
const cart: CustomerOffersPayload = { items: [{ variantId: "v1", quantity: 2 }], fulfillment: "DELIVERY", addressId: "a1" }

beforeEach(() => {
  mocks.token = "shopper-access"
  mocks.callApi.mockReset()
  mocks.callApi.mockResolvedValue(Response.json(offers))
})

describe("customerOffersAt", () => {
  it("asks the shopper's own door with their session and their address, about no cart for a strip", async () => {
    await expect(customerOffersAt("loja")).resolves.toEqual(offers)

    expect(mocks.callApi).toHaveBeenCalledWith({ path: "/stores/loja/customer/offers", body: {}, accessToken: "shopper-access", clientIp: "203.0.113.7" })
  })

  it("asks about the cart given, field by field: a code typed is not part of the question", async () => {
    await customerOffersAt("loja", { ...cart, couponCode: "OCULTO10" } as never)

    expect(mocks.callApi.mock.calls[0]?.[0].body).toEqual(cart)
  })

  it("is nothing for a visitor, without asking, and nothing when the answer is not one", async () => {
    mocks.token = undefined
    await expect(customerOffersAt("loja")).resolves.toBeNull()
    expect(mocks.callApi).not.toHaveBeenCalled()

    mocks.token = "expired"
    mocks.callApi.mockResolvedValue(Response.json({ statusCode: 401, errorCode: "AUTH_UNAUTHENTICATED", message: "x" }, { status: 401 }))
    await expect(customerOffersAt("loja")).resolves.toBeNull()
    mocks.callApi.mockResolvedValue(Response.json({ ok: true }))
    await expect(customerOffersAt("loja")).resolves.toBeNull()
    mocks.callApi.mockRejectedValue(new TypeError("Failed to fetch"))
    await expect(customerOffersAt("loja")).resolves.toBeNull()
  })
})

describe("servedOffersAt", () => {
  it("hands the cart page its first list with whose it is and the question it answers", async () => {
    await expect(servedOffersAt("loja", "c1", { ...cart, couponCode: "X" } as never)).resolves.toMatchObject({ shopperId: "c1", cart, offers })
  })

  it("is nothing when it could not be read: the browser asks", async () => {
    mocks.callApi.mockResolvedValue(new Response("{}", { status: 500 }))

    await expect(servedOffersAt("loja", "c1", cart)).resolves.toBeNull()
  })
})
