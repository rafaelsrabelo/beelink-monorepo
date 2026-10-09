// Libs
import { afterEach, describe, expect, it } from "vitest"

// App
import { CART_COOKIE, cartCookieOf, decodeCart } from "./cart-cookie"
import { consentCookieOf } from "./consent-cookie"
import { originCookieOf } from "./origin-cookie"
import { popupCookieOf } from "./popup-cookie"
import { purchasesCookieOf } from "./purchase-cookie"
import type { ShopAddress } from "./shop-address"
import { shopPrefsCookieOf } from "./shop-prefs-cookie"
import { createCartStore } from "@/stores/cart"
import { createConsentStore } from "@/stores/consent"

const NOW = Date.parse("2026-10-08T12:00:00.000Z")
const PRODUCT = "01a0d395-c1ab-7399-a472-84a307bf060d"
const ORIGIN = { source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, fbclid: null, at: NOW }

/** Every cookie a page of the shop writes, as its `Set-Cookie` for one shop. */
const WRITTEN: Record<string, (shop: ShopAddress) => string> = {
  bl_cart: (shop) => cartCookieOf(shop, [{ productId: PRODUCT, variantId: null, qty: 1 }], true),
  bl_consent: (shop) => consentCookieOf(shop, "granted", true),
  bl_origin: (shop) => originCookieOf(shop, ORIGIN, NOW, true),
  bl_popup: (shop) => popupCookieOf(shop, "VISITOR", 3, true),
  "bl_popup (strip)": (shop) => popupCookieOf(shop, "CUSTOMER", 3, true, "STRIP"),
  bl_purchases: (shop) => purchasesCookieOf(shop, ["0".repeat(32)], true),
  bl_shop: (shop) => shopPrefsCookieOf(shop, "01310930", true),
}

const pathOf = (cookie: string) => /;\s*path=([^;]*)/i.exec(cookie)?.[1]

/**
 * At the shop's own domain a page sits at `/produtos`, and the browser sends — and shows the page —
 * a cookie only under its path: one written on `/<slug>` would never be read again. The cart would
 * empty at every page, the cookie notice would ask again, and a purchase would be told twice.
 */
describe("the cookies a shop's pages write, at its own domain (BEELINK-283)", () => {
  it.each(Object.keys(WRITTEN))("%s is on the whole site there, and on the shop's path at the platform's host", (name) => {
    const write = WRITTEN[name]
    if (!write) throw new Error(name)

    expect(pathOf(write({ slug: "loja", ownDomain: true }))).toBe("/")
    expect(pathOf(write({ slug: "loja" }))).toBe("/loja")
    expect(pathOf(write({ slug: "loja", ownDomain: false }))).toBe("/loja")
  })

  describe("as the browser keeps them, on a page with no slug in its address", () => {
    const cookieNow = (name: string) => document.cookie.split("; ").find((entry) => entry.startsWith(`${name}=`))?.slice(name.length + 1)

    afterEach(() => {
      for (const path of ["/", "/loja"]) for (const name of [CART_COOKIE, "bl_consent"]) document.cookie = `${name}=; Path=${path}; Max-Age=0`
      window.history.replaceState(null, "", "/")
    })

    it("the cart survives a reload at /carrinho", () => {
      window.history.replaceState(null, "", "/carrinho")
      const store = createCartStore({ slug: "loja", ownDomain: true }, [])

      store.getState().add({ productId: PRODUCT, variantId: null, qty: 2 })

      expect(decodeCart(cookieNow(CART_COOKIE))).toEqual([{ productId: PRODUCT, variantId: null, qty: 2 }])
    })

    /** What the slug's path did there before this: written, and never seen by the page that wrote it. */
    it("which a cart on the shop's slug would not", () => {
      window.history.replaceState(null, "", "/carrinho")
      const store = createCartStore({ slug: "loja" }, [])

      store.getState().add({ productId: PRODUCT, variantId: null, qty: 2 })

      expect(cookieNow(CART_COOKIE)).toBeUndefined()
    })

    it("the answer about tracking is read back on the next page", () => {
      window.history.replaceState(null, "", "/produtos")
      createConsentStore({ slug: "loja", ownDomain: true }, null).getState().accept()

      window.history.replaceState(null, "", "/conta/pedidos")
      expect(cookieNow("bl_consent")).toBe("granted")
    })
  })
})
