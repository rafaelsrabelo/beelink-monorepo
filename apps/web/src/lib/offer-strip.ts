// Types
import type { CustomerOffers, FirstPurchaseHeadline } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { offerBenefitWords, offerMinimumSentence } from "@harness-monorepo/ui/lib/shop-offers"
import { format } from "@harness-monorepo/ui/locales/index"

// App
import { pathWithCoupon } from "./cart-coupon"

/** The strip under the shop's header, as its block draws it. Plain data: it crosses into the browser. */
export interface OfferStripView {
  message: string
  detail: string | null
  /** A coupon's code. Never set for a visitor: whether a code exists is told only to an identified customer. */
  code: string | null
  action: { label: string; href: string } | null
}

export interface OfferStripAsk {
  /** What the shop says of its first-purchase benefit to anyone; null with none. */
  headline: FirstPurchaseHeadline | null
  /**
   * Who is looking: `visitor`, or a signed-in shopper with their own offers — null when those could
   * not be read, and then nothing is said: a sentence about a first order to somebody who may have
   * ordered is the one this strip must not write.
   */
  viewer: "visitor" | { offers: CustomerOffers | null }
  /** The shop's sign-up, already carrying the way back to this page. */
  signUpHref: string
  cartHref: string
  locale: string
  messages: UiMessages
}

/**
 * Which strip this page shows, if any — one at most:
 *
 * - a visitor is invited to open an account, with the shop's first-purchase benefit when it has one
 *   and with what an account gives when it has none. Never a code;
 * - a signed-in shopper with no order that stands is shown their first-order benefit: the coupon,
 *   with its code and the way to the cart that applies it, or the promotion, which applies by itself;
 * - anyone else — a shopper who has ordered, or one at a shop with nothing for a first order — is
 *   shown nothing. There is no generic strip.
 *
 * Every number in a sentence is the API's: this only chooses the sentence and formats them.
 */
export function offerStripOf({ headline, viewer, signUpHref, cartHref, locale, messages }: OfferStripAsk): OfferStripView | null {
  const text = messages.storefront.offers

  if (viewer === "visitor") {
    const action = { label: text.signUpAction, href: signUpHref }
    if (!headline) return { message: text.signUp, detail: null, code: null, action }

    const benefit = offerBenefitWords(headline, locale, text)
    return { message: format(headline.wholeCart ? text.signUpBenefit : text.signUpBenefitSelected, { benefit }), detail: offerMinimumSentence(headline, locale, text), code: null, action }
  }

  const offer = viewer.offers?.firstPurchase
  if (!offer || viewer.offers?.hasOrder) return null

  const benefit = offerBenefitWords(offer, locale, text)
  if (offer.source === "COUPON") {
    return { message: format(text.firstOrderCoupon, { benefit }), detail: offerMinimumSentence(offer, locale, text), code: offer.code, action: { label: text.useInCart, href: pathWithCoupon(cartHref, offer.code) } }
  }
  return { message: format(offer.wholeCart ? text.firstOrderPromotion : text.firstOrderPromotionSelected, { benefit }), detail: null, code: null, action: null }
}

/** A page's own address with the query it was asked with — the way back a sign-up returns by. */
export function pathWithQuery(path: string, query: Readonly<Record<string, string | string[] | undefined>>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key, entry)
  }
  return search.size ? `${path}?${search.toString()}` : path
}
