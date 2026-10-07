// Libs
import { describe, expect, it } from "vitest"

// App
import { CUSTOMER_NOTICE_BASE, POPUP_COOKIE, POPUP_MAX_AGE_SECONDS, decodePopupSeen, popupCookieOf, popupNoticeVersion, popupSeen } from "./popup-cookie"

/** BEELINK-306: what is remembered is one shop's, and only that a pop-up was closed. */
describe("the pop-up cookie", () => {
  it("is ours, and lasts thirty days", () => {
    expect(POPUP_COOKIE).toBe("bl_popup")
    expect(POPUP_MAX_AGE_SECONDS).toBe(30 * 24 * 60 * 60)
  })

  it("is written on the shop's own path, readable by the page, and Secure on https", () => {
    expect(popupCookieOf("loja-a", "VISITOR", 3, false)).toBe(`bl_popup=3; Path=/loja-a; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`)
    expect(popupCookieOf("loja-b", "VISITOR", 12, true)).toBe(`bl_popup=12; Path=/loja-b; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
    expect(popupCookieOf("loja-b", "CUSTOMER", 12, true)).toBe(`bl_popup=1000000012; Path=/loja-b; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
    // The page writes it at the click: an httpOnly cookie could not be.
    expect(popupCookieOf("loja-a", "CUSTOMER", 3, true)).not.toMatch(/httponly/i)
  })

  // The published privacy policy: "guarda só um número que identifica o aviso fechado, e nada sobre você".
  it("holds one whole number — a notice's version — and nothing about the person, for either notice", () => {
    for (const notice of ["VISITOR", "CUSTOMER"] as const) {
      const [pair, ...attributes] = popupCookieOf("loja", notice, 7, false).split("; ")

      expect(pair).toMatch(/^bl_popup=[1-9]\d*$/)
      expect(attributes).toEqual(["Path=/loja", `Max-Age=${POPUP_MAX_AGE_SECONDS}`, "SameSite=Lax"])
    }
  })

  it("numbers the two notices apart: the invitation by the pop-up's revision, the coupon's from a base no revision reaches", () => {
    expect(popupNoticeVersion("VISITOR", 7)).toBe(7)
    expect(popupNoticeVersion("CUSTOMER", 7)).toBe(CUSTOMER_NOTICE_BASE + 7)
    expect(CUSTOMER_NOTICE_BASE).toBe(1_000_000_000)
  })

  it("reads which notice was closed, at which revision", () => {
    expect(decodePopupSeen("1")).toEqual({ notice: "VISITOR", revision: 1 })
    expect(decodePopupSeen("42")).toEqual({ notice: "VISITOR", revision: 42 })
    expect(decodePopupSeen("1000000001")).toEqual({ notice: "CUSTOMER", revision: 1 })
    expect(decodePopupSeen("1000000042")).toEqual({ notice: "CUSTOMER", revision: 42 })
  })

  it("reads back what it writes", () => {
    for (const notice of ["VISITOR", "CUSTOMER"] as const) {
      const value = popupCookieOf("loja", notice, 5, false).split(";")[0]?.split("=")[1]

      expect(decodePopupSeen(value)).toEqual({ notice, revision: 5 })
    }
  })

  // BEELINK-310 changed what the number can be, not what the cookies already out there mean.
  it("reads a cookie written before there were two notices exactly as it was meant: the invitation, closed", () => {
    expect(decodePopupSeen("3")).toEqual({ notice: "VISITOR", revision: 3 })
    expect(popupSeen(decodePopupSeen("3"), "VISITOR", 3)).toBe(true)
  })

  it("reads no cookie, or one somebody edited, as never closed", () => {
    for (const raw of [undefined, "", "0", "-1", "1.5", "01", "1e3", "sim", "3;4", " 3", "3c", "c3", "1000000000", "2000000000", "2000000001", "9999999999", "99999999999"]) expect(decodePopupSeen(raw)).toBeNull()
  })

  // The policy names the cookie and its 30 days; a change here is a new version of that text.
  it("lasts what the privacy policy says it lasts, and holds what it says it holds", async () => {
    const { legalTexts } = await import("@/locales/legal/pt-BR")
    const line = JSON.stringify(legalTexts.privacy).split('","').find((item) => item.startsWith(`${POPUP_COOKIE}: `))

    expect(line).toContain(`dura ${POPUP_MAX_AGE_SECONDS / 86_400} dias`)
    expect(line).toContain("guarda só um número que identifica o aviso fechado, e nada sobre você")
    expect(line).toContain("vale só para aquela loja")
  })
})

describe("popupSeen", () => {
  const invitation = (revision: number) => ({ notice: "VISITOR", revision }) as const
  const coupon = (revision: number) => ({ notice: "CUSTOMER", revision }) as const

  it("is false for a browser that never closed one, for either notice", () => {
    expect(popupSeen(null, "VISITOR", 1)).toBe(false)
    expect(popupSeen(null, "CUSTOMER", 1)).toBe(false)
  })

  it("is true for the invitation a visitor closed", () => {
    expect(popupSeen(invitation(3), "VISITOR", 3)).toBe(true)
  })

  // The visitor who closes the invitation, opens an account and comes back: the code is news.
  it("is false for the coupon's notice when only the invitation was closed", () => {
    expect(popupSeen(invitation(3), "CUSTOMER", 3)).toBe(false)
    expect(popupSeen(invitation(9), "CUSTOMER", 3)).toBe(false)
  })

  it("is true for the coupon's notice a customer closed", () => {
    expect(popupSeen(coupon(3), "CUSTOMER", 3)).toBe(true)
  })

  it("is true for the invitation too once the coupon's notice was closed: nobody who read the code is invited again", () => {
    expect(popupSeen(coupon(3), "VISITOR", 3)).toBe(true)
  })

  it("is false for both once the shopkeeper changed what the pop-up says: the new one may be shown once", () => {
    expect(popupSeen(invitation(3), "VISITOR", 4)).toBe(false)
    expect(popupSeen(coupon(3), "CUSTOMER", 4)).toBe(false)
    expect(popupSeen(coupon(3), "VISITOR", 4)).toBe(false)
  })

  it("stays true for a revision past the current one — a cookie cannot be older than the pop-up it closed", () => {
    expect(popupSeen(invitation(9), "VISITOR", 4)).toBe(true)
    expect(popupSeen(coupon(9), "CUSTOMER", 4)).toBe(true)
  })
})
