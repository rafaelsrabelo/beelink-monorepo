// Types
import type { PublicAffiliateLink } from "@harness-monorepo/contracts"

// App
import { callApi } from "./api"
import { KEPT_COPY_READ_TIMEOUT_MS, settledWithin } from "./kept-copy"

/**
 * What the first segment of a shop's address is, as the proxy needs it for the affiliate's sub-site
 * (the user's call of 12/11): the name of an affiliate the shop credits now — the name as the shop
 * keeps it —, an affiliate's name that credits nobody (paused, ended, the programme or the links
 * switched off), or nobody's at all (a route word, a category, a typo).
 */
export type AffiliateSegment = { kind: "credits"; name: string } | { kind: "idle" } | { kind: "none" }

const NONE: AffiliateSegment = { kind: "none" }
/** How long an answer is kept: a paused affiliate's sub-site takes up to this to close. */
export const AFFILIATE_SEGMENT_FRESH_MS = 60_000
/** Past this many kept answers the copy starts over: a crawler walking every category is no leak. */
const KEPT_MAX = 5_000
/** An affiliate's name as AF3 keeps it: 3 to 40 of a–z, 0–9 and inner hyphens. Nothing else is asked about. */
const NAME = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

/** Asks once a minute at most for each shop's segment, and keeps nothing it could not read. */
export function createAffiliateSegments(read: (shop: string, name: string) => Promise<AffiliateSegment>, now: () => number = Date.now) {
  const kept = new Map<string, { answer: AffiliateSegment; until: number }>()

  return async function affiliateSegmentAt(shop: string, segment: string): Promise<AffiliateSegment> {
    const name = segment.toLowerCase()
    if (!NAME.test(name)) return NONE

    const key = `${shop}/${name}`
    const hit = kept.get(key)
    if (hit && hit.until > now()) return hit.answer

    let answer: AffiliateSegment
    try {
      answer = await read(shop, name)
    } catch {
      // The API being unreachable says nothing about the segment: the address is served as the shop's.
      return NONE
    }
    if (kept.size >= KEPT_MAX) kept.clear()
    kept.set(key, { answer, until: now() + AFFILIATE_SEGMENT_FRESH_MS })
    return answer
  }
}

/** `GET /stores/:slug/affiliate-link?slug=`, with no session: a `404` is nobody's, `affiliate: null` one that credits nobody. */
async function readFromApi(shop: string, name: string): Promise<AffiliateSegment> {
  const response = await settledWithin(callApi({ path: `/stores/${shop}/affiliate-link?slug=${encodeURIComponent(name)}`, method: "GET" }), KEPT_COPY_READ_TIMEOUT_MS)
  if (response.status === 404) return NONE
  if (!response.ok) throw new Error(`The affiliate's link answered ${response.status}`)

  const link = (await response.json()) as PublicAffiliateLink
  return link.affiliate ? { kind: "credits", name: link.affiliate.slug } : { kind: "idle" }
}

/** This process's copy. */
export const affiliateSegmentAt = createAffiliateSegments(readFromApi)
