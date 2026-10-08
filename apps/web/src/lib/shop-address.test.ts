// Libs
import { describe, expect, it } from "vitest"

// App
import { platformPathOf, SHOP_DOMAIN_HEADER, shopAddressOf, shopBaseOf, shopHomeOf } from "./shop-address"

const PLATFORM = { slug: "loja" }
const OWN = { slug: "loja", ownDomain: true }

describe("where a shop's pages are, on the request at hand (BEELINK-283)", () => {
  it("starts every address with the slug on the platform's host, and with nothing at the shop's own domain", () => {
    expect(shopBaseOf(PLATFORM)).toBe("/loja")
    expect(shopBaseOf({ slug: "loja", ownDomain: false })).toBe("/loja")
    expect(shopBaseOf(OWN)).toBe("")
  })

  /** A home that was the empty string would be an `href=""` — the page itself — and a cookie with no path. */
  it("has a front door that is never the empty string", () => {
    expect(shopHomeOf(PLATFORM)).toBe("/loja")
    expect(shopHomeOf(OWN)).toBe("/")
  })

  describe("the proxy's stamp on the request", () => {
    const stamped = (slug?: string) => new Headers(slug === undefined ? {} : { [SHOP_DOMAIN_HEADER]: slug })

    it("says the request arrived by the shop's own domain", () => {
      expect(shopAddressOf(stamped("loja"), "loja")).toEqual({ slug: "loja", ownDomain: true })
    })

    it("says nothing with no stamp: the platform's host", () => {
      expect(shopAddressOf(stamped(), "loja")).toEqual({ slug: "loja", ownDomain: false })
      expect(shopAddressOf(stamped(""), "loja").ownDomain).toBe(false)
    })

    /** At one shop's domain no other shop is at the root: its pages, its cookies and its redirects stay under its slug. */
    it("counts only for the shop it names", () => {
      expect(shopAddressOf(stamped("outra"), "loja")).toEqual({ slug: "loja", ownDomain: false })
      expect(shopAddressOf(stamped("LOJA"), "loja").ownDomain).toBe(false)
      expect(shopAddressOf(stamped("loja, loja"), "loja").ownDomain).toBe(false)
    })
  })

  describe("a page's address as the API is told it", () => {
    /** The API writes a shopper's e-mails with the platform's address, and keeps a return only under `/<slug>`. */
    it("is spelled the platform's way from the shop's own domain", () => {
      expect(platformPathOf(OWN, "/")).toBe("/loja")
      expect(platformPathOf(OWN, "/carrinho")).toBe("/loja/carrinho")
      expect(platformPathOf(OWN, "/conta/pedidos/14?comprovante=1")).toBe("/loja/conta/pedidos/14?comprovante=1")
      expect(platformPathOf(OWN, "/?curtir=p-1")).toBe("/loja?curtir=p-1")
      expect(platformPathOf(OWN, "/#enderecos")).toBe("/loja#enderecos")
    })

    it("is left as it is on the platform's host, where it already is one", () => {
      expect(platformPathOf(PLATFORM, "/loja/carrinho")).toBe("/loja/carrinho")
      expect(platformPathOf(PLATFORM, "/loja")).toBe("/loja")
    })
  })
})
