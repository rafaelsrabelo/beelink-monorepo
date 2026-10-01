// Types
import type {
  Coupon,
  CouponListQuery,
  CouponPage,
  CouponPayload,
  CouponRedemptionListQuery,
  CouponRedemptionPage,
  Promotion,
  PromotionListQuery,
  PromotionPage,
  PromotionPayload,
  SetDiscountActivePayload,
} from "@harness-monorepo/contracts"

/** What a failed call carries: the API's stable code, never a sentence (apps/web/AGENTS.md, rule 9). */
export class DiscountError extends Error {
  constructor(readonly errorCode: string) {
    super(errorCode)
    this.name = "DiscountError"
  }
}

/** Declared on every call: `refuseCrossOrigin` answers 415 to a request that does not say it speaks JSON. */
const JSON_HEADERS: Record<string, string> = { "content-type": "application/json" }

async function ask<T>(path: string, method: "GET" | "POST" | "PUT" | "PATCH" = "GET", body?: object): Promise<T> {
  const response = await fetch(path, { method, headers: JSON_HEADERS, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || payload === null) {
    throw new DiscountError(typeof payload === "object" && payload !== null && "errorCode" in payload ? String(payload.errorCode) : "UNKNOWN")
  }
  return payload as T
}

const base = (slug: string, kind: "promotions" | "coupons") => `/api/stores/${encodeURIComponent(slug)}/${kind}`
const one = (slug: string, kind: "promotions" | "coupons", id: string) => `${base(slug, kind)}/${encodeURIComponent(id)}`

function searchOf(query: object): string {
  const search = new URLSearchParams(Object.entries(query).flatMap(([key, value]) => (value === undefined ? [] : [[key, String(value)]])))
  return search.size ? `?${search.toString()}` : ""
}

/** A page of the shop's promotions, through this app's own handler; the API's address is server-only. */
export function fetchPromotions(slug: string, query: PromotionListQuery = {}): Promise<PromotionPage> {
  return ask(`${base(slug, "promotions")}${searchOf(query)}`)
}

export function createPromotion(slug: string, payload: PromotionPayload): Promise<Promotion> {
  return ask(base(slug, "promotions"), "POST", payload)
}

export function replacePromotion(slug: string, promotionId: string, payload: PromotionPayload): Promise<Promotion> {
  return ask(one(slug, "promotions", promotionId), "PUT", payload)
}

export function setPromotionActive(slug: string, promotionId: string, payload: SetDiscountActivePayload): Promise<Promotion> {
  return ask(one(slug, "promotions", promotionId), "PATCH", payload)
}

export function fetchCoupons(slug: string, query: CouponListQuery = {}): Promise<CouponPage> {
  return ask(`${base(slug, "coupons")}${searchOf(query)}`)
}

export function createCoupon(slug: string, payload: CouponPayload): Promise<Coupon> {
  return ask(base(slug, "coupons"), "POST", payload)
}

export function replaceCoupon(slug: string, couponId: string, payload: CouponPayload): Promise<Coupon> {
  return ask(one(slug, "coupons", couponId), "PUT", payload)
}

export function setCouponActive(slug: string, couponId: string, payload: SetDiscountActivePayload): Promise<Coupon> {
  return ask(one(slug, "coupons", couponId), "PATCH", payload)
}

export function fetchCouponRedemptions(slug: string, couponId: string, query: CouponRedemptionListQuery = {}): Promise<CouponRedemptionPage> {
  return ask(`${one(slug, "coupons", couponId)}/redemptions${searchOf(query)}`)
}
