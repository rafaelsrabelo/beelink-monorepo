// Next
import type { NextRequest } from "next/server"

// Types
import type { OrderMarketingConsentInput, OrderOriginInput, PlaceCustomerOrderPayload } from "@harness-monorepo/contracts"

// App
import { publicOriginOf } from "./bff"
import { CONSENT_COOKIE, decodeConsent, marketingAllowed } from "./consent-cookie"
import { decodeOrigin, ORIGIN_COOKIE } from "./origin-cookie"
import { shopAt } from "./storefront-data"

/**
 * What an order placed from a shop's cart says of where its buyer came from, and of their yes to the
 * shop's pixel (BEELINK-275) — read on the server, from what the browser sent to the shop's own
 * path. Never from the page's JSON: whatever the body names in these two fields is thrown away
 * before this is put in their place.
 */

/** Meta's own cookie, one for the whole domain: read only for a buyer whose yes stands at this shop. */
const FBP_COOKIE = "_fbp"
const FBP = /^fb\.\d\.\d{10,16}\.\d{1,25}$/
const USER_AGENT_MAX = 512
const PAGE_URL_MAX = 500
const INVISIBLE = /[\p{Cc}\p{Cf}]/gu

export type OrderOriginFields = Pick<PlaceCustomerOrderPayload, "origin" | "marketingConsent">

/**
 * Whether this buyer's marketing consent stands at this shop, now: their `bl_consent` on this
 * request says yes **and** the shop has a pixel. The shop is asked for only when the cookie says
 * yes, and a shop that could not be read is a shop with no consent — never the other way.
 */
export async function marketingConsentAt(request: NextRequest, slug: string): Promise<boolean> {
  const choice = decodeConsent(request.cookies.get(CONSENT_COOKIE)?.value)
  if (choice !== "granted") return false

  const store = await shopAt(slug).catch(() => null)
  return store ? marketingAllowed(store, choice) : false
}

/**
 * The page the order was placed from, as the browser named it: of this site and under this shop's
 * path, or nothing. Without its query — a cart's address may carry a coupon, and Meta needs neither.
 */
function pageUrlOf(request: NextRequest, slug: string): string | null {
  const referer = request.headers.get("referer")
  if (!referer || referer.length > PAGE_URL_MAX * 4) return null
  let url: URL
  try {
    url = new URL(referer)
  } catch {
    return null
  }
  if (url.origin !== publicOriginOf(request)) return null
  if (url.pathname !== `/${slug}` && !url.pathname.startsWith(`/${slug}/`)) return null

  const page = `${url.origin}${url.pathname}`
  return page.length <= PAGE_URL_MAX ? page : null
}

/**
 * The two fields the handler sends in the body's place.
 *
 * `origin` is the campaign, with or without a pixel and a yes: it describes the campaign, not the
 * buyer. `marketingConsent` is there only when `consented` — and then carries Meta's click
 * identifier with its instant, Meta's `_fbp`, the browser's user agent and the page. Without the
 * yes none of those is read at all, even if the cookie still holds a click.
 */
export function orderOriginOf(request: NextRequest, slug: string, consented: boolean, now: number): OrderOriginFields {
  const kept = decodeOrigin(request.cookies.get(ORIGIN_COOKIE)?.value, now)
  const named = kept !== null && (kept.source !== null || kept.medium !== null || kept.campaign !== null)

  const origin = named
    ? ({ source: kept.source, medium: kept.medium, campaign: kept.campaign, content: kept.content, term: kept.term, arrivedAt: new Date(kept.at).toISOString() } satisfies OrderOriginInput)
    : undefined
  if (!consented) return { ...(origin ? { origin } : {}) }

  const fbp = request.cookies.get(FBP_COOKIE)?.value
  const userAgent = request.headers.get("user-agent")?.replace(INVISIBLE, " ").trim().slice(0, USER_AGENT_MAX)
  const marketingConsent = {
    fbclid: kept?.fbclid ?? null,
    clickedAt: kept?.fbclid ? new Date(kept.at).toISOString() : null,
    fbp: fbp && fbp.length <= 100 && FBP.test(fbp) ? fbp : null,
    userAgent: userAgent || null,
    pageUrl: pageUrlOf(request, slug),
  } satisfies OrderMarketingConsentInput

  return { ...(origin ? { origin } : {}), marketingConsent }
}
