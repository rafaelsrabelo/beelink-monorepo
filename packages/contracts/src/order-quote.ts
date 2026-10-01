import type { CreateOrderItemInput, OrderCustomerInput, OrderFulfillment } from "./order.js";
import type { CouponKind } from "./promotion.js";

/**
 * What a cart costs before it is an order (BEELINK-191): the one calculation the cart, the checkout
 * and the panel's "register an order" read, and the same one an order is written with. Promotions
 * first — per line, the one that takes the most off, never two added up — then the coupon, over what
 * is left of the products. Nothing is reserved by a quote, and the stock is not checked.
 */

/** Why a coupon is not taken — the first that holds, in this order. */
export type CouponRefusalReason =
  /** The shop has no such code. */
  | "NOT_FOUND"
  /** Its end passed. */
  | "EXPIRED"
  /** Its total limit was reached. */
  | "EXHAUSTED"
  /** Paused, or its start is still ahead. */
  | "INACTIVE"
  /** This customer already used it as many times as one customer may. */
  | "CUSTOMER_LIMIT"
  /** A free delivery on a pick-up, or nothing left of the products to take a discount from. */
  | "NOT_APPLICABLE"
  /** What is left of the products after the promotions is below what it asks for. */
  | "BELOW_MINIMUM";

/** A coupon the quote took: its code as stored, and what it takes off. */
export interface QuotedCouponApplied {
  status: "APPLIED";
  code: string;
  kind: CouponKind;
}

/** A coupon the quote did not take, and why. The totals are those without it. */
export interface QuotedCouponRefused {
  status: "REFUSED";
  /** As it was typed, trimmed and in upper case. */
  code: string;
  reason: CouponRefusalReason;
  /** On `BELOW_MINIMUM`: what the products have to add up to, after promotions. */
  minSubtotalCents?: number;
}

export type QuotedCoupon = QuotedCouponApplied | QuotedCouponRefused;

/** One line of the cart, priced. */
export interface OrderQuoteLine {
  variantId: string;
  productId: string;
  quantity: number;
  /** The catalogue's price of one unit, before any promotion. */
  unitPriceCents: number;
  /** `unitPriceCents × quantity`. */
  lineTotalCents: number;
  /** What the promotion takes off this line; zero with none. */
  discountCents: number;
  /** The promotion that took it, by the shopkeeper's name for it. */
  promotion: { id: string; name: string } | null;
}

/** Every amount is whole cents. `totalCents = subtotalCents + (deliveryFeeCents ?? 0) − discountCents`. */
export interface OrderQuote {
  lines: OrderQuoteLine[];
  subtotalCents: number;
  /** The sum of the lines' `discountCents`. */
  promotionDiscountCents: number;
  /** Null when no code was sent. */
  coupon: QuotedCoupon | null;
  /** Zero unless the coupon was applied — and on a free delivery whose fee is not agreed yet. */
  couponDiscountCents: number;
  /** What the shopkeeper typed on a sale registered in the panel; zero from the cart. */
  manualDiscountCents: number;
  /** Promotions, coupon and typed discount together: what the order records as its discount. */
  discountCents: number;
  /** Null on a delivery whose fee is not agreed yet; zero on a pick-up. */
  deliveryFeeCents: number | null;
  totalCents: number;
}

/** The visitor's cart, priced with the shop's promotions. No coupon: that takes a signed-in customer. */
export interface CartQuotePayload {
  items: CreateOrderItemInput[];
  /** Absent is a delivery. */
  fulfillment?: OrderFulfillment;
}

/** The signed-in customer's cart, with the coupon they typed: the answer says whether it is taken. */
export interface CustomerOrderQuotePayload {
  items: CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  /** In any case; blank is none. */
  couponCode?: string | null;
}

/** The panel's sale before it is registered: the body of `CreateOrderPayload` that prices it. */
export interface ShopOrderQuotePayload {
  /** Whose order it is, for a coupon's limit by customer; absent checks only the coupon's own. */
  customer?: OrderCustomerInput;
  items: CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  deliveryFeeCents?: number;
  discountCents?: number;
  couponCode?: string | null;
  /** ISO-8601; absent is now. Promotions and the coupon's validity are read at this instant. */
  placedAt?: string;
}

/** The `details` of `ORDER_COUPON_REFUSED`: why the order's coupon was not taken. */
export interface OrderCouponRefusedDetails {
  reason: CouponRefusalReason;
  minSubtotalCents?: number;
}
