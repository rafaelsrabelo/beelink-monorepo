/**
 * Whom a visitor came to a shop by (IMPULSEIA-105), as the `bl_affiliate` cookie holds it: the
 * affiliate's id and the instant of the visit through their link — nothing of the person. The
 * shop's arrival handler writes it, and only the server reads it: the shop window, to say whose
 * recommendation this is, and the order (AF6), to credit it.
 *
 * On the shop's path, like the cart and the UTMs, so an arrival at one shop never credits an order
 * at another; `HttpOnly`, since no page needs to read it. It lives for the browser's session — an
 * order counts for the affiliate only when the customer came by the link in the same visit (the
 * user's call of 12/11) — and the last link followed replaces it whole. It is the shop's agreement
 * with its affiliate and not marketing, so it does not wait on the answer about the pixel.
 *
 * Its value names its shape (`s1.`): a value written before, when the cookie lasted the programme's
 * days, is read as no visit, so a browser that still holds one is credited to nobody.
 *
 * The cookie is the visitor's to edit: nothing is read from it without being checked here, and the
 * API checks again, at the order, whether the affiliate still credits and the visit still counts.
 */

// Types
import type { OrderAffiliateVisitInput } from "@harness-monorepo/contracts"

export const AFFILIATE_COOKIE = "bl_affiliate"

/**
 * The cookie a closed strip used to leave, for the browser's session. Nothing writes or reads it
 * since the band shows only where the link is in the address; an arrival still clears it, so a
 * browser that holds one from before keeps nothing of it.
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
/** The shape a value is written in since the cookie lives for the session. */
const SHAPE = "s1"
const VALUE = /^s1\.([0-9a-f-]{36})\.(\d{1,16})$/
/** The shape the cookie was written in while it lasted the programme's days: never believed again. */
const BEFORE_SESSIONS = /^[0-9a-f-]{36}\.\d{1,16}$/

export interface AffiliateVisit {
  affiliateId: string
  /** When the visitor followed the link, in milliseconds. */
  visitedAt: number
}

export function encodeAffiliateVisit({ affiliateId, visitedAt }: AffiliateVisit): string {
  return `${SHAPE}.${affiliateId}.${Math.trunc(visitedAt)}`
}

/** Whether a value was written while the cookie lasted the programme's days: one to clear where a response can. */
export function heldBeforeSessions(raw: string | undefined): boolean {
  return raw !== undefined && BEFORE_SESSIONS.test(raw.toLowerCase())
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

/**
 * What an order placed now says of the visit (IMPULSEIA-106): the cookie's, read on the server by the
 * order's handler — never the page's. Null with none, or none believed; the API checks it again.
 */
export function orderAffiliateVisitOf(raw: string | undefined, now: number): OrderAffiliateVisitInput | null {
  const visit = affiliateVisitOf(raw, now)
  return visit ? { affiliateId: visit.affiliateId, visitedAt: new Date(visit.visitedAt).toISOString() } : null
}
