// Libs
import { describe, expect, it } from "vitest"

// App
import { POPUP_COOKIE, POPUP_MAX_AGE_SECONDS, decodePopupSeen, popupCookieOf, popupSeen } from "./popup-cookie"

/** BEELINK-306: what is remembered is one shop's, and only that a pop-up was closed. */
describe("the pop-up cookie", () => {
  it("is ours, and lasts thirty days", () => {
    expect(POPUP_COOKIE).toBe("bl_popup")
    expect(POPUP_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60)
  })

  it("is written on the shop's own path, readable by the page, and Secure on https", () => {
    expect(popupCookieOf("loja-a", 3, false)).toBe(`bl_popup=3; Path=/loja-a; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`)
    expect(popupCookieOf("loja-b", 12, true)).toBe(`bl_popup=12; Path=/loja-b; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
    // The page writes it at the click: an httpOnly cookie could not be.
    expect(popupCookieOf("loja-a", 3, true)).not.toMatch(/httponly/i)
  })

  it("holds a revision and nothing about the person", () => {
    const [pair] = popupCookieOf("loja", 7, false).split(";")

    expect(pair).toBe("bl_popup=7")
  })

  it("reads the revision that was closed", () => {
    expect(decodePopupSeen("1")).toBe(1)
    expect(decodePopupSeen("42")).toBe(42)
  })

  it("reads no cookie, or one somebody edited, as never closed", () => {
    for (const raw of [undefined, "", "0", "-1", "1.5", "01", "1e3", "sim", "3;4", " 3", "99999999999"]) expect(decodePopupSeen(raw)).toBeNull()
  })
})

describe("popupSeen", () => {
  it("is false for a visitor who never closed one", () => {
    expect(popupSeen(null, 1)).toBe(false)
  })

  it("is true for the pop-up they closed", () => {
    expect(popupSeen(3, 3)).toBe(true)
  })

  it("is false once the shopkeeper changed what it says: the new one may be shown once", () => {
    expect(popupSeen(3, 4)).toBe(false)
  })

  it("stays true for a revision past the current one — a cookie cannot be older than the pop-up it closed", () => {
    expect(popupSeen(9, 4)).toBe(true)
  })
})
