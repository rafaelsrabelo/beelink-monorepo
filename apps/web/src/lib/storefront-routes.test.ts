// Libs
import { describe, expect, it } from "vitest"

// App
import { accountOrderNumberOf, conversationOrderOf, listingFiltersOf, safeBackOf, sectionOf, signInModeOf, storefrontRoutes, toggledOption, accountTabOf } from "./storefront-routes"

const routes = storefrontRoutes({
  slug: "mutante",
  routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } },
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

describe("a landing page's address", () => {
  it("is under lp, whatever words the shop speaks", () => {
    const english = storefrontRoutes({
      slug: "mutante",
      routeWords: { products: "products", categories: "categories", search: "search", cart: "cart", signIn: "login", verifyEmail: "verify-email", resetPassword: "reset-password", account: "account", accountTabs: { orders: "orders", favorites: "favorites", reviews: "reviews", cashback: "cashback", profile: "profile", messages: "messages" } },
    })

    expect(routes.landing("lancamento")).toBe("/mutante/lp/lancamento")
    expect(english.landing("lancamento")).toBe("/mutante/lp/lancamento")
  })
})

describe("the sign-in page's addresses", () => {
  it("is a route word of its own, with its faces and its way back in the address", () => {
    const shop = { slug: "loja", routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } } }
    const shopRoutes = storefrontRoutes(shop)

    expect(sectionOf("entrar", shop.routeWords)).toEqual({ kind: "signIn" })
    expect(shopRoutes.signIn()).toBe("/loja/entrar")
    expect(shopRoutes.signIn({ mode: "criar", back: "/loja/carrinho" })).toBe("/loja/entrar?modo=criar&voltar=%2Floja%2Fcarrinho")
    expect(signInModeOf("senha")).toBe("senha")
    expect(signInModeOf("qualquer")).toBe("entrar")
    // Where the shopper's e-mailed links open (BEELINK-149): pages of their own, with the token.
    expect(sectionOf("confirmar-email", shop.routeWords)).toEqual({ kind: "verifyEmail" })
    expect(sectionOf("nova-senha", shop.routeWords)).toEqual({ kind: "resetPassword" })
    expect(shopRoutes.resetPassword({ token: "t", back: "/loja/carrinho" })).toBe("/loja/nova-senha?token=t&voltar=%2Floja%2Fcarrinho")
    // A shop read from the cache before the API spelled these words has none, and nothing matches them.
    expect(sectionOf("undefined", { ...shop.routeWords, verifyEmail: undefined as unknown as string })).toEqual({ kind: "category", slug: "undefined" })
  })

  it("follows a return path only inside the shop", () => {
    expect(safeBackOf({ slug: "loja" }, "/loja/carrinho")).toBe("/loja/carrinho")
    expect(safeBackOf({ slug: "loja" }, "/loja")).toBe("/loja")
    // The front door with the product a heart asked to like on the way back.
    expect(safeBackOf({ slug: "loja" }, "/loja?curtir=p-1")).toBe("/loja?curtir=p-1")
    for (const unsafe of ["https://evil.example", "//evil.example", "/lojaoutra", "/lojaoutra?x=1", "/loja?x=//evil.example", "/loja//x", "/loja/../outra", "/loja/%2e%2e/outra", "/loja/.%2E/outra", undefined]) {
      expect(safeBackOf({ slug: "loja" }, unsafe)).toBe("/loja")
    }
  })

  it("keeps to the site when the slug itself is not one", () => {
    for (const slug of ["/evil.example", "\\evil.example", ""]) {
      expect(safeBackOf({ slug }, `/${slug}`)).toBe("/")
    }
  })
})


describe("the shopper's area", () => {
  const shop = { slug: "loja", routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } } }

  it("addresses each tab under the account, in the shop's words", () => {
    expect(storefrontRoutes(shop).account()).toBe("/loja/conta")
    expect(storefrontRoutes(shop).accountTab("profile")).toBe("/loja/conta/perfil")
    expect(storefrontRoutes({ ...shop, routeWords: { ...shop.routeWords, account: "account", accountTabs: { ...shop.routeWords.accountTabs, profile: "profile" } } }).accountTab("profile")).toBe("/loja/account/profile")
  })

  it("reads a third segment back into its tab, and nothing else into one", () => {
    expect(accountTabOf("perfil", shop.routeWords)).toBe("profile")
    expect(accountTabOf("pedidos", shop.routeWords)).toBe("orders")
    expect(accountTabOf("profile", shop.routeWords)).toBeNull()
    expect(accountTabOf("", shop.routeWords)).toBeNull()
  })
})

