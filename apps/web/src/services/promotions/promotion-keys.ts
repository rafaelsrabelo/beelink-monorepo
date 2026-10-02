/** The panel's promotions' and coupons' query keys: one shop's lists, each one on its own page and a coupon's uses, invalidated by kind. */
export const promotionKeys = {
  all: ["shop-discounts"] as const,
  shop: (slug: string) => [...promotionKeys.all, slug] as const,
  promotions: (slug: string) => [...promotionKeys.shop(slug), "promotions"] as const,
  promotionList: (slug: string, query: object) => [...promotionKeys.promotions(slug), query] as const,
  promotion: (slug: string, promotionId: string) => [...promotionKeys.promotions(slug), "one", promotionId] as const,
  coupons: (slug: string) => [...promotionKeys.shop(slug), "coupons"] as const,
  couponList: (slug: string, query: object) => [...promotionKeys.coupons(slug), "list", query] as const,
  coupon: (slug: string, couponId: string) => [...promotionKeys.coupons(slug), "one", couponId] as const,
  redemptions: (slug: string, couponId: string, query: object) => [...promotionKeys.coupons(slug), "redemptions", couponId, query] as const,
}
