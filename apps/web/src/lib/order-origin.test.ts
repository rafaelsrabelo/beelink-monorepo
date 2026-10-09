// Libs
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

// App
import { marketingConsentAt, orderOriginOf } from "./order-origin"
import { encodeOrigin, type VisitOrigin } from "./origin-cookie"
import { shopAt } from "./storefront-data"

vi.mock("./storefront-data", () => ({ shopAt: vi.fn() }))

const NOW = Date.parse("2026-10-06T12:00:00.000Z")
const ARRIVED = NOW - 3 * 86_400_000
const FBP = "fb.1.1759795200000.1234567890"
const kept: VisitOrigin = { source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, fbclid: "abc123", at: ARRIVED }
const originCookie = (origin: VisitOrigin) => `bl_origin=${encodeOrigin(origin)}`

function request(init: { cookie?: string; referer?: string; userAgent?: string | null; host?: string; ownDomainOf?: string } = {}, slug = "loja") {
  const headers = new Headers({ "content-type": "application/json" })
  if (init.cookie) headers.set("cookie", init.cookie)
  if (init.referer) headers.set("referer", init.referer)
  if (init.userAgent !== null) headers.set("user-agent", init.userAgent ?? "Mozilla/5.0 (teste)")
  if (init.host) headers.set("x-forwarded-host", init.host)
  // The proxy's stamp: the request arrived by that shop's own domain.
  if (init.ownDomainOf) headers.set("x-bl-shop-domain", init.ownDomainOf)
  return new NextRequest(`http://localhost:3000/${slug}/api/orders`, { method: "POST", headers, body: "{}" })
}

afterEach(() => vi.mocked(shopAt).mockReset())

