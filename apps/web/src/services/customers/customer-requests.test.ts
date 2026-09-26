// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { fetchOrders } from "../orders/order-requests"
import { CustomerRequestError, fetchStoreCustomer, updateStoreCustomer } from "./customer-requests"

function answerWith(status: number, body: unknown) {
  const fetchSpy = vi.fn(async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } }))
  vi.stubGlobal("fetch", fetchSpy)
  return fetchSpy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the customer's record requests", () => {
  it("reads the record through this app's own route handler", async () => {
    const fetchSpy = answerWith(200, { id: "c1", averageTicketCents: 12290 })

    expect(await fetchStoreCustomer("loja do design", "c1")).toEqual({ id: "c1", averageTicketCents: 12290 })
    expect((fetchSpy.mock.calls[0]! as unknown as [string])[0]).toBe("/api/stores/loja%20do%20design/customers/c1")
  })

  it("sends the correction as a PATCH that says it speaks JSON", async () => {
    const fetchSpy = answerWith(200, { id: "c1", name: "Bia Souza" })

    await updateStoreCustomer("loja", "c1", { name: "Bia Souza", phone: "11988887777", address: { city: null } })

    const [url, init] = fetchSpy.mock.calls[0]! as unknown as [string, RequestInit]
    expect(url).toBe("/api/stores/loja/customers/c1")
    expect(init.method).toBe("PATCH")
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json")
    expect(JSON.parse(String(init.body))).toEqual({ name: "Bia Souza", phone: "11988887777", address: { city: null } })
  })

  it("throws the API's code, never a sentence, when a phone belongs to another customer", async () => {
    answerWith(409, { statusCode: 409, errorCode: "CUSTOMER_PHONE_TAKEN", message: "That phone belongs to another customer" })

    const refusal = await updateStoreCustomer("loja", "c1", { phone: "11977776666" }).catch((error: unknown) => error)

    expect(refusal).toBeInstanceOf(CustomerRequestError)
    expect((refusal as CustomerRequestError).errorCode).toBe("CUSTOMER_PHONE_TAKEN")
  })

  it("asks the orders list for one customer's history", async () => {
    const fetchSpy = answerWith(200, { orders: [], total: 0, page: 2, pageSize: 20 })

    await fetchOrders("loja", { customerId: "c1", page: 2 })

    expect((fetchSpy.mock.calls[0]! as unknown as [string])[0]).toBe("/api/stores/loja/orders?customerId=c1&page=2")
  })
})
