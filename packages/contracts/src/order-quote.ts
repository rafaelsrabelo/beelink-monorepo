import type { QuotedCashback, QuotedCashbackUse } from "./cashback.js";
import type { CreateOrderItemInput, OrderCustomerInput, OrderFulfillment, OrderShippingChoice } from "./order.js";
import type { CouponKind } from "./promotion.js";
import type { ShippingQuote } from "./shipping.js";

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
  /** It is for a first purchase, and this customer already has an order at the shop that stands (BEELINK-245). */
  | "NOT_FIRST_PURCHASE"
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

/**
 * A first-purchase promotion that reaches this cart and was not applied (BEELINK-245). The cart
 * announces it rather than hide it: a visitor is told it is confirmed once they are identified, and
 * a customer who has bought before is told why it is not theirs. Applied, it is a line's promotion
 * like any other, and this is null.
 */
export interface QuotedFirstPurchase {
  /**
   * `UNIDENTIFIED`: nobody is identified yet, so nobody can be said to be on a first purchase.
   * `NOT_FIRST`: this customer already has an order at the shop that stands.
   */
  status: "UNIDENTIFIED" | "NOT_FIRST";
  /** The promotion's name when one alone would apply; null when several would. */
  promotionName: string | null;
  /** What it would take off this cart beyond what the cart already gets — always more than zero. */
  discountCents: number;
}

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
  /** A first-purchase promotion this cart would get and did not; null with none, and once it applied. */
  firstPurchase: QuotedFirstPurchase | null;
  /** Null when no code was sent. */
  coupon: QuotedCoupon | null;
  /** Zero unless the coupon was applied — and on a free delivery whose fee is not agreed yet. */
  couponDiscountCents: number;
  /** What the shopkeeper typed on a sale registered in the panel; zero from the cart. */
  manualDiscountCents: number;
  /** Promotions, coupon and typed discount together: what the order records as its discount. */
  discountCents: number;
  /**
   * Zero on a pick-up. On a delivery, the fee of the way it goes by (BEELINK-178) — the one asked
   * about, else the shop's own delivery — as `shipping` quotes it to the address, and null while
   * there is none to say: a fee the shop agrees afterwards, a way the quote does not offer to that
   * address, or no address.
   */
  deliveryFeeCents: number | null;
  /**
   * The shop's ways to get this cart to the address asked about (BEELINK-178), whichever of them the
   * totals were asked with. Null with no address to quote to: a visitor's cart, a customer with none
   * saved, the panel's sale.
   */
  shipping: ShippingQuote | null;
  totalCents: number;
  /** What it would earn in cashback once delivered (BEELINK-243); null while the shop's cashback is off. */
  cashback: QuotedCashback | null;
  /**
   * The customer's credit against this cart (BEELINK-240): what they have and the most it can take.
   * `totalCents` is already less what was applied. Null on a visitor's cart.
   */
  cashbackUse: QuotedCashbackUse | null;
}

/**
 * The signed-in customer's cart with no code (BEELINK-245): priced as theirs — a first-purchase
 * promotion applies or says why not — at a door that counts its calls apart from the one that
 * answers about codes, so a cart that only changes quantities never spends those.
 */
export interface CustomerCartQuotePayload {
  items: CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  /** The saved address a delivery would go to; absent, the customer's default. The shop's ways to get there are quoted either way. */
  addressId?: string;
  /** The way a delivery would go by (BEELINK-186), whose fee the totals carry; absent, the shop's own delivery. */
  shipping?: OrderShippingChoice;
  /** Apply the most of their credit this cart can take (BEELINK-240). Absent is not to. */
  useCashback?: boolean;
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
  /** The saved address a delivery would go to; absent, the customer's default. The shop's ways to get there are quoted either way. */
  addressId?: string;
  /** The way a delivery would go by (BEELINK-186), whose fee the totals carry; absent, the shop's own delivery. */
  shipping?: OrderShippingChoice;
  /** In any case; blank is none. */
  couponCode?: string | null;
  /** Apply the most of their credit this cart can take (BEELINK-240). Absent is not to. */
  useCashback?: boolean;
}

/** The panel's sale before it is registered: the body of `CreateOrderPayload` that prices it. */
export interface ShopOrderQuotePayload {
  /**
   * Whose order it is: for a coupon's limit by customer, and for a first purchase (BEELINK-245) —
   * a phone the shop does not have is somebody the order would register, so a first purchase.
   * Absent, nobody is identified: the coupon's own limits alone, and a first-purchase promotion
   * announced rather than applied.
   */
  customer?: OrderCustomerInput;
  items: CreateOrderItemInput[];
  fulfillment: OrderFulfillment;
  deliveryFeeCents?: number;
  discountCents?: number;
  couponCode?: string | null;
  /** Apply the most of the customer's credit the sale can take (BEELINK-240). Absent is not to. */
  useCashback?: boolean;
  /** ISO-8601; absent is now. Promotions and the coupon's validity are read at this instant. */
  placedAt?: string;
}

/** The `details` of `ORDER_COUPON_REFUSED`: why the order's coupon was not taken. */
export interface OrderCouponRefusedDetails {
  reason: CouponRefusalReason;
  minSubtotalCents?: number;
}