describe("what an order says of where its buyer came from, read on the server (BEELINK-275)", () => {
  describe("without the buyer's yes", () => {
    it("sends the campaign, and nothing of the browser — even when the cookie still holds a click", () => {
      const fields = orderOriginOf(request({ cookie: `${originCookie(kept)}; _fbp=${FBP}`, referer: "http://localhost:3000/loja/carrinho" }), "loja", false, NOW)

      expect(fields).toEqual({ origin: { source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null, arrivedAt: new Date(ARRIVED).toISOString() } })
      expect(JSON.stringify(fields)).not.toMatch(/abc123|fb\.1|Mozilla|carrinho/)
    })

    it("sends nothing at all for a visitor who came by no campaign", () => {
      expect(orderOriginOf(request({ cookie: `_fbp=${FBP}` }), "loja", false, NOW)).toEqual({})
      // An ad's click alone, left in the cookie from when the yes stood, is not a campaign.
      expect(orderOriginOf(request({ cookie: originCookie({ ...kept, source: null, medium: null, campaign: null }) }), "loja", false, NOW)).toEqual({})
    })
  })

  describe("with the buyer's yes", () => {
    it("adds the click with its instant, Meta's _fbp, the user agent and the page, without its query", () => {
      const fields = orderOriginOf(request({ cookie: `${originCookie(kept)}; _fbp=${FBP}`, referer: "http://localhost:3000/loja/carrinho?cupom=VIP#fim" }), "loja", true, NOW)

      expect(fields.origin).toMatchObject({ source: "facebook", campaign: "teste" })
      expect(fields.marketingConsent).toEqual({
        fbclid: "abc123",
        clickedAt: new Date(ARRIVED).toISOString(),
        fbp: FBP,
        userAgent: "Mozilla/5.0 (teste)",
        pageUrl: "http://localhost:3000/loja/carrinho",
      })
    })

    it("says the yes alone when the browser brought nothing else", () => {
      expect(orderOriginOf(request({ userAgent: null }), "loja", true, NOW)).toEqual({ marketingConsent: { fbclid: null, clickedAt: null, fbp: null, userAgent: null, pageUrl: null } })
    })

    it("sends an ad's click with no labels as a click, and no campaign", () => {
      const fields = orderOriginOf(request({ cookie: originCookie({ ...kept, source: null, medium: null, campaign: null }) }), "loja", true, NOW)

      expect(fields.origin).toBeUndefined()
      expect(fields.marketingConsent).toMatchObject({ fbclid: "abc123", clickedAt: new Date(ARRIVED).toISOString() })
    })

    it("drops an _fbp that is not one, and cuts a user agent", () => {
      const fields = orderOriginOf(request({ cookie: "_fbp=<script>", userAgent: `UA\u0007${"x".repeat(900)}` }), "loja", true, NOW)

      expect(fields.marketingConsent?.fbp).toBeNull()
      expect(fields.marketingConsent?.userAgent).toHaveLength(512)
    })

    it("takes the page only from this site and from under this shop's path", () => {
      const pageOf = (referer: string, host?: string) => orderOriginOf(request({ referer, host }), "loja", true, NOW).marketingConsent?.pageUrl

      expect(pageOf("http://localhost:3000/loja")).toBe("http://localhost:3000/loja")
      expect(pageOf("https://beelink.biz/loja/carrinho", "beelink.biz")).toBeNull() // the request's protocol is http here
      expect(pageOf("http://beelink.biz/loja/carrinho", "beelink.biz")).toBe("http://beelink.biz/loja/carrinho")
      for (const foreign of ["https://evil.example/loja/carrinho", "http://localhost:3000/outra-loja/carrinho", "http://localhost:3000/loja-2/carrinho", "http://localhost:3000/", "not a url", `http://localhost:3000/loja/${"a".repeat(600)}`]) {
        expect(pageOf(foreign), foreign.slice(0, 50)).toBeNull()
      }
    })

    /** There the whole site is the shop's, and no page of it sits under the slug. */
    it("takes any page of the site at the shop's own domain (BEELINK-283)", () => {
      const pageOf = (referer: string, ownDomainOf = "loja") => orderOriginOf(request({ referer, host: "minhaloja.com.br", ownDomainOf }), "loja", true, NOW).marketingConsent?.pageUrl

      expect(pageOf("http://minhaloja.com.br/carrinho?cupom=VIP")).toBe("http://minhaloja.com.br/carrinho")
      expect(pageOf("http://minhaloja.com.br/")).toBe("http://minhaloja.com.br/")
      expect(pageOf("http://evil.example/carrinho")).toBeNull()
      // Another shop's stamp is no stamp: only what is under this shop's slug is its page.
      expect(pageOf("http://minhaloja.com.br/carrinho", "outra")).toBeNull()
    })
  })

  it("reads a cookie past its thirty days, or edited into nonsense, as no origin", () => {
    expect(orderOriginOf(request({ cookie: originCookie({ ...kept, at: NOW - 31 * 86_400_000 }) }), "loja", false, NOW)).toEqual({})
    expect(orderOriginOf(request({ cookie: "bl_origin=%7Bnope" }), "loja", false, NOW)).toEqual({})
  })

  describe("whether the buyer's yes stands at this shop", () => {
    it("takes the shop's own bl_consent saying yes and the shop having a pixel", async () => {
      vi.mocked(shopAt).mockResolvedValue({ metaPixelId: "123456789012345" } as Awaited<ReturnType<typeof shopAt>>)

      expect(await marketingConsentAt(request({ cookie: "bl_consent=granted" }), "loja")).toBe(true)
      expect(shopAt).toHaveBeenCalledWith("loja")
    })

    it("is no for a no, for no answer and for an answer nobody gave — without asking for the shop", async () => {
      for (const cookie of ["bl_consent=denied", "bl_cart=x.y.1", "bl_consent=yes"]) expect(await marketingConsentAt(request({ cookie }), "loja"), cookie).toBe(false)
      expect(shopAt).not.toHaveBeenCalled()
    })

    it("is no at a shop with no pixel, whatever a cookie left from before says, and at one that could not be read", async () => {
      vi.mocked(shopAt).mockResolvedValueOnce({ metaPixelId: null } as Awaited<ReturnType<typeof shopAt>>)
      expect(await marketingConsentAt(request({ cookie: "bl_consent=granted" }), "loja")).toBe(false)

      vi.mocked(shopAt).mockResolvedValueOnce(null)
      expect(await marketingConsentAt(request({ cookie: "bl_consent=granted" }), "loja")).toBe(false)

      vi.mocked(shopAt).mockRejectedValueOnce(new Error("down"))
      expect(await marketingConsentAt(request({ cookie: "bl_consent=granted" }), "loja")).toBe(false)
    })
  })
})
