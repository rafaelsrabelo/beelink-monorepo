/**
 * Where a visitor came to a shop from (BEELINK-275), as the `bl_origin` cookie holds it: the campaign
 * labels of the link they arrived by (`utm_*`) and, only while their yes to the shop's pixel stands,
 * Meta's click identifier (`fbclid`). The order they place there records it, read from this cookie
 * on the server — so the shopkeeper sees which campaign sold.
 *
 * On `path=/<slug>`, like the cart and the answer about tracking: every shop lives on one domain,
 * and the path is the only thing that keeps an arrival at one shop off an order at another. Plain
 * text and not `httpOnly`: the page writes it as the visitor lands, and again when their answer
 * about tracking changes.
 *
 * Every value in it came out of an address anyone may write, and the cookie itself is the visitor's
 * to edit: nothing is read from either without being cleaned and bounded here.
 */

export const ORIGIN_COOKIE = "bl_origin"

/**
 * Thirty days from the arrival, never renewed by a visit that brings no campaign: the window most
 * shops attribute a sale within — past Meta's seven days for a click, short of a campaign of months ago.
 */
export const ORIGIN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

/** The API cuts a label at the same length (`apps/api/src/modules/orders/order-origin.ts`). */
export const ORIGIN_LABEL_MAX = 80
export const FBCLID_MAX = 500

/** A cookie is dropped whole past 4 KB: past this, the two labels that only describe a campaign go. */
const COOKIE_VALUE_MAX = 3000
/** A cookie written by a clock a little ahead of the one reading it is still an arrival. */
const CLOCK_SKEW_MS = 5 * 60_000

const INVISIBLE = /[\p{Cc}\p{Cf}]/gu
const FBCLID = /^[A-Za-z0-9_.-]+$/

export interface VisitOrigin {
  /** `utm_source` and `utm_medium`, in lower case: they are a vocabulary, and "Facebook" is "facebook". */
  source: string | null
  medium: string | null
  /** `utm_campaign`, `utm_content` and `utm_term`, as they were written. */
  campaign: string | null
  content: string | null
  term: string | null
  /** Meta's click identifier; only ever here while the visitor's yes to this shop's pixel stands. */
  fbclid: string | null
  /** When the visitor arrived by it, in milliseconds: the click's own instant, when there is one. */
  at: number
}

/** A campaign label: no control or invisible character, single spaces, cut by whole characters. Null for none. */
export function cleanLabel(raw: unknown, lowerCase = false): string | null {
  if (typeof raw !== "string") return null
  const clean = [...raw.replace(INVISIBLE, " ").replace(/\s+/g, " ").trim()].slice(0, ORIGIN_LABEL_MAX).join("").trim()
  if (!clean) return null
  return lowerCase ? clean.toLowerCase() : clean
}

/** Meta's click identifier, whole or not at all: one cut short is another identifier. */
export function cleanClickId(raw: unknown): string | null {
  return typeof raw === "string" && raw.length <= FBCLID_MAX && FBCLID.test(raw) ? raw : null
}

/** An origin is a campaign named, or an ad's click: content and a term alone describe nothing. */
function shaped(origin: VisitOrigin): VisitOrigin | null {
  const named = origin.source !== null || origin.medium !== null || origin.campaign !== null
  if (named) return origin
  return origin.fbclid !== null ? { ...origin, content: null, term: null } : null
}

/** What the address a visitor landed on says of where they came from; null when it says nothing. */
export function arrivalOf(search: string, now: number): VisitOrigin | null {
  const query = new URLSearchParams(search)
  return shaped({
    source: cleanLabel(query.get("utm_source"), true),
    medium: cleanLabel(query.get("utm_medium"), true),
    campaign: cleanLabel(query.get("utm_campaign")),
    content: cleanLabel(query.get("utm_content")),
    term: cleanLabel(query.get("utm_term")),
    fbclid: cleanClickId(query.get("fbclid")),
    at: now,
  })
}

/** The origin without Meta's identifier — what may be kept of it with no yes. Null when the click was all there was. */
export function withoutClick(origin: VisitOrigin | null): VisitOrigin | null {
  return origin ? shaped({ ...origin, fbclid: null }) : null
}

export function sameOrigin(one: VisitOrigin | null, other: VisitOrigin | null): boolean {
  if (one === null || other === null) return one === other
  return sameCampaign(one, other) && one.at === other.at
}

function sameCampaign(one: VisitOrigin, other: VisitOrigin): boolean {
  return one.source === other.source && one.medium === other.medium && one.campaign === other.campaign && one.content === other.content && one.term === other.term && one.fbclid === other.fbclid
}

