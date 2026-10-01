// Libs
import { describe, expect, it } from "vitest"

// App
import { beforeCentsOf, favoriteListApiQueryOf, favoriteListEntriesOf, favoriteListQueryOf } from "./favorite-list-query"

describe("Favoritos' address", () => {
  it("reads the filter, the order and the page in the shop's words, and anything else as the whole list", () => {
    expect(favoriteListQueryOf({ filtro: "baixou", ordem: "maior-desconto", pagina: "2" })).toEqual({ filter: "PRICE_DROPPED", sort: "DISCOUNT", page: 2 })
    expect(favoriteListQueryOf({ filtro: "constructor", ordem: "toString", pagina: "-3" })).toEqual({ filter: undefined, sort: "RECENT", page: 1 })
    expect(favoriteListQueryOf({ pagina: "99999" }).page).toBe(200)
  })

  it("asks the API only what the address narrowed", () => {
    expect(favoriteListApiQueryOf({ filter: undefined, sort: "RECENT", page: 1 })).toEqual({})
    expect(favoriteListApiQueryOf({ filter: "SOLD_OUT", sort: "PRICE_ASC", page: 3 })).toEqual({ filter: "SOLD_OUT", sort: "PRICE_ASC", page: 3 })
  })

  it("writes the address back, a changed filter starting at page one", () => {
    const asked = { filter: "ON_SALE" as const, sort: "PRICE_ASC" as const, page: 4 }
    expect(favoriteListEntriesOf(asked, { page: 5 })).toEqual({ filtro: "promocao", ordem: "menor-preco", pagina: "5" })
    expect(favoriteListEntriesOf(asked, { filter: undefined })).toEqual({ filtro: undefined, ordem: "menor-preco", pagina: undefined })
  })
})

describe("the price struck beside today's", () => {
  it("is the dearest the shopper saw: the price liked at when it dropped, or the shop's \"de\"", () => {
    expect(beforeCentsOf({ priceCents: 20990, compareAtPriceCents: null, likedPriceCents: 23990, priceDropCents: 3000 })).toBe(23990)
    expect(beforeCentsOf({ priceCents: 8990, compareAtPriceCents: 10990, likedPriceCents: 8990, priceDropCents: 0 })).toBe(10990)
    expect(beforeCentsOf({ priceCents: 8990, compareAtPriceCents: 10990, likedPriceCents: 12990, priceDropCents: 4000 })).toBe(12990)
    expect(beforeCentsOf({ priceCents: 8990, compareAtPriceCents: null, likedPriceCents: 7990, priceDropCents: 0 })).toBeNull()
  })
})
