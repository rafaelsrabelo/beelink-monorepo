// Libs
import { describe, expect, it } from "vitest"

// App
import { listingFiltersOf, safeBackOf, sectionOf, signInModeOf, storefrontRoutes, toggledOption } from "./storefront-routes"

const routes = storefrontRoutes({
  slug: "mutante",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", account: "conta" },
})

describe("listingFiltersOf", () => {
  it("reads every filter the API knows, under the API's own keys", () => {
    expect(
      listingFiltersOf({ ordenar: "menor-preco", precoMin: "100", precoMax: "200", desconto: "1", opcao: ["Sabor:Chocolate", "Peso:900"] }),
    ).toEqual({ sort: "menor-preco", priceMin: 100, priceMax: 200, discount: true, options: ["Sabor:Chocolate", "Peso:900"] })
  })

  it("keeps a lone opcao, and drops one without a colon", () => {
    expect(listingFiltersOf({ opcao: "Sabor:Uva" })).toEqual({ options: ["Sabor:Uva"] })
    expect(listingFiltersOf({ opcao: ["semvalor", " "] })).toEqual({})
  })

  // The API parses an integer and answers 400 to anything else, and the page turns a 400 into
  // "nothing found" — so a typed price is made whole here, never refused there.
  it("makes a price whole, the floor of a minimum and the ceiling of a maximum, and swaps a crossed pair", () => {
    expect(listingFiltersOf({ precoMin: "100,50", precoMax: "199.2" })).toEqual({ priceMin: 100, priceMax: 200 })
    expect(listingFiltersOf({ precoMin: "300", precoMax: "100" })).toEqual({ priceMin: 100, priceMax: 300 })
    expect(listingFiltersOf({ precoMin: "abc", precoMax: "-5" })).toEqual({})
  })

  it("reads a least cut, in percent, and keeps desconto=1 as any discount", () => {
    expect(listingFiltersOf({ desconto: "20" })).toEqual({ discount: true, discountMinPercent: 20 })
    expect(listingFiltersOf({ desconto: "1" })).toEqual({ discount: true })
    expect(listingFiltersOf({ desconto: "0" })).toEqual({})
    expect(routes.catalog({ discount: true, discountMinPercent: 30 })).toBe("/mutante/produtos?desconto=30")
  })

  it("ignores a sort it does not know, and the shop's own order", () => {
    expect(listingFiltersOf({ ordenar: "inventado" })).toEqual({})
    expect(listingFiltersOf({ ordenar: "relevancia" })).toEqual({})
  })
})

describe("the addresses that carry filters", () => {
  const filters = listingFiltersOf({ ordenar: "maior-preco", precoMax: "200", desconto: "1", opcao: ["Sabor:Uva", "Sabor:Limão"] })

  it("repeats opcao once per value, which set() would have collapsed", () => {
    const href = routes.catalog(filters)
    const query = new URLSearchParams(href.split("?")[1])

    expect(query.getAll("opcao")).toEqual(["Sabor:Uva", "Sabor:Limão"])
    expect(query.get("ordenar")).toBe("maior-preco")
    expect(query.get("precoMax")).toBe("200")
    expect(query.get("desconto")).toBe("1")
  })

  it("carries the filters on a category and on a search, and drops the first page", () => {
    expect(routes.category("whey", { ...filters, page: 1 })).not.toContain("pagina")
    expect(routes.category("whey", { ...filters, page: 2 })).toContain("pagina=2")
    expect(routes.search("whey", { ...filters, category: "proteinas" })).toContain("categoria=proteinas")
    expect(routes.search("whey", { ...filters, category: "proteinas" })).toContain("q=whey")
  })

  it("writes nothing for the shop's own order, so the plain address stays plain", () => {
    expect(routes.catalog({ sort: "relevancia" })).toBe("/mutante/produtos")
  })
})

describe("toggledOption", () => {
  it("turns a value on, then off, keeping the rest and never a page", () => {
    const on = toggledOption({ sort: "novidades", options: ["Sabor:Uva"] }, "Peso:900")
    expect(on).toEqual({ sort: "novidades", options: ["Sabor:Uva", "Peso:900"] })

    const off = toggledOption(on, "Sabor:Uva")
    expect(off.options).toEqual(["Peso:900"])
    expect(toggledOption(off, "Peso:900").options).toBeUndefined()
  })
})

describe("the sign-in page's addresses", () => {
  it("is a route word of its own, with its faces and its way back in the address", () => {
    const shop = { slug: "loja", routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", account: "conta" } }
    const shopRoutes = storefrontRoutes(shop)

    expect(sectionOf("entrar", shop.routeWords)).toEqual({ kind: "signIn" })
    expect(shopRoutes.signIn()).toBe("/loja/entrar")
    expect(shopRoutes.signIn({ mode: "criar", back: "/loja/carrinho" })).toBe("/loja/entrar?modo=criar&voltar=%2Floja%2Fcarrinho")
    expect(signInModeOf("senha")).toBe("senha")
    expect(signInModeOf("qualquer")).toBe("entrar")
  })

  it("follows a return path only inside the shop", () => {
    expect(safeBackOf("loja", "/loja/carrinho")).toBe("/loja/carrinho")
    expect(safeBackOf("loja", "/loja")).toBe("/loja")
    for (const unsafe of ["https://evil.example", "//evil.example", "/lojaoutra", "/loja//x", undefined]) {
      expect(safeBackOf("loja", unsafe)).toBe("/loja")
    }
  })

  it("keeps to the site when the slug itself is not one", () => {
    for (const slug of ["/evil.example", "\\evil.example", ""]) {
      expect(safeBackOf(slug, `/${slug}`)).toBe("/")
    }
  })
})

