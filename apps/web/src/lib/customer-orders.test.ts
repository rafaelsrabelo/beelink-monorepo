// Libs
import { beforeEach, describe, expect, it, vi } from "vitest"

// The marker throws outside a React Server environment; a unit test is not one.
vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({ token: "access" as string | undefined, callApi: vi.fn() }))
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => (mocks.token ? { value: mocks.token } : undefined) }) }))
vi.mock("./api", () => ({ callApi: mocks.callApi }))

const { customerOrderAt } = await import("./customer-orders")

beforeEach(() => {
  mocks.token = "access"
  mocks.callApi.mockReset()
})

describe("customerOrderAt", () => {
  it("reads the order with the shopper's session", async () => {
    mocks.callApi.mockResolvedValue(new Response(JSON.stringify({ number: 14 }), { status: 200 }))

    await expect(customerOrderAt("loja", 14)).resolves.toEqual({ status: "found", order: { number: 14 } })
    expect(mocks.callApi).toHaveBeenCalledWith(expect.objectContaining({ path: "/stores/loja/customer/orders/14", method: "GET", accessToken: "access" }))
  })

  /** None by that number and another customer's are one answer from the API, and one 404 to the page. */
  it("tells an order that is not there for them from a read that failed", async () => {
    mocks.callApi.mockResolvedValue(new Response(JSON.stringify({ errorCode: "ORDER_NOT_FOUND" }), { status: 404 }))
    await expect(customerOrderAt("loja", 15)).resolves.toEqual({ status: "missing" })

    mocks.callApi.mockResolvedValue(new Response("{}", { status: 500 }))
    await expect(customerOrderAt("loja", 16)).resolves.toEqual({ status: "failed" })

    mocks.callApi.mockRejectedValue(new Error("ECONNREFUSED"))
    await expect(customerOrderAt("loja", 17)).resolves.toEqual({ status: "failed" })
  })

  it("does not ask without a session", async () => {
    mocks.token = undefined

    await expect(customerOrderAt("loja", 18)).resolves.toEqual({ status: "failed" })
    expect(mocks.callApi).not.toHaveBeenCalled()
  })
})