/**
 * The origin to keep, given the one kept, this page load's arrival and whether the shop may keep
 * Meta's identifier for this visitor (`marketingAllowed`). The one place the rule is written:
 *
 * - without that yes, no click identifier is kept — not the arrival's, not one kept before;
 * - a visit that brought no campaign changes nothing: it never erases, and never renews;
 * - an arrival saying what is already kept changes nothing either — a page read again is not a second visit;
 * - any other arrival replaces what was kept, whole, and its thirty days start then. The last
 *   campaign to bring the visitor is the one that sold.
 */
export function originAfter(kept: VisitOrigin | null, arrival: VisitOrigin | null, allowed: boolean): VisitOrigin | null {
  const base = allowed ? kept : withoutClick(kept)
  const seen = allowed ? arrival : withoutClick(arrival)
  if (!seen) return base
  // Another tab may have kept a later arrival since this page was loaded.
  if (base && (base.at > seen.at || sameCampaign(base, seen))) return base
  return seen
}

interface Packed {
  s?: string
  m?: string
  c?: string
  n?: string
  t?: string
  f?: string
  a: number
}

/** The cookie's value: short keys, nothing empty, and under the size a browser keeps. */
export function encodeOrigin(origin: VisitOrigin): string {
  const whole = packedOf(origin)
  return whole.length <= COOKIE_VALUE_MAX ? whole : packedOf({ ...origin, content: null, term: null })
}

function packedOf(origin: VisitOrigin): string {
  const packed: Packed = {
    ...(origin.source !== null ? { s: origin.source } : {}),
    ...(origin.medium !== null ? { m: origin.medium } : {}),
    ...(origin.campaign !== null ? { c: origin.campaign } : {}),
    ...(origin.content !== null ? { n: origin.content } : {}),
    ...(origin.term !== null ? { t: origin.term } : {}),
    ...(origin.fbclid !== null ? { f: origin.fbclid } : {}),
    a: origin.at,
  }
  return encodeURIComponent(JSON.stringify(packed))
}

function parsed(raw: string): unknown {
  // The server's cookie reader hands the value decoded; `document.cookie` hands it as written.
  for (const text of [raw, safelyDecoded(raw)]) {
    if (text === null) continue
    try {
      return JSON.parse(text)
    } catch {
      continue
    }
  }
  return null
}

function safelyDecoded(raw: string): string | null {
  try {
    return decodeURIComponent(raw)
  } catch {
    return null
  }
}

/**
 * The origin a cookie holds, or null. Cleaned again as if it had just come out of an address, and
 * null past its thirty days or dated in the future: the date is the visitor's to edit too.
 */
export function decodeOrigin(raw: string | undefined, now: number): VisitOrigin | null {
  if (!raw || raw.length > 4096) return null
  const packed = parsed(raw)
  if (typeof packed !== "object" || packed === null || Array.isArray(packed)) return null

  const { s, m, c, n, t, f, a } = packed as Record<string, unknown>
  if (typeof a !== "number" || !Number.isFinite(a) || a > now + CLOCK_SKEW_MS || now - a >= ORIGIN_MAX_AGE_SECONDS * 1000) return null

  return shaped({
    source: cleanLabel(s, true),
    medium: cleanLabel(m, true),
    campaign: cleanLabel(c),
    content: cleanLabel(n),
    term: cleanLabel(t),
    fbclid: cleanClickId(f),
    at: Math.min(Math.trunc(a), now),
  })
}

/** The origin kept, read from a `document.cookie` string. */
export function originFromCookies(cookies: string, now: number): VisitOrigin | null {
  const pair = cookies.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${ORIGIN_COOKIE}=`))
  return decodeOrigin(pair?.slice(ORIGIN_COOKIE.length + 1), now)
}

/**
 * The `Set-Cookie` a page writes: scoped to the shop, and living only what is left of the thirty
 * days since the arrival — writing it again, to add or drop the click, never renews it. Null removes it.
 */
export function originCookieOf(slug: string, origin: VisitOrigin | null, now: number, secure: boolean): string {
  const left = origin ? Math.ceil((origin.at + ORIGIN_MAX_AGE_SECONDS * 1000 - now) / 1000) : 0
  const value = origin && left > 0 ? encodeOrigin(origin) : ""
  return `${ORIGIN_COOKIE}=${value}; Path=/${slug}; Max-Age=${value ? left : 0}; SameSite=Lax${secure ? "; Secure" : ""}`
}
