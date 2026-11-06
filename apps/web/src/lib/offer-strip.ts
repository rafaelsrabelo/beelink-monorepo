// Types
import type { CustomerFirstPurchaseOffer, CustomerOffers } from "@harness-monorepo/contracts"
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
  /** A shown coupon's code — its shopkeeper chose to show it, to anyone with no order. */
  code: string | null
  action: { label: string; href: string } | null
}

export interface OfferStripAsk {
  /**
   * The first-order offer to tell: a signed-in shopper's own (`firstOrderOfferOf`), or — buying asks
   * no account — the shop's public one (`StorefrontOffers.firstOrder`) to anyone else. Null says
   * nothing: a sentence about a first order to somebody who may have ordered is the one this strip
   * must not write.
   */
  offer: CustomerFirstPurchaseOffer | null
  cartHref: string
  locale: string
  messages: UiMessages
}

/**
 * The first-order benefit a signed-in shopper is to be told, or null: none once an order of theirs
 * stands, none at a shop with nothing for a first order, and none when their offers could not be
 * read. The one rule the strip and the pop-up's customer notice (BEELINK-310) both ask — so the
 * pop-up never surfaces a coupon the strip would not.
 */
export function firstOrderOfferOf(offers: CustomerOffers | null): CustomerFirstPurchaseOffer | null {
  return offers && !offers.hasOrder ? offers.firstPurchase : null
}

/**
 * Which strip this page shows, if any — one at most: the first-order benefit, to whoever has no
 * order that stands. The coupon, with its code and the way to the cart that applies it, or the
 * promotion, which applies by itself. Nothing else — no strip invites anyone to open an account:
 * buying asks none, and a first order is priced by the buyer's phone.
 *
 * Every number in a sentence is the API's: this only chooses the sentence and formats them.
 */
export function offerStripOf({ offer, cartHref, locale, messages }: OfferStripAsk): OfferStripView | null {
  const text = messages.storefront.offers
  if (!offer) return null

  const benefit = offerBenefitWords(offer, locale, text)
  if (offer.source === "COUPON") {
    return { message: format(text.firstOrderCoupon, { benefit }), detail: offerMinimumSentence(offer, locale, text), code: offer.code, action: { label: text.useInCart, href: pathWithCoupon(cartHref, offer.code) } }
  }
  return { message: format(offer.wholeCart ? text.firstOrderPromotion : text.firstOrderPromotionSelected, { benefit }), detail: null, code: null, action: null }
}

/**
 * What a visitor's cart says of the shop's first-order coupon (BEELINK-311): the strip's own
 * sentence, with its code — typed once the visitor has said who is buying. Null with no coupon, and
 * for a promotion, which the cart announces by itself over its totals (BEELINK-245): not said twice.
 */
export function cartFirstOrderOf(offer: CustomerFirstPurchaseOffer | null, locale: string, messages: UiMessages): string | null {
  if (offer?.source !== "COUPON") return null
  const text = messages.storefront.offers
  const minimum = offerMinimumSentence(offer, locale, text)
  return `${format(text.firstOrderCoupon, { benefit: offerBenefitWords(offer, locale, text) })} ${offer.code}.${minimum ? ` ${minimum}` : ""}`
}

/** A page's own address with the query it was asked with — the way back a sign-up returns by. */
export function pathWithQuery(path: string, query: Readonly<Record<string, string | string[] | undefined>>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    for (const entry of Array.isArray(value) ? value : value === undefined ? [] : [value]) search.append(key, entry)
  }
  return search.size ? `${path}?${search.toString()}` : path
}
