// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { StorefrontConsentGate } from "./storefront-consent-gate"
import { StorefrontConsentReopen } from "./storefront-consent-reopen"
import { StorefrontOrigin } from "./storefront-origin"
import type { ConsentChoice } from "@/lib/consent-cookie"
import { originCookieOf, originFromCookies, type VisitOrigin } from "@/lib/origin-cookie"

const PIXEL = "123456789012345"
const colors = { background: "white", primary: "rebeccapurple", header: "navy", footer: "navy" }
const LANDING = "?utm_source=facebook&utm_medium=cpc&utm_campaign=teste&fbclid=abc123"
const campaign = { source: "facebook", medium: "cpc", campaign: "teste", content: null, term: null }

interface Shop {
  slug?: string
  pixelId?: string | null
  choice?: ConsentChoice | null
}

/** A shop's layout as `app/[slug]/layout.tsx` draws it, keyed by the shop: two shops are two layouts. */
function shop({ slug = "loja-a", pixelId = PIXEL, choice = null }: Shop = {}) {
  return (
    <StorefrontConsentGate key={slug} slug={slug} store={{ metaPixelId: pixelId, colors }} choice={choice} messages={ptBR}>
      <StorefrontOrigin slug={slug} pixelId={pixelId} />
      <StorefrontConsentReopen label="Cookies" />
    </StorefrontConsentGate>
  )
}

/** The browser arrives at an address: the cookies it then shows are that path's alone, as a real one's. */
function arriveAt(address: string) {
  window.history.replaceState(null, "", address)
}

/** What the browser holds for the page it is on. */
const kept = () => originFromCookies(document.cookie, Date.now())

function keep(slug: string, origin: VisitOrigin) {
  document.cookie = originCookieOf(slug, origin, Date.now(), false)
}

afterEach(() => {
  for (const slug of ["loja-a", "loja-b"]) {
    for (const name of ["bl_origin", "bl_consent"]) document.cookie = `${name}=; Path=/${slug}; Max-Age=0`
  }
  arriveAt("/")
})

