// Libs
import { describe, expect, it } from "vitest"

// App
import { decodePurchases, PURCHASES_COOKIE, PURCHASES_KEPT, PURCHASES_MAX_AGE_SECONDS, purchasesCookieOf, purchasesFromCookies, rememberPurchase, wasPurchaseTold } from "./purchase-cookie"

const A = "0b9f6c1e-5a44-4a8b-9d55-3f1f1c2a7e10"
const B = "0b9f6c1e-5a44-4a8b-9d55-3f1f1c2a7e11"
const packed = (id: string) => id.replaceAll("-", "")
/** The n-th of many orders. */
const order = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`

describe("the orders whose purchase a browser already told", () => {
  it("is the shop's own cookie, on its path, for seven days", () => {
    expect(PURCHASES_COOKIE).toBe("bl_purchases")
    expect(purchasesCookieOf("loja-a", [packed(A)], false)).toBe(`bl_purchases=${packed(A)}; Path=/loja-a; Max-Age=${PURCHASES_MAX_AGE_SECONDS}; SameSite=Lax`)
    expect(purchasesCookieOf("loja-b", [packed(A), packed(B)], true)).toBe(`bl_purchases=${packed(A)}.${packed(B)}; Path=/loja-b; Max-Age=${PURCHASES_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
    expect(PURCHASES_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 7)
  })

  it("remembers an order by its id, however it is written, and once", () => {
    const told = rememberPurchase(rememberPurchase([], A), A.toUpperCase())

    expect(told).toEqual([packed(A)])
    expect(wasPurchaseTold(told, A)).toBe(true)
    expect(wasPurchaseTold(told, B)).toBe(false)
  })

  it("survives the trip through the cookie", () => {
    const cookies = `bl_cart=x.y.1; ${purchasesCookieOf("loja", rememberPurchase(rememberPurchase([], A), B), false).split(";")[0]}; bl_consent=granted`

    expect(purchasesFromCookies(cookies)).toEqual([packed(A), packed(B)])
    expect(purchasesFromCookies("bl_consent=granted")).toEqual([])
  })

  it("drops what is not an order's id: the cookie is the visitor's to edit", () => {
    expect(decodePurchases(`${packed(A)}.nope..<script>.${packed(B)}`)).toEqual([packed(A), packed(B)])
    expect(decodePurchases(undefined)).toEqual([])
    expect(rememberPurchase([packed(A)], "not-an-id")).toEqual([packed(A)])
    expect(wasPurchaseTold([packed(A)], "not-an-id")).toBe(false)
  })

  it("keeps the latest twenty, and lets the oldest go", () => {
    let told: string[] = []
    for (let n = 1; n <= PURCHASES_KEPT + 1; n += 1) told = rememberPurchase(told, order(n))

    expect(told).toHaveLength(PURCHASES_KEPT)
    expect(wasPurchaseTold(told, order(1))).toBe(false)
    expect(wasPurchaseTold(told, order(2))).toBe(true)
    expect(wasPurchaseTold(told, order(PURCHASES_KEPT + 1))).toBe(true)
    // Twenty ids and their dots: far under a cookie's 4 KB.
    expect(purchasesCookieOf("loja", told, true).length).toBeLessThan(800)
  })
})