describe("an order's address", () => {
  const shop = { slug: "loja", routeWords: { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } } }

  it("sits under the orders tab, and its receipt is the same page asked as a document", () => {
    expect(storefrontRoutes(shop).accountOrder(14)).toBe("/loja/conta/pedidos/14")
    expect(storefrontRoutes(shop).accountOrder(14, { receipt: true })).toBe("/loja/conta/pedidos/14?comprovante=1")
  })

  it("has its conversation on the conversations' tab, named by the order", () => {
    expect(storefrontRoutes(shop).accountConversation(14)).toBe("/loja/conta/conversas?pedido=14")
    expect(conversationOrderOf({ pedido: "14" })).toBe(14)
    expect(conversationOrderOf({ pedido: "abc" })).toBeNull()
    expect(conversationOrderOf({ pedido: ["14", "15"] })).toBeNull()
    expect(conversationOrderOf({})).toBeNull()
  })

  /** A fourth segment is never a product: anything but an order number under the orders word is a 404. */
  it("reads an order number only under the orders word, and nothing that is not one", () => {
    expect(accountOrderNumberOf("pedidos", "14", shop.routeWords)).toBe(14)
    expect(accountOrderNumberOf("perfil", "14", shop.routeWords)).toBeNull()
    for (const sub of ["0", "014", "abc", "14a", "-1", "2147483648", "99999999999"]) {
      expect(accountOrderNumberOf("pedidos", sub, shop.routeWords)).toBeNull()
    }
    expect(accountOrderNumberOf("pedidos", "2147483647", shop.routeWords)).toBe(2147483647)
  })
})

describe("a shop at its own domain (BEELINK-283)", () => {
  const words = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }
  const own = storefrontRoutes({ slug: "loja", routeWords: words, ownDomain: true })
  const platform = storefrontRoutes({ slug: "loja", routeWords: words })

  it("has its front door at the root, never at the empty string", () => {
    expect(own.home).toBe("/")
    expect(platform.home).toBe("/loja")
  })

  /** Every address the shop window renders: the same one as on the platform's host, less the slug. */
  it("spells every address without the slug, and never with two slashes", () => {
    const ask = (routes: typeof own): string[] => [
      routes.catalog(),
      routes.catalog({ page: 2, category: "blusas", search: "seda", sort: "menor-preco" }),
      routes.categories(),
      routes.category("blusas"),
      routes.category("blusas", { page: 3, discount: true }),
      routes.search("seda", { category: "blusas" }),
      routes.cart(),
      routes.cart({ reordered: 14, trimmed: true }),
      routes.signIn(),
      routes.signIn({ mode: "criar", back: routes.cart() }),
      routes.verifyEmail({ token: "t", back: routes.home }),
      routes.resetPassword({ token: "t" }),
      routes.account(),
      routes.accountTab("profile"),
      routes.accountTab("orders", { situacao: "ACTIVE" }),
      routes.accountConversation(14),
      routes.accountOrder(14, { payment: true }),
      routes.product("bolsa-amora"),
      routes.landing("dia-das-maes"),
    ]
    const there = ask(own)
    const here = ask(platform)

    for (const [index, address] of there.entries()) {
      expect(address.startsWith("/")).toBe(true)
      expect(address.startsWith("//")).toBe(false)
      expect(address).not.toMatch(/^\/loja(\/|\?|$)/)
      // A `voltar` inside the address is one of the shop's own addresses too, spelled the same way.
      expect(here[index]).toBe(`/loja${address}`.replaceAll("voltar=%2F", "voltar=%2Floja%2F").replace("voltar=%2Floja%2F&", "voltar=%2Floja&").replace(/voltar=%2Floja%2F$/, "voltar=%2Floja"))
    }
    expect(there).toContain("/produtos")
    expect(there).toContain("/conta/pedidos/14?pagamento=1")
    expect(there).toContain("/entrar?modo=criar&voltar=%2Fcarrinho")
  })

  describe("a return path", () => {
    const shop = { slug: "loja", ownDomain: true }

    it("is any path of the site, which is the shop's alone", () => {
      expect(safeBackOf(shop, "/carrinho")).toBe("/carrinho")
      expect(safeBackOf(shop, "/")).toBe("/")
      expect(safeBackOf(shop, "/?curtir=p-1")).toBe("/?curtir=p-1")
      expect(safeBackOf(shop, "/conta/perfil?endereco=novo#enderecos")).toBe("/conta/perfil?endereco=novo#enderecos")
    })

    /** The API writes a shopper's e-mails, and the `voltar` in them, with the platform's addresses. */
    it("reads an address spelled the platform's way as the page it names here", () => {
      expect(safeBackOf(shop, "/loja")).toBe("/")
      expect(safeBackOf(shop, "/loja/carrinho")).toBe("/carrinho")
      expect(safeBackOf(shop, "/loja?curtir=p-1")).toBe("/?curtir=p-1")
      // Only the slug itself: a page that merely starts the same is a page of the shop.
      expect(safeBackOf(shop, "/lojaoutra")).toBe("/lojaoutra")
    })

    it("is the front door for anything that would leave the site", () => {
      for (const unsafe of ["https://evil.example", "//evil.example", "/\\evil.example", "\\evil.example", "/x//evil.example", "/?x=//evil.example", "/\t/evil.example", "/\n/evil.example", "/loja//evil.example", "carrinho", "", undefined, null, ["/carrinho"]]) {
        expect(safeBackOf(shop, unsafe)).toBe("/")
      }
    })

    it("keeps to the site when the slug itself is not one", () => {
      expect(safeBackOf({ slug: "/evil.example", ownDomain: true }, "/carrinho")).toBe("/")
    })
  })
})