describe("where a visitor came to a shop from, kept as they land (BEELINK-275)", () => {
  it("keeps the campaign of the link at a shop with no pixel, and never the click", () => {
    arriveAt(`/loja-a${LANDING}`)
    render(shop({ pixelId: null }))

    expect(kept()).toMatchObject({ ...campaign, fbclid: null })
    expect(document.cookie).not.toContain("abc123")
  })

  it("keeps the campaign before any answer about cookies, and the click only once the visitor says yes — dated at the arrival", async () => {
    const user = userEvent.setup()
    arriveAt(`/loja-a${LANDING}`)
    render(shop())

    const before = kept()
    expect(before).toMatchObject({ ...campaign, fbclid: null })
    expect(document.cookie).not.toContain("abc123")

    await user.click(screen.getByRole("button", { name: "Aceitar" }))

    expect(kept()).toEqual({ ...campaign, fbclid: "abc123", at: before!.at })
  })

  it("keeps the click at once for a visitor who had already said yes", () => {
    arriveAt(`/loja-a${LANDING}`)
    render(shop({ choice: "granted" }))

    expect(kept()).toMatchObject({ ...campaign, fbclid: "abc123" })
  })

  it("keeps the campaign and not the click of a visitor who refuses, and a later change of mind does not bring the click back", async () => {
    const user = userEvent.setup()
    arriveAt(`/loja-a${LANDING}`)
    render(shop())

    await user.click(screen.getByRole("button", { name: "Recusar" }))
    expect(kept()).toMatchObject({ ...campaign, fbclid: null })

    await user.click(screen.getByRole("button", { name: "Cookies" }))
    await user.click(screen.getByRole("button", { name: "Aceitar" }))
    expect(kept()).toMatchObject({ ...campaign, fbclid: null })
    expect(document.cookie).not.toContain("abc123")
  })

  it("takes the click out, and leaves the campaign with its date, when a yes is taken back", async () => {
    const user = userEvent.setup()
    arriveAt(`/loja-a${LANDING}`)
    render(shop({ choice: "granted" }))
    const before = kept()

    await user.click(screen.getByRole("button", { name: "Cookies" }))
    await user.click(screen.getByRole("button", { name: "Recusar" }))

    expect(kept()).toEqual({ ...campaign, fbclid: null, at: before!.at })
  })

  it("removes an origin that was only an ad's click when the yes is taken back", async () => {
    const user = userEvent.setup()
    arriveAt("/loja-a?fbclid=abc123")
    render(shop({ choice: "granted" }))
    expect(kept()).toMatchObject({ source: null, fbclid: "abc123" })

    await user.click(screen.getByRole("button", { name: "Cookies" }))
    await user.click(screen.getByRole("button", { name: "Recusar" }))

    expect(kept()).toBeNull()
    expect(document.cookie).not.toContain("bl_origin")
  })

  it("drops a click kept from when the shop had a pixel", () => {
    arriveAt("/loja-a")
    keep("loja-a", { ...campaign, fbclid: "abc123", at: Date.now() - 1000 })
    render(shop({ pixelId: null }))

    expect(kept()).toMatchObject({ ...campaign, fbclid: null })
  })

  it("is not erased, nor renewed, by a visit that brings no campaign", () => {
    const arrived = Date.now() - 5 * 86_400_000
    arriveAt("/loja-a/produto/whey?busca=x")
    keep("loja-a", { ...campaign, fbclid: null, at: arrived })
    const written = document.cookie
    render(shop())

    expect(kept()?.at).toBe(arrived)
    expect(document.cookie).toBe(written)
  })

  it("is replaced by an arrival with another campaign", () => {
    arriveAt("/loja-a?utm_source=google&utm_medium=cpc&utm_campaign=nova")
    keep("loja-a", { ...campaign, fbclid: null, at: Date.now() - 5 * 86_400_000 })
    render(shop())

    expect(kept()).toMatchObject({ source: "google", campaign: "nova" })
    expect(Date.now() - kept()!.at).toBeLessThan(5000)
  })

  it("does not read a link inside the shop as a second arrival", () => {
    arriveAt(`/loja-a${LANDING}`)
    const { rerender } = render(shop())

    arriveAt("/loja-a/produto/whey?utm_source=banner-da-loja&utm_campaign=interna")
    rerender(shop())

    expect(kept()).toMatchObject(campaign)
  })

  it("belongs to the shop it arrived at: another shop on the same domain neither sees it nor is given it", () => {
    arriveAt(`/loja-a${LANDING}`)
    const { rerender } = render(shop({ slug: "loja-a", choice: "granted" }))
    expect(kept()).toMatchObject(campaign)

    // On to another shop, with no reload and no campaign in the address.
    arriveAt("/loja-b")
    rerender(shop({ slug: "loja-b", choice: "granted" }))
    expect(kept()).toBeNull()
    expect(document.cookie).not.toContain("bl_origin")

    // And the first shop's is still its own.
    arriveAt("/loja-a/carrinho")
    expect(kept()).toMatchObject({ ...campaign, fbclid: "abc123" })
  })

  it("reads the address again when the visitor enters another shop without a reload", () => {
    arriveAt("/loja-a")
    const { rerender } = render(shop({ slug: "loja-a" }))

    arriveAt("/loja-b?utm_source=instagram&utm_medium=social")
    rerender(shop({ slug: "loja-b" }))

    expect(kept()).toMatchObject({ source: "instagram", medium: "social" })
    arriveAt("/loja-a")
    expect(kept()).toBeNull()
  })

  it("cleans what the address holds before keeping it", () => {
    arriveAt(`/loja-a?utm_source=${encodeURIComponent("  FaceBook\u0000 ")}&utm_campaign=${"x".repeat(300)}&fbclid=${encodeURIComponent("a b;c")}`)
    render(shop({ choice: "granted" }))

    expect(kept()).toMatchObject({ source: "facebook", campaign: "x".repeat(80), fbclid: null })
  })
})
