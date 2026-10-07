import type { CreateOrderItemInput, OrderFulfillment, OrderShippingChoice } from "./order.js";
import type { StorefrontPopup } from "./popup.js";
import type { CouponKind, DiscountAudience } from "./promotion.js";

/**
 * What a shop shows of its own offers, unasked: the invitation to open an account, the first-order
 * strip and the cart's "Cupons disponíveis". Two reads — one anyone's and kept, one a shopper's —
 * and neither prices anything: what an offer is worth on a cart is still `order-quote.ts`.
 *
 * A coupon is in either only while its shopkeeper switched "Mostrar este cupom na loja" on
 * (`Coupon.shownInStore`). A code the shop did not choose to show is in no answer here, to anyone.
 */

/**
 * What an offer gives, as the numbers the API read: a page says "10%" or "R$ 15,00" from these and
 * never from a sentence of its own. `percentBps` on a `PERCENT`, `amountCents` on a `FIXED`, both
 * null on a `FREE_SHIPPING`.
 */
export interface OfferBenefit {
  kind: CouponKind;
  percentBps: number | null;
  amountCents: number | null;
  /** What the products have to add up to, after promotions; zero asks for none — and a promotion never asks. */
  minSubtotalCents: number;
  /** ISO-8601; null has no end. */
  endsAt: string | null;
}

/**
 * The shop's benefit for a first purchase, as anyone may be told of it — and so never a code. A
 * promotion applies by itself to an identified customer with no order that stands; a coupon is a
 * code that customer is shown once they are identified.
 */
export interface FirstPurchaseHeadline extends OfferBenefit {
  source: "PROMOTION" | "COUPON";
  /** False on a promotion over named products or categories: the benefit is not over the whole cart. */
  wholeCart: boolean;
}

/**
 * `GET /stores/:storeSlug/offers` — public and kept. With both a promotion and a shown coupon for a
 * first purchase, the promotion: it is true of whoever opens an account, with nothing to type.
 */
export interface StorefrontOffers {
  firstPurchase: FirstPurchaseHeadline | null;
  /**
   * The shop's first-purchase pop-up (BEELINK-306), while it is switched on; null otherwise — a
   * shop that switched it off serves nothing of what it configured. Read with the headline because
   * the page that draws one asks for the other, and both change at the same instants.
   */
  popup: StorefrontPopup | null;
}

/**
 * The cart "my offers" are read against: the same question the customer's quote is asked, without
 * the code. Absent or empty `items` asks about no cart, and no coupon is listed.
 */
export interface CustomerOffersPayload {
  items?: CreateOrderItemInput[];
  /** Absent is a delivery. */
  fulfillment?: OrderFulfillment;
  /** The saved address a delivery would go to; absent, the customer's default. */
  addressId?: string;
  /** The way a delivery would go by; absent, the shop's own delivery. */
  shipping?: OrderShippingChoice;
}

/** A shown coupon this customer may use on the cart asked about. */
export interface OfferedCoupon extends OfferBenefit {
  /** As stored: what applying it sends. */
  code: string;
  audience: DiscountAudience;
  /**
   * Zero: applying it to this cart now is taken. More than zero: the one refusal a cart undoes by
   * itself — the products are this much below what it asks for — and applying it now is refused.
   */
  missingCents: number;
}

/** The first-order benefit to show a customer with no order that stands: a shown coupon with its code, else a promotion. */
export type CustomerFirstPurchaseOffer = (OfferBenefit & { source: "COUPON"; code: string }) | (OfferBenefit & { source: "PROMOTION"; wholeCart: boolean });

/**
 * `POST /stores/:storeSlug/customer/offers` — a shopper's own. A POST because the cart travels in
 * the body; it writes nothing but the shopper's own record at the shop, as any of their reads does.
 */
export interface CustomerOffers {
  /** Whether an order of theirs stands at the shop — any that is not cancelled, as a first purchase is read. */
  hasOrder: boolean;
  /** Null once `hasOrder`, and at a shop with nothing for a first purchase. With both, the coupon: the promotion applies by itself. */
  firstPurchase: CustomerFirstPurchaseOffer | null;
  /**
   * The shop's shown coupons this customer may use on the cart sent, the newest first, at most ten.
   * Decided by the reading that takes or refuses a code at the quote: none is listed that applying
   * would refuse, but for one below its minimum, which says what is missing.
   */
  coupons: OfferedCoupon[];
}
