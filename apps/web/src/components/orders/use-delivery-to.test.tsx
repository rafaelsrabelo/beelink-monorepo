// Libs
import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// App
import { useDeliveryTo } from "./use-delivery-to"

const mocks = vi.hoisted(() => ({ customer: vi.fn() }))

vi.mock("@/services/customers/customer-hooks", () => ({ useStoreCustomer: mocks.customer }))

const bia = { id: "c1", name: "Bia Souza", phone: "5511988887777", email: null }
const paulista = { zipCode: "01310-930", street: "Av. Paulista", number: "1000", complement: null, neighborhood: "Bela Vista", city: "São Paulo", state: "SP" }

beforeEach(() => {
  mocks.customer.mockReset()
  mocks.customer.mockReturnValue({ data: undefined, isError: false })
})

describe("useDeliveryTo", () => {
  it("reads nobody before a customer is chosen, nor on a pick-up", () => {
    expect(renderHook(() => useDeliveryTo("loja", null, "DELIVERY")).result.current).toBeUndefined()
    expect(renderHook(() => useDeliveryTo("loja", bia, "PICKUP")).result.current).toBeUndefined()
    expect(mocks.customer).toHaveBeenCalledWith("loja", null)
    expect(mocks.customer).not.toHaveBeenCalledWith("loja", "c1")
  })

  it("holds while the record is on its way, then says where the delivery goes", () => {
    const { result, rerender } = renderHook(() => useDeliveryTo("loja", bia, "DELIVERY"))
    expect(mocks.customer).toHaveBeenCalledWith("loja", "c1")
    expect(result.current).toEqual({ loading: true })

    mocks.customer.mockReturnValue({ data: { ...bia, address: paulista }, isError: false })
    rerender()
    expect(result.current).toEqual({ loading: false, line: "Av. Paulista, 1000 — Bela Vista — São Paulo/SP — CEP 01310-930" })
  })

  it("has nowhere to deliver without a street or a city, as the API decides", () => {
    mocks.customer.mockReturnValue({ data: { ...bia, address: { ...paulista, street: "  " } }, isError: false })
    expect(renderHook(() => useDeliveryTo("loja", bia, "DELIVERY")).result.current).toEqual({ loading: false, line: null })

    mocks.customer.mockReturnValue({ data: { ...bia, address: { ...paulista, city: null } }, isError: false })
    expect(renderHook(() => useDeliveryTo("loja", bia, "DELIVERY")).result.current).toEqual({ loading: false, line: null })
  })

  it("claims nothing when the record cannot be read, leaving the rule to the API", () => {
    mocks.customer.mockReturnValue({ data: undefined, isError: true })
    expect(renderHook(() => useDeliveryTo("loja", bia, "DELIVERY")).result.current).toBeUndefined()
  })
})
