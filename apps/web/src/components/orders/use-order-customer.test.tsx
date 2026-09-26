// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { CustomerRequestError } from "@/services/customers/customer-requests"
import { useOrderCustomer } from "./use-order-customer"

const mocks = vi.hoisted(() => ({ customer: vi.fn() }))

vi.mock("@/services/customers/customer-hooks", () => ({
  customerKeys: { list: (slug: string, query: object) => ["store-customers", slug, "list", query] },
  useStoreCustomer: mocks.customer,
  useStoreCustomers: () => ({ data: undefined, isFetching: false }),
  useCreateStoreCustomer: () => ({ mutateAsync: vi.fn(), reset: vi.fn(), error: null, isPending: false }),
}))

const caio = { id: "c2", name: "Caio Lima", phone: "5511955554444", email: null }

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
}

beforeEach(() => {
  mocks.customer.mockReset()
})

/** The record's "Novo pedido" is `/orders/new?customer=<id>`: this is the form's end of that link. */
describe("useOrderCustomer, opened from a customer's record", () => {
  it("reads the customer the page was opened for and has them chosen, until the shopkeeper changes them", () => {
    mocks.customer.mockImplementation((_slug: string, id: string | null) => ({ data: id ? caio : undefined, isPending: false, error: null }))
    const { result } = renderHook(() => useOrderCustomer("loja", "c2", ui, web), { wrapper })

    expect(mocks.customer).toHaveBeenCalledWith("loja", "c2")
    expect(result.current.selected).toEqual(caio)
    expect(result.current.loading).toBe(false)

    act(() => result.current.clear())
    expect(result.current.selected).toBeNull()
  })

  it("holds a skeleton while that customer is on its way, and says so when they are not the shop's", () => {
    mocks.customer.mockReturnValue({ data: undefined, isPending: true, error: null })
    const { result, rerender } = renderHook(() => useOrderCustomer("loja", "c2", ui, web), { wrapper })
    expect(result.current.loading).toBe(true)

    mocks.customer.mockReturnValue({ data: undefined, isPending: false, error: new CustomerRequestError("CUSTOMER_NOT_FOUND") })
    rerender()
    expect(result.current.initialError).toBe(web.errors.CUSTOMER_NOT_FOUND)
  })
})
