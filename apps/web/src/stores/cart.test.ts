// Libs
import { afterEach, beforeEach, describe, expect, it } from "vitest"

// App
import { CART_COOKIE, decodeCart } from "@/lib/cart-cookie"
import { createCartStore } from "./cart"

const product = "01a0d395-c1ab-7399-a472-84a307bf060d"
const variant = "01a0d395-c1ab-7399-a472-000000000001"

function cookieNow(): string | undefined {
  return document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CART_COOKIE}=`))
    ?.slice(CART_COOKIE.length + 1)
}

beforeEach(() => {
  // The cookie is scoped to the shop's path, so the page has to be on it to read it back.
  window.history.replaceState(null, "", "/loja/produtos")
})

afterEach(() => {
  document.cookie = `${CART_COOKIE}=; Path=/loja; Max-Age=0`
})

describe("the cart store", () => {
  it("writes through to the shop's cookie on every change", () => {
    const store = createCartStore("loja", [])

    store.getState().add({ productId: product, variantId: variant, qty: 2 })

    expect(decodeCart(cookieNow())).toEqual([{ productId: product, variantId: variant, qty: 2 }])
  })

  it("survives a reload: a new store from the cookie holds the same cart", () => {
    const first = createCartStore("loja", [])
    first.getState().add({ productId: product, variantId: null, qty: 1 })
    first.getState().add({ productId: product, variantId: null, qty: 1 })

    const reloaded = createCartStore("loja", decodeCart(cookieNow()))

    expect(reloaded.getState().lines).toEqual([{ productId: product, variantId: null, qty: 2 }])
  })

  it("removes the cookie when the cart is emptied", () => {
    const store = createCartStore("loja", [])
    store.getState().add({ productId: product, variantId: null, qty: 1 })

    store.getState().clear()

    expect(cookieNow()).toBeUndefined()
  })

  it("keeps another shop's cart out of this one", () => {
    const store = createCartStore("outra", [])
    store.getState().add({ productId: product, variantId: null, qty: 1 })

    expect(cookieNow()).toBeUndefined()
  })
})
