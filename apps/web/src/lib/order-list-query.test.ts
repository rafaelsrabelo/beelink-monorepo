// Libs
import { describe, expect, it } from "vitest"

// App
import { isFiltered, orderListApiQueryOf, orderListEntriesOf, orderListQueryOf } from "./order-list-query"

describe("the orders list's address", () => {
  it("reads the tab, the period, the search and the page from the address, in the shop's words", () => {
    expect(orderListQueryOf({ situacao: "em-andamento", periodo: "2025", q: " whey ", pagina: "3" })).toEqual({ situation: "ACTIVE", period: "2025", search: "whey", page: 3 })
    // A word it does not know is the whole list, never an error.
    expect(orderListQueryOf({ situacao: "outra", periodo: "ontem", pagina: "abc" })).toEqual({ situation: undefined, period: undefined, search: "", page: 1 })
  })

  it("asks the API only for what narrows the list", () => {
    expect(orderListApiQueryOf({ situation: undefined, period: undefined, search: "", page: 1 })).toEqual({})
    expect(orderListApiQueryOf({ situation: "DELIVERED", period: "3m", search: "12", page: 2 })).toEqual({ situation: "DELIVERED", period: "3m", q: "12", page: 2 })
  })

  it("writes the address back, and a changed tab or filter starts at page one", () => {
    const query = { situation: "ACTIVE" as const, period: "2026", search: "whey", page: 3 }
    expect(orderListEntriesOf(query, { page: 4 })).toEqual({ situacao: "em-andamento", periodo: "2026", q: "whey", pagina: "4" })
    expect(orderListEntriesOf(query, { situation: "CANCELLED" })).toEqual({ situacao: "cancelados", periodo: "2026", q: "whey", pagina: undefined })
    expect(orderListEntriesOf(query, { situation: undefined, search: "" })).toEqual({ situacao: undefined, periodo: "2026", q: undefined, pagina: undefined })
  })

  it("knows when nothing narrows the list", () => {
    expect(isFiltered({ situation: undefined, period: undefined, search: "", page: 2 })).toBe(false)
    expect(isFiltered({ situation: undefined, period: "3m", search: "", page: 1 })).toBe(true)
  })
})
