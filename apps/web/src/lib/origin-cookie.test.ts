// Libs
import { describe, expect, it } from "vitest"

// App
import { arrivalOf, cleanClickId, cleanLabel, decodeOrigin, encodeOrigin, ORIGIN_COOKIE, ORIGIN_MAX_AGE_SECONDS, originAfter, originCookieOf, originFromCookies, sameOrigin, withoutClick, type VisitOrigin } from "./origin-cookie"

const NOW = Date.parse("2026-10-06T12:00:00.000Z")
const DAY = 86_400_000
const LANDING = "?utm_source=facebook&utm_medium=cpc&utm_campaign=teste&fbclid=abc123"

const origin = (over: Partial<VisitOrigin> = {}): VisitOrigin => ({ source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, fbclid: null, at: NOW, ...over })
/** The value a cookie string carries, as `document.cookie` would hand it. */
const valueOf = (cookie: string) => cookie.split(";")[0]!.slice(ORIGIN_COOKIE.length + 1)

describe("where a visitor came to a shop from (BEELINK-275)", () => {
  describe("what an address says", () => {
    it("reads the campaign's labels and Meta's click, dated at the arrival", () => {
      expect(arrivalOf(LANDING, NOW)).toEqual(origin({ fbclid: "abc123" }))
      expect(arrivalOf("?utm_source=Insta&utm_medium=Social&utm_campaign=Dia das Mães&utm_content=Vídeo 1&utm_term=Whey", NOW)).toEqual(
        origin({ source: "insta", medium: "social", campaign: "Dia das Mães", content: "Vídeo 1", term: "Whey" }),
      )
    })

    it("says nothing for an address with no campaign", () => {
      for (const search of ["", "?busca=whey", "?utm_content=banner&utm_term=whey", "?utm_source=", "?utm_source=%20%20", "?fbclid=abc def"]) expect(arrivalOf(search, NOW), search).toBeNull()
    })

    it("reads an ad's click with no labels as an arrival of its own", () => {
      expect(arrivalOf("?fbclid=IwAR0abc-DEF_1.2&utm_content=x", NOW)).toEqual(origin({ source: null, medium: null, campaign: null, fbclid: "IwAR0abc-DEF_1.2" }))
    })
  })

  describe("cleaning what a stranger wrote", () => {
    it("drops control and invisible characters, squeezes spaces and cuts at eighty whole characters", () => {
      expect(cleanLabel("  Black\u0000 Friday\n\t2026 ‮ ")).toBe("Black Friday 2026")
      expect(cleanLabel("x".repeat(500))).toHaveLength(80)
      expect(cleanLabel("🐝".repeat(100))).toBe("🐝".repeat(80))
      expect(cleanLabel("FaceBook", true)).toBe("facebook")
      for (const nothing of ["", " ​ ", null, undefined, 3, {}]) expect(cleanLabel(nothing)).toBeNull()
    })

    it("keeps a click identifier whole or not at all", () => {
      expect(cleanClickId("IwAR0abc-DEF_1.2")).toBe("IwAR0abc-DEF_1.2")
      for (const bad of ["", "a b", "a;b", "<x>", "a".repeat(501), null, 4]) expect(cleanClickId(bad), String(bad)).toBeNull()
    })
  })

  describe("the rule of what is kept", () => {
    const arrival = origin({ fbclid: "abc123" })

    it("keeps the labels with or without a yes, and the click only with one", () => {
      expect(originAfter(null, arrival, false)).toEqual(origin())
      expect(originAfter(null, arrival, true)).toEqual(arrival)
    })

    it("keeps nothing of an arrival that was only a click, without a yes", () => {
      const click = origin({ source: null, medium: null, campaign: null, fbclid: "abc123" })

      expect(originAfter(null, click, false)).toBeNull()
      expect(originAfter(null, click, true)).toEqual(click)
      // And it does not erase the campaign kept before it.
      expect(originAfter(origin({ at: NOW - DAY }), click, false)).toEqual(origin({ at: NOW - DAY }))
    })

    it("is not erased, nor renewed, by a visit that brings no campaign", () => {
      const kept = origin({ fbclid: "abc123", at: NOW - 10 * DAY })

      expect(originAfter(kept, null, true)).toBe(kept)
      expect(originAfter(kept, null, false)).toEqual(origin({ at: NOW - 10 * DAY }))
    })

    it("is not renewed by the same arrival read again", () => {
      const kept = origin({ fbclid: "abc123", at: NOW - 10 * DAY })

      expect(originAfter(kept, arrival, true)).toBe(kept)
      expect(originAfter(withoutClick(kept), arrival, false)).toEqual(origin({ at: NOW - 10 * DAY }))
    })

    it("is replaced whole by an arrival with another campaign, whose thirty days start then", () => {
      const kept = origin({ campaign: "antiga", content: "banner", fbclid: "old", at: NOW - 10 * DAY })
      const next = origin({ source: "google", campaign: "nova" })

      expect(originAfter(kept, next, true)).toEqual(next)
      expect(originAfter(kept, next, false)).toEqual(next)
    })

    it("takes a yes given after the arrival: the same campaign, now with its click, dated at the arrival", () => {
      const before = originAfter(null, arrival, false)
      expect(before?.fbclid).toBeNull()

      expect(originAfter(before, arrival, true)).toEqual(arrival)
    })

    it("loses the click, and only the click, when the yes no longer stands", () => {
      expect(originAfter(arrival, arrival, false)).toEqual(origin())
      expect(originAfter(origin({ source: null, medium: null, campaign: null, fbclid: "abc123" }), null, false)).toBeNull()
    })

    it("does not put this page's older arrival over a later one another tab kept", () => {
      const later = origin({ campaign: "nova", at: NOW + 1000 })

      expect(originAfter(later, arrival, true)).toBe(later)
    })
  })

  describe("the cookie", () => {
    it("is the shop's own, on its path, living what is left of thirty days since the arrival", () => {
      expect(ORIGIN_COOKIE).toBe("bl_origin")
      expect(ORIGIN_MAX_AGE_SECONDS).toBe(60 * 60 * 24 * 30)

      const fresh = originCookieOf("loja-a", origin(), NOW, false)
      expect(fresh).toMatch(/^bl_origin=[^;]+; Path=\/loja-a; Max-Age=2592000; SameSite=Lax$/)
      // Written again ten days in — to add or drop the click — it is not renewed.
      expect(originCookieOf("loja-b", origin({ at: NOW - 10 * DAY }), NOW, true)).toMatch(/; Path=\/loja-b; Max-Age=1728000; SameSite=Lax; Secure$/)
    })

    it("is removed when there is nothing to keep, or nothing left of its days", () => {
      expect(originCookieOf("loja", null, NOW, false)).toBe("bl_origin=; Path=/loja; Max-Age=0; SameSite=Lax")
      expect(originCookieOf("loja", origin({ at: NOW - 31 * DAY }), NOW, false)).toBe("bl_origin=; Path=/loja; Max-Age=0; SameSite=Lax")
    })

    it("carries nothing a cookie cannot: no space, semicolon, comma or quote, whatever the labels hold", () => {
      const value = encodeOrigin(origin({ campaign: 'a; b, "c" = d\\ é 🐝' }))

      expect(value).toMatch(/^[A-Za-z0-9%._~!*'()-]+$/)
      expect(decodeOrigin(value, NOW)?.campaign).toBe('a; b, "c" = d\\ é 🐝')
    })

    it("survives the trip through the browser's cookies, and through the server's reader, which decodes first", () => {
      const kept = origin({ content: "Vídeo 1", term: "whey", fbclid: "abc123", at: NOW - DAY })
      const value = valueOf(originCookieOf("loja", kept, NOW, false))

      expect(originFromCookies(`bl_cart=x.y.1; bl_origin=${value}; bl_consent=granted`, NOW)).toEqual(kept)
      expect(decodeOrigin(decodeURIComponent(value), NOW)).toEqual(kept)
      expect(originFromCookies("bl_cart=x.y.1", NOW)).toBeNull()
    })

    it("stays under what a browser keeps: past the size, the two labels that only describe go", () => {
      const long = "語".repeat(80)
      const value = encodeOrigin(origin({ source: long, medium: long, campaign: long, content: long, term: long, fbclid: "a".repeat(500) }))

      expect(value.length).toBeLessThan(3500)
      expect(decodeOrigin(value, NOW)).toMatchObject({ source: long, campaign: long, content: null, term: null, fbclid: "a".repeat(500) })
    })

    it("reads an edited cookie as if it had come out of an address: cleaned, bounded, or nothing", () => {
      const pack = (value: object) => encodeURIComponent(JSON.stringify(value))

      expect(decodeOrigin(pack({ s: "  FaceBook\u0000", c: "x".repeat(300), f: "a b", a: NOW }), NOW)).toEqual(origin({ medium: null, campaign: "x".repeat(80) }))
      for (const bad of ["", "granted", "%7B", "[1]", "null", pack({ s: "facebook" }), pack({ s: "facebook", a: "now" }), pack({ a: NOW }), pack({ n: "banner", a: NOW }), "x".repeat(5000)]) {
        expect(decodeOrigin(bad, NOW), bad.slice(0, 20)).toBeNull()
      }
    })

    it("is nothing past its thirty days, or dated in the future", () => {
      const pack = (at: number) => encodeOrigin(origin({ at }))

      expect(decodeOrigin(pack(NOW - 29 * DAY), NOW)).not.toBeNull()
      expect(decodeOrigin(pack(NOW - 30 * DAY), NOW)).toBeNull()
      expect(decodeOrigin(pack(NOW + DAY), NOW)).toBeNull()
      // A clock a little ahead wrote it: it arrived now.
      expect(decodeOrigin(pack(NOW + 60_000), NOW)?.at).toBe(NOW)
    })
  })

  it("tells two origins apart by what they say and when", () => {
    expect(sameOrigin(null, null)).toBe(true)
    expect(sameOrigin(origin(), null)).toBe(false)
    expect(sameOrigin(origin(), origin())).toBe(true)
    expect(sameOrigin(origin(), origin({ fbclid: "abc123" }))).toBe(false)
    expect(sameOrigin(origin(), origin({ at: NOW - 1 }))).toBe(false)
  })
})
