import "server-only"

// Types
import type { OrderAffiliateVisitInput, PublicAffiliate, PublicAffiliateLink } from "@harness-monorepo/contracts"

// App
import { callPublicApi } from "./public-api"
import { AFFILIATE_HEADER } from "./shop-address"
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

/** Whose sub-site the page is under, as the shop window says it. */
export interface AffiliateReferral {
  affiliate: PublicAffiliate
}

/**
 * The referral of a page under an affiliate's sub-site (the user's call of 12/11): the affiliate the
 * proxy stamped the request with, read again — the kept read the link's own page makes — so the band
 * and the order's line name them as the shop keeps them. Null when they no longer credit: the
 * proxy's answer is up to a minute old. Nothing of it comes from a cookie: outside the sub-site the
 * shop is the shop's, whatever the browser holds.
 */
export async function affiliateReferralOf(shopSlug: string, name: string): Promise<AffiliateReferral | null> {
  const affiliate = (await affiliateLinkAt(shopSlug, { slug: name }))?.affiliate ?? null
  return affiliate ? { affiliate } : null
}

/**
 * What an order placed from an affiliate's sub-site says of the visit (IMPULSEIA-106, the user's call
 * of 12/11): the affiliate the proxy stamped the order's handler with, read again, at this instant —
 * the API checks once more that they credit. Null for an order placed anywhere else, whatever cookie
 * the browser holds.
 */
export async function orderAffiliateVisitAt(shopSlug: string, headers: Pick<Headers, "get">, now: number): Promise<OrderAffiliateVisitInput | null> {
  const name = headers.get(AFFILIATE_HEADER)
  const referral = name ? await affiliateReferralOf(shopSlug, name) : null
  return referral ? { affiliateId: referral.affiliate.id, visitedAt: new Date(now).toISOString() } : null
}
