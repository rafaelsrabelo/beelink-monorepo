// Libs
import { describe, expect, it } from "vitest"

// App
import { CUSTOMER_NOTICE_BASE, POPUP_COOKIE, POPUP_MAX_AGE_SECONDS, STRIP_NOTICE_BASE, closingRevisionOf, decodePopupSeen, noticeClosed, popupCookieOf, popupNoticeVersion, popupSeen, type NoticeSurface, type PopupNotice, type PopupSeen } from "./popup-cookie"

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
  it("holds one whole number — which notice was closed — and nothing about the person, for either notice in either form", () => {
    for (const notice of ["VISITOR", "CUSTOMER"] as const) for (const surface of ["DIALOG", "STRIP"] as const) {
      const [pair, ...attributes] = popupCookieOf("loja", notice, 7, false, surface).split("; ")

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
    expect(decodePopupSeen("1")).toEqual({ notice: "VISITOR", surface: "DIALOG", revision: 1 })
    expect(decodePopupSeen("42")).toEqual({ notice: "VISITOR", surface: "DIALOG", revision: 42 })
    expect(decodePopupSeen("1000000001")).toEqual({ notice: "CUSTOMER", surface: "DIALOG", revision: 1 })
    expect(decodePopupSeen("1000000042")).toEqual({ notice: "CUSTOMER", surface: "DIALOG", revision: 42 })
  })

  // BEELINK-311: a strip closed is remembered too — at revision 0 where the shop has no pop-up on.
  it("numbers a closed strip apart from a closed dialog, two bases further, and reads it back", () => {
    expect(STRIP_NOTICE_BASE).toBe(2_000_000_000)
    expect(popupNoticeVersion("VISITOR", 0, "STRIP")).toBe(2_000_000_000)
    expect(popupNoticeVersion("VISITOR", 7, "STRIP")).toBe(2_000_000_007)
    expect(popupNoticeVersion("CUSTOMER", 0, "STRIP")).toBe(3_000_000_000)
    expect(popupNoticeVersion("CUSTOMER", 7, "STRIP")).toBe(3_000_000_007)

    expect(decodePopupSeen("2000000000")).toEqual({ notice: "VISITOR", surface: "STRIP", revision: 0 })
    expect(decodePopupSeen("2000000007")).toEqual({ notice: "VISITOR", surface: "STRIP", revision: 7 })
    expect(decodePopupSeen("3000000000")).toEqual({ notice: "CUSTOMER", surface: "STRIP", revision: 0 })
    expect(decodePopupSeen("3999999999")).toEqual({ notice: "CUSTOMER", surface: "STRIP", revision: 999_999_999 })
  })

  it("writes a strip's closing on the shop's own path, as a dialog's is", () => {
    expect(popupCookieOf("loja-a", "VISITOR", 0, false, "STRIP")).toBe(`bl_popup=2000000000; Path=/loja-a; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`)
    expect(popupCookieOf("loja-b", "CUSTOMER", 4, true, "STRIP")).toBe(`bl_popup=3000000004; Path=/loja-b; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax; Secure`)
  })

  it("reads back what it writes", () => {
    for (const notice of ["VISITOR", "CUSTOMER"] as const) for (const surface of ["DIALOG", "STRIP"] as const) {
      const value = popupCookieOf("loja", notice, 5, false, surface).split(";")[0]?.split("=")[1]

      expect(decodePopupSeen(value)).toEqual({ notice, surface, revision: 5 })
    }
  })

  // BEELINK-310 changed what the number can be, not what the cookies already out there mean.
  it("reads a cookie written before there were two notices exactly as it was meant: the invitation, closed", () => {
    expect(decodePopupSeen("3")).toEqual({ notice: "VISITOR", surface: "DIALOG", revision: 3 })
    expect(popupSeen(decodePopupSeen("3"), "VISITOR", 3)).toBe(true)
  })

  // BEELINK-311 widened the number again; what production wrote under BEELINK-306 and BEELINK-310 means what it meant.
  it("reads the cookies already out there exactly as before: `1` the invitation closed, `1000000001` the coupon's notice closed", () => {
    const invitation = decodePopupSeen("1")
    const coupon = decodePopupSeen("1000000001")

    expect(popupSeen(invitation, "VISITOR", 1)).toBe(true)
    expect(popupSeen(invitation, "CUSTOMER", 1)).toBe(false)
    expect(popupSeen(invitation, "VISITOR", 2)).toBe(false)
    expect(popupSeen(coupon, "CUSTOMER", 1)).toBe(true)
    expect(popupSeen(coupon, "VISITOR", 1)).toBe(true)
    expect(popupSeen(coupon, "CUSTOMER", 2)).toBe(false)
  })

  it("reads no cookie, or one somebody edited, as never closed", () => {
    for (const raw of [undefined, "", "0", "-1", "1.5", "01", "1e3", "sim", "3;4", " 3", "3c", "c3", "1000000000", "4000000000", "4000000001", "9999999999", "99999999999"]) expect(decodePopupSeen(raw)).toBeNull()
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
  const invitation = (revision: number) => ({ notice: "VISITOR", surface: "DIALOG", revision }) as const
  const coupon = (revision: number) => ({ notice: "CUSTOMER", surface: "DIALOG", revision }) as const

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

/** BEELINK-311: the four closings are steps of one call, and each closes the ones before it. */
describe("noticeClosed", () => {
  const STEPS: [PopupNotice, NoticeSurface][] = [["VISITOR", "DIALOG"], ["VISITOR", "STRIP"], ["CUSTOMER", "DIALOG"], ["CUSTOMER", "STRIP"]]
  const seenAt = (step: number, revision = 3): PopupSeen => ({ notice: STEPS[step]![0], surface: STEPS[step]![1], revision })

  it("is false for everything in a browser that closed nothing", () => {
    for (const [notice, surface] of STEPS) expect(noticeClosed(null, notice, surface, 0)).toBe(false)
  })

  it("closes each step and every one before it, and none after", () => {
    for (let closed = 0; closed < STEPS.length; closed++) for (let asked = 0; asked < STEPS.length; asked++) {
      expect(noticeClosed(seenAt(closed), STEPS[asked]![0], STEPS[asked]![1], 3)).toBe(asked <= closed)
    }
  })

  // The rule BEELINK-310 set, kept for the strip: the code is news to somebody who only ever closed the invitation.
  it("leaves the coupon's notice open to whoever closed the invitation's strip", () => {
    expect(noticeClosed(seenAt(1), "CUSTOMER", "DIALOG", 3)).toBe(false)
    expect(noticeClosed(seenAt(1), "CUSTOMER", "STRIP", 3)).toBe(false)
  })

  it("leaves a dialog's reminder strip open until the strip itself is closed", () => {
    expect(noticeClosed(seenAt(0), "VISITOR", "STRIP", 3)).toBe(false)
    expect(noticeClosed(seenAt(2), "CUSTOMER", "STRIP", 3)).toBe(false)
    expect(noticeClosed(seenAt(1), "VISITOR", "STRIP", 3)).toBe(true)
    expect(noticeClosed(seenAt(3), "CUSTOMER", "STRIP", 3)).toBe(true)
  })

  it("opens every step again at a new revision of the pop-up — the strip too", () => {
    for (let closed = 0; closed < STEPS.length; closed++) for (const [notice, surface] of STEPS) expect(noticeClosed(seenAt(closed, 3), notice, surface, 4)).toBe(false)
  })

  // A shop with no pop-up on asks at revision 0: there is no revision to reopen anything.
  it("counts anything ever closed at a shop whose pop-up is off — closed is closed", () => {
    expect(noticeClosed(decodePopupSeen("2000000000"), "VISITOR", "DIALOG", 0)).toBe(true)
    expect(noticeClosed(decodePopupSeen("2000000000"), "CUSTOMER", "DIALOG", 0)).toBe(false)
    expect(noticeClosed(decodePopupSeen("3000000000"), "CUSTOMER", "DIALOG", 0)).toBe(true)
    expect(noticeClosed(decodePopupSeen("3000000000"), "VISITOR", "DIALOG", 0)).toBe(true)
    // A dialog closed while the pop-up was on, at a shop that switched it off since.
    expect(noticeClosed(decodePopupSeen("5"), "VISITOR", "DIALOG", 0)).toBe(true)
    expect(noticeClosed(decodePopupSeen("1000000005"), "CUSTOMER", "DIALOG", 0)).toBe(true)
  })

  it("opens the dialog once at a shop that switched its pop-up on after the strip was closed there", () => {
    expect(noticeClosed(decodePopupSeen("2000000000"), "VISITOR", "DIALOG", 1)).toBe(false)
    expect(noticeClosed(decodePopupSeen("3000000000"), "CUSTOMER", "DIALOG", 1)).toBe(false)
  })
})

describe("closingRevisionOf", () => {
  it("is the pop-up's revision, and 0 at a shop with none on", () => {
    expect(closingRevisionOf(null, 4)).toBe(4)
    expect(closingRevisionOf(null, 0)).toBe(0)
    expect(closingRevisionOf({ notice: "VISITOR", surface: "DIALOG", revision: 3 }, 4)).toBe(4)
  })

  // A shop that switches its pop-up off and on again must not reopen what was closed.
  it("never goes back from what the cookie already holds", () => {
    expect(closingRevisionOf({ notice: "VISITOR", surface: "DIALOG", revision: 5 }, 0)).toBe(5)
    expect(closingRevisionOf({ notice: "CUSTOMER", surface: "STRIP", revision: 9 }, 4)).toBe(9)
  })
})
