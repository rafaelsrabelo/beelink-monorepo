// Libs
import { describe, expect, it } from "vitest"

// App
import { listingPageAskOf } from "./listing-pages"
import { catalogueQueryOf } from "./storefront-data"

describe("listingPageAskOf — the page's own question, read back from the browser", () => {
  it("reads back what catalogueQueryOf wrote, with the page asked for", () => {
    const ask = {
      category: "dindins",
      search: "coco",
      pageSize: 16,
      sort: "menor-preco" as const,
      priceMin: 3,
      priceMax: 10,
      discount: true,
      options: ["Sabor:Coco", "Tamanho:Grande"],
    }
    const query = catalogueQueryOf(ask)
    query.set("pagina", "3")

    expect(listingPageAskOf(query, 16)).toEqual({ ...ask, page: 3 })
  })

  it("refuses a page that is not a whole number, rather than answering the first one again", () => {
    expect(listingPageAskOf(new URLSearchParams(), 16)).toBeNull()
    expect(listingPageAskOf(new URLSearchParams({ pagina: "2.5" }), 16)).toBeNull()
    expect(listingPageAskOf(new URLSearchParams({ pagina: "0" }), 16)).toBeNull()
  })

  it("cleans what a visitor edited by hand as the address is cleaned, and never pages wider than the listing", () => {
    const ask = listingPageAskOf(new URLSearchParams({ pagina: "2", porPagina: "500", ordenar: "qualquer", precoMin: "abc", opcao: "semdoispontos" }), 16)

    expect(ask).toEqual({ page: 2, pageSize: 16 })
  })
})
