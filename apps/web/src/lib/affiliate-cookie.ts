/**
 * Whom a visitor came to a shop by (IMPULSEIA-105), as the `bl_affiliate` cookie holds it: the
 * affiliate's id and the instant of the visit through their link — nothing of the person. The
 * shop's arrival handler writes it, and only the server reads it: the shop window, to say whose
 * recommendation this is, and the order (AF6), to credit it.
 *
 * On the shop's path, like the cart and the UTMs, so an arrival at one shop never credits an order
 * at another; `HttpOnly`, since no page needs to read it. Its life is the programme's attribution
 * days, from the visit, and the last link followed replaces it whole. It is the shop's agreement
 * with its affiliate and not marketing, so it does not wait on the answer about the pixel.
 *
 * The cookie is the visitor's to edit: nothing is read from it without being checked here, and the
 * API checks again, at the order, whether the affiliate still credits and the visit still counts.
 */

// App
import { shopHomeOf, type ShopAddress } from "./shop-address"

export const AFFILIATE_COOKIE = "bl_affiliate"

/**
 * The affiliate whose strip this browser closed, for as long as the browser stays open. Written by
 * the page, read by the server so the next page arrives without the strip; a link of another
 * affiliate shows theirs again.
 */
export const AFFILIATE_HIDDEN_COOKIE = "bl_affiliate_hidden"

/** The query key an affiliate's link arrives with, on any page of the shop. */
export const AFFILIATE_KEY = "afiliado"

/** The longest a programme credits a visit (the API's `ATTRIBUTION_DAYS_MAX`): a cookie older than this is not believed. */
const ATTRIBUTION_DAYS_MAX = 90
const DAY_MS = 24 * 60 * 60 * 1000
/** A cookie written by a clock a little ahead of the one reading it is still a visit. */
const CLOCK_SKEW_MS = 5 * 60_000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const VALUE = /^([0-9a-f-]{36})\.(\d{1,16})$/

export interface AffiliateVisit {
  affiliateId: string
  /** When the visitor followed the link, in milliseconds. */
  visitedAt: number
}

export function encodeAffiliateVisit({ affiliateId, visitedAt }: AffiliateVisit): string {
  return `${affiliateId}.${Math.trunc(visitedAt)}`
}

/**
 * The visit a cookie holds, or null: well formed, dated neither in the future nor past the longest
 * a programme credits. Whether it still counts at this shop's own number of days is the API's to say.
 */
export function affiliateVisitOf(raw: string | undefined, now: number): AffiliateVisit | null {
  const match = raw ? VALUE.exec(raw.toLowerCase()) : null
  if (!match || !UUID.test(match[1]!)) return null

  const visitedAt = Number(match[2])
  if (!Number.isSafeInteger(visitedAt) || visitedAt > now + CLOCK_SKEW_MS || now - visitedAt >= ATTRIBUTION_DAYS_MAX * DAY_MS) return null

  return { affiliateId: match[1]!, visitedAt: Math.min(visitedAt, now) }
}

/** The `Set-Cookie` the page writes when the strip is closed: the shop's path, and the browser's session alone. */
export function hiddenCookieOf(shop: ShopAddress, affiliateId: string, secure: boolean): string {
  return `${AFFILIATE_HIDDEN_COOKIE}=${encodeURIComponent(affiliateId)}; Path=${shopHomeOf(shop)}; SameSite=Lax${secure ? "; Secure" : ""}`
}
