import "server-only"

// Types
import type { PublicAffiliate, PublicAffiliateLink } from "@harness-monorepo/contracts"

// App
import { AFFILIATE_COOKIE, AFFILIATE_HIDDEN_COOKIE, affiliateVisitOf } from "./affiliate-cookie"
import { callPublicApi } from "./public-api"
import { storeTag } from "./revalidate"

/** One of the two: the `/name` an address carries, or the id the shop window's cookie keeps. */
export type AffiliateLinkAsk = { slug: string } | { id: string }

/**
 * Whom a link of the shop names (IMPULSEIA-105), as the API says it to anyone; null when it is
 * nobody's link — and when the API could not be asked, which the shop window reads the same way: no
 * banner and no credit is the safe side, and the shop still opens.
 *
 * Kept a minute under the shop's tag, like the shop's own read: the panel's handlers that pause,
 * resume or end an affiliate, and the one that saves the programme, drop that tag on their way out.
 */
export async function affiliateLinkAt(shopSlug: string, ask: AffiliateLinkAsk): Promise<PublicAffiliateLink | null> {
  const query = new URLSearchParams("slug" in ask ? { slug: ask.slug } : { id: ask.id })
  const response = await callPublicApi({ path: `/stores/${shopSlug}/affiliate-link?${query.toString()}`, tags: [storeTag(shopSlug)] }).catch(() => null)
  if (!response?.ok) return null
  return (await response.json()) as PublicAffiliateLink
}

/** Who this browser came to the shop by, as the shop window says it, and whether the visitor closed the strip. */
export interface AffiliateReferral {
  affiliate: PublicAffiliate
  hidden: boolean
}

/** What the reads of a request's cookies need: the shop layout hands it `cookies()`. */
export interface CookieReader {
  get(name: string): { value: string } | undefined
}

/**
 * The referral a request carries: the visit its cookie holds, if the affiliate still credits and the
 * visit is inside the programme's days. Read per request and never kept: the answer about the
 * affiliate is everyone's, the cookie is this visitor's.
 */
export async function affiliateReferralAt(shopSlug: string, jar: CookieReader, now = Date.now()): Promise<AffiliateReferral | null> {
  const visit = affiliateVisitOf(jar.get(AFFILIATE_COOKIE)?.value, now)
  if (!visit) return null

  const affiliate = (await affiliateLinkAt(shopSlug, { id: visit.affiliateId }))?.affiliate ?? null
  if (!affiliate || now - visit.visitedAt >= affiliate.attributionDays * 24 * 60 * 60 * 1000) return null

  return { affiliate, hidden: jar.get(AFFILIATE_HIDDEN_COOKIE)?.value === affiliate.id }
}
