import type { OrderStatus } from "./order.js";

/**
 * A shop's promotions and coupons (BEELINK-190), as its owner keeps them
 * (`/stores/:slug/promotions`, `/stores/:slug/coupons`). A promotion takes a discount off by itself
 * while it runs; a coupon is a code the customer types. What either is worth on a cart is computed
 * elsewhere — these are the records.
 *
 * A discount states its kind: `percentBps` for a percentage, in basis points (1000 = 10.00%), or
 * `amountCents` for a fixed amount, in whole cents. The one its kind does not use is null.
 */

export type DiscountKind = "PERCENT" | "FIXED";

/** What a promotion discounts: every line of the cart, or the named products or categories. */
export type PromotionScope = "CART" | "PRODUCTS" | "CATEGORIES";

/**
 * Where a promotion stands now, read from its period and its switch — the first that holds, in this
 * order: its end passed, the owner paused it, its start is still ahead, it runs.
 */
export type PromotionStatus = "ENDED" | "PAUSED" | "SCHEDULED" | "ACTIVE";

/** A product or a category a promotion names, as the panel lists it. */
export interface PromotionTarget {
  id: string;
  name: string;
  slug: string;
}

export interface Promotion {
  id: string;
  name: string;
  scope: PromotionScope;
  discountKind: DiscountKind;
  /** 1 to 10000 on a `PERCENT`; null otherwise. */
  percentBps: number | null;
  /** 1 or more on a `FIXED`; null otherwise. */
  amountCents: number | null;
  /** ISO-8601. */
  startsAt: string;
  /** ISO-8601; null runs until paused. */
  endsAt: string | null;
  /** The owner's switch: false is paused. */
  active: boolean;
  status: PromotionStatus;
  /** The products of a `PRODUCTS` scope, by name; empty otherwise, and once every one was deleted. */
  products: PromotionTarget[];
  /** The categories of a `CATEGORIES` scope, by name; empty otherwise. */
  categories: PromotionTarget[];
  createdAt: string;
  updatedAt: string;
}

/** What the form sends, to create and to replace: an optional key left out is cleared — all but `active`. */
export interface PromotionPayload {
  /** 1 to 80 characters, trimmed. */
  name: string;
  scope: PromotionScope;
  discountKind: DiscountKind;
  percentBps?: number | null;
  amountCents?: number | null;
  /** ISO-8601 with its offset (`2026-10-05T13:00:00.000Z`), as `endsAt`. */
  startsAt: string;
  /** After `startsAt`; absent or null runs until paused. */
  endsAt?: string | null;
  /** Absent is true on a create, and keeps the switch as it is on a replace. */
  active?: boolean;
  /** One to 200 of the shop's products on a `PRODUCTS` scope; absent or empty otherwise. */
  productIds?: string[];
  /** One to 200 of the shop's categories on a `CATEGORIES` scope; absent or empty otherwise. */
  categoryIds?: string[];
}

export interface PromotionListQuery {
  /** Absent is every one. */
  status?: PromotionStatus;
  page?: number;
  pageSize?: number;
}

/** A page of the shop's promotions, the newest first; the counts are of every one, whatever the filter. */
export interface PromotionPage {
  promotions: Promotion[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<"ALL" | PromotionStatus, number>;
}

/** Pausing and resuming, for both a promotion and a coupon. */
export interface SetDiscountActivePayload {
  active: boolean;
}

/** A coupon discounts as a promotion does, or waives the delivery fee. */
export type CouponKind = DiscountKind | "FREE_SHIPPING";

/** A promotion's, and `EXHAUSTED`: its total limit was reached — read after `ENDED`, before `PAUSED`. */
export type CouponStatus = PromotionStatus | "EXHAUSTED";

export interface Coupon {
  id: string;
  /** Upper case, unique within the shop: what the customer types, in any case. */
  code: string;
  kind: CouponKind;
  percentBps: number | null;
  amountCents: number | null;
  /** The cart's subtotal it asks for; zero asks for none. */
  minSubtotalCents: number;
  startsAt: string;
  /** Null never expires. */
  endsAt: string | null;
  /** How many orders may use it; null is no limit. */
  maxUses: number | null;
  /** How many orders of one customer may use it; null is no limit. */
  maxUsesPerCustomer: number | null;
  /** How many uses count against `maxUses`. */
  usedCount: number;
  active: boolean;
  status: CouponStatus;
  createdAt: string;
  updatedAt: string;
}

/** What the form sends, to create and to replace: an optional key left out is cleared — all but `active`. */
export interface CouponPayload {
  /** 3 to 30 of A–Z, 0–9, `-` and `_`, in either case, starting with a letter or a digit; stored in upper case. */
  code: string;
  kind: CouponKind;
  percentBps?: number | null;
  amountCents?: number | null;
  /** Absent is zero. */
  minSubtotalCents?: number;
  /** ISO-8601 with its offset, as `endsAt`. */
  startsAt: string;
  /** After `startsAt`; absent or null never expires. */
  endsAt?: string | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  /** Absent is true on a create, and keeps the switch as it is on a replace. */
  active?: boolean;
}

export interface CouponListQuery {
  status?: CouponStatus;
  page?: number;
  pageSize?: number;
}

/** A page of the shop's coupons, the newest first; the counts are of every one, whatever the filter. */
export interface CouponPage {
  coupons: Coupon[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<"ALL" | CouponStatus, number>;
}

/** One use of a coupon: the order it went into, whose it was, and what it took off. */
export interface CouponRedemption {
  id: string;
  order: { number: number; status: OrderStatus; totalCents: number; placedAt: string };
  customer: { id: string; name: string };
  discountCents: number;
  /** ISO-8601. */
  redeemedAt: string;
}

export interface CouponRedemptionListQuery {
  page?: number;
  pageSize?: number;
}

/** A page of a coupon's uses, the most recent first. */
export interface CouponRedemptionPage {
  redemptions: CouponRedemption[];
  total: number;
  page: number;
  pageSize: number;
}

/** What the promotions and the coupons answer; the apps own the sentences. */
export type PromotionErrorCode =
  /** Not a promotion of this shop's. */
  | "PROMOTION_NOT_FOUND"
  /** The value its kind asks for is missing or out of range, or the other one came with it. */
  | "PROMOTION_DISCOUNT_INVALID"
  /** The end is not after the start. */
  | "PROMOTION_PERIOD_INVALID"
  /** The scope and its lists disagree: products with none named, a cart with a list. */
  | "PROMOTION_TARGETS_INVALID"
  /** A product or a category named that is not this shop's. */
  | "PROMOTION_TARGET_NOT_FOUND"
  /** Not a coupon of this shop's. */
  | "COUPON_NOT_FOUND"
  /** A character or a length the code does not take. */
  | "COUPON_CODE_INVALID"
  /** Another coupon of the shop already has the code, in any case. */
  | "COUPON_CODE_TAKEN"
  | "COUPON_DISCOUNT_INVALID"
  | "COUPON_PERIOD_INVALID";
