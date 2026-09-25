// Libs
import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// App
import { customerListAddressOf, customerListHref, useCustomerListAddress } from "./use-customer-list-address"

const navigation = vi.hoisted(() => ({ replace: vi.fn(), search: new URLSearchParams() }))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: navigation.replace }),
  useSearchParams: () => navigation.search,
}))

beforeEach(() => {
  navigation.search = new URLSearchParams()
})

afterEach(() => {
  navigation.replace.mockReset()
  vi.useRealTimers()
})

describe("customerListAddressOf", () => {
  it("reads the tab, the order, the search and the page", () => {
    expect(customerListAddressOf(new URLSearchParams("stage=INACTIVE&sort=TOP_SPENT&q=%20bia%20&page=2"))).toEqual({
      stage: "INACTIVE",
      sort: "TOP_SPENT",
      q: "bia",
      page: 2,
    })
  })

  it("reads a bare address as everyone, newest first, on page one — and anything it cannot mean the same way", () => {
    const everyone = { stage: null, sort: "RECENT", q: "", page: 1 }

    expect(customerListAddressOf(new URLSearchParams())).toEqual(everyone)
    expect(customerListAddressOf(new URLSearchParams("stage=VIP&sort=NAME&page=-3"))).toEqual(everyone)
  })
})

describe("customerListHref", () => {
  it("writes only what is not the default", () => {
    expect(customerListHref("loja", { stage: null, sort: "RECENT", q: " ", page: 1 })).toBe("/admin/loja/customers")
    expect(customerListHref("loja", { stage: "LEAD", sort: "MOST_ORDERS", q: "bia souza ", page: 3 })).toBe(
      "/admin/loja/customers?stage=LEAD&sort=MOST_ORDERS&q=bia+souza&page=3",
    )
  })
})

describe("useCustomerListAddress", () => {
  it("changes the tab or the order and returns to page one, keeping the rest", () => {
    navigation.search = new URLSearchParams("sort=TOP_SPENT&q=bia&page=4")
    const { result, rerender } = renderHook(() => useCustomerListAddress("loja"))

    act(() => result.current.apply({ stage: "INACTIVE" }))
    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/loja/customers?stage=INACTIVE&sort=TOP_SPENT&q=bia")

    // The navigation lands, and the next change starts from it.
    navigation.search = new URLSearchParams("stage=INACTIVE&sort=TOP_SPENT&q=bia")
    rerender()
    act(() => result.current.apply({ stage: null, sort: "LAST_ORDER" }))
    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/loja/customers?sort=LAST_ORDER&q=bia")
  })

  /**
   * A search-param change waits for the server before the address moves, and a second write in that
   * window discards the first navigation: a tab clicked while the search was on its way dropped the
   * search, and the box then showed a search the list did not apply.
   */
  it("keeps a search still on its way when a tab is clicked before it lands, and the other way round", () => {
    vi.useFakeTimers()
    const { result } = renderHook(() => useCustomerListAddress("loja"))

    act(() => result.current.setTyped("bia"))
    act(() => vi.advanceTimersByTime(400))
    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/loja/customers?q=bia")

    act(() => result.current.apply({ stage: "LEAD" }))
    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/loja/customers?stage=LEAD&q=bia")
  })

  it("turns the page and keeps the tab, the order and the search", () => {
    navigation.search = new URLSearchParams("stage=LEAD&sort=MOST_ORDERS&q=bia")
    const { result } = renderHook(() => useCustomerListAddress("loja"))

    act(() => result.current.apply({}, 2))

    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/loja/customers?stage=LEAD&sort=MOST_ORDERS&q=bia&page=2")
  })

  it("writes the search once it settles, trimmed, back on page one", () => {
    vi.useFakeTimers()
    navigation.search = new URLSearchParams("stage=CUSTOMER&page=3")
    const { result } = renderHook(() => useCustomerListAddress("loja"))

    act(() => result.current.setTyped("bia "))
    expect(result.current.typed).toBe("bia ")
    expect(navigation.replace).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(350))
    expect(navigation.replace).toHaveBeenCalledTimes(1)
    expect(navigation.replace).toHaveBeenLastCalledWith("/admin/loja/customers?stage=CUSTOMER&q=bia")
  })

  it("puts the box back to what the address says when it changes elsewhere, as on Back", () => {
    navigation.search = new URLSearchParams("q=bia")
    const { result, rerender } = renderHook(() => useCustomerListAddress("loja"))
    expect(result.current.typed).toBe("bia")

    navigation.search = new URLSearchParams("q=caio")
    rerender()

    expect(result.current.typed).toBe("caio")
    expect(result.current.q).toBe("caio")
  })
})
