// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { offerBenefitWords, offerMinimumSentence, type OfferBenefitValue } from "./shop-offers"

/**
 * What a shop's first-purchase pop-up says (BEELINK-306), from what its shopkeeper wrote and the
 * benefit the API read. The one place a pop-up's sentences are put together: the shop window and
 * the panel's preview both draw what this returns, so the preview is what a visitor reads.
 */

/** Where the announced benefit goes in a sentence — "10% de desconto", "frete grátis". */
export const POPUP_BENEFIT_PLACEHOLDER = "{beneficio}"

/** The API's bounds, said here first to spare a round trip; the API has the last word. */
export const POPUP_TITLE_MAX = 80
export const POPUP_TEXT_MAX = 200
export const POPUP_BUTTON_MAX = 30
export const POPUP_DELAY_MAX_SECONDS = 60

/** Mirrors the wire's `FirstPurchaseHeadline`; this package imports no contracts. */
export interface PopupBenefitValue extends OfferBenefitValue {
  /** A promotion applies by itself; a coupon is a code the customer is shown once they have an account. */
  source: "PROMOTION" | "COUPON"
  wholeCart: boolean
}

/** The three sentences as the shopkeeper wrote them; null where they wrote nothing. */
export interface PopupCopyValue {
  title: string | null
  text: string | null
  buttonLabel: string | null
}

/** The pop-up's words, ready to draw. */
export interface PopupWords {
  title: string
  text: string
  /** The benefit's own conditions — its minimum, that it is over selected products; null with none. */
  detail: string | null
  buttonLabel: string
}

/** Mirrors the wire's `CustomerFirstPurchaseOffer`: a shown coupon with its code, or a promotion, which has none. */
export type CustomerPopupOfferValue = (OfferBenefitValue & { source: "COUPON"; code: string }) | (OfferBenefitValue & { source: "PROMOTION"; wholeCart: boolean })

/** The words of the notice a signed-in customer who never ordered reads (BEELINK-310). */
export interface CustomerPopupWords extends PopupWords {
  /** The coupon's code; null on a promotion, which applies by itself. */
  code: string | null
}

/** A figure before a `%`, or after `R$`: a discount written by hand, which the API refuses. */
const TYPED_DISCOUNT = /\d\s*%|R\$\s*\d/i

export function typedDiscountIn(sentence: string): boolean {
  return TYPED_DISCOUNT.test(sentence)
}

/**
 * The pop-up's words for the benefit in force — or for none.
 *
 * With a benefit, `{beneficio}` becomes its words, built from the API's numbers; a sentence the
 * shopkeeper left blank is the default for that benefit. With none, nothing may promise one: a blank
 * sentence, and one that names `{beneficio}`, become the plain invitation; a sentence written by
 * hand with no placeholder is drawn as written — it never held a number, which the API refuses.
 */
export function popupWordsOf(copy: PopupCopyValue, benefit: PopupBenefitValue | null, locale: string, messages: UiMessages): PopupWords {
  const text = messages.storefront.popup
  const offers = messages.storefront.offers

  if (!benefit) {
    const plain = (typed: string | null, fallback: string) => (typed === null || typed.includes(POPUP_BENEFIT_PLACEHOLDER) ? fallback : typed)
    return { title: plain(copy.title, text.plainTitle), text: plain(copy.text, text.plainText), detail: null, buttonLabel: plain(copy.buttonLabel, text.plainButton) }
  }

  const words = offerBenefitWords(benefit, locale, offers)
  const filled = (typed: string | null, fallback: string) => (typed ?? fallback).replaceAll(POPUP_BENEFIT_PLACEHOLDER, words)
  const detail = [offerMinimumSentence(benefit, locale, offers), benefit.wholeCart ? null : text.selected].filter((sentence) => sentence !== null).join(" ")

  return {
    title: filled(copy.title, text.title),
    text: filled(copy.text, benefit.kind === "FREE_SHIPPING" ? text.textFreeShipping : text.text),
    detail: detail || null,
    buttonLabel: filled(copy.buttonLabel, text.button[benefit.source]),
  }
}

/**
 * The notice of a signed-in customer who never ordered (BEELINK-310): their first-order benefit as
 * their own offers read it — the coupon, with its code and the way to the cart, or the promotion,
 * which applies by itself and leaves nothing to do but close.
 *
 * None of the shopkeeper's sentences is here: those were written to somebody with no account. The
 * words are the product's, and every number and the code are the API's.
 */
export function customerPopupWordsOf(offer: CustomerPopupOfferValue, locale: string, messages: UiMessages): CustomerPopupWords {
  const text = messages.storefront.popup.customer
  const offers = messages.storefront.offers
  const benefit = offerBenefitWords(offer, locale, offers)

  if (offer.source === "COUPON") {
    return { title: format(text.title, { benefit }), text: text.couponText, detail: offerMinimumSentence(offer, locale, offers), buttonLabel: offers.useInCart, code: offer.code }
  }
  return { title: format(offer.wholeCart ? text.title : text.titleSelected, { benefit }), text: text.promotionText, detail: null, buttonLabel: text.keepShopping, code: null }
}
