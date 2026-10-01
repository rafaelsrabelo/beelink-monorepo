// Types
import type { CouponKind, CouponStatus, DiscountAudience, DiscountKind, PricesChangeAtHeader, PromotionErrorCode, PromotionScope, PromotionStatus } from '@harness-monorepo/contracts';

export const DISCOUNT_KINDS = ['PERCENT', 'FIXED'] as const satisfies readonly DiscountKind[];
export const COUPON_KINDS = ['PERCENT', 'FIXED', 'FREE_SHIPPING'] as const satisfies readonly CouponKind[];
export const PROMOTION_SCOPES = ['CART', 'PRODUCTS', 'CATEGORIES'] as const satisfies readonly PromotionScope[];
export const DISCOUNT_AUDIENCES = ['EVERYONE', 'FIRST_PURCHASE'] as const satisfies readonly DiscountAudience[];

/** In the order a status is read: the first that holds is the one. */
export const PROMOTION_STATUSES = ['ENDED', 'PAUSED', 'SCHEDULED', 'ACTIVE'] as const satisfies readonly PromotionStatus[];
export const COUPON_STATUSES = ['ENDED', 'EXHAUSTED', 'PAUSED', 'SCHEDULED', 'ACTIVE'] as const satisfies readonly CouponStatus[];

export const PROMOTION_NAME_MAX = 80;
/** 100.00%, in basis points. */
export const PERCENT_BPS_MAX = 10_000;
/** R$ 1.000.000,00, the cap an order's own amounts have: past it, a typo with too many zeros. */
export const DISCOUNT_AMOUNT_MAX_CENTS = 100_000_000;
/** What one promotion may name; past it, the shopkeeper wants a category, or the whole cart. */
export const PROMOTION_TARGETS_MAX = 200;
/**
 * How many promotions a shop may have running at one instant, the newest first; past it, the older
 * ones do not apply. No shop runs fifty at once: this is the bound on what every read of the shop
 * window and every order loads, so a shop cannot make its own public pages — and the database they
 * share with every other shop — read ten thousand promotions per request.
 */
export const RUNNING_PROMOTIONS_MAX = 50;

export const PRICES_CHANGE_AT_HEADER = 'x-prices-change-at' satisfies PricesChangeAtHeader;

/**
 * As it is typed: 3 to 30 of these, in either case, stored in upper case — the migration's CHECK
 * repeats it for what is stored. Matched before the case is raised: raising first would turn "ß"
 * into "SS" and take a code the shopkeeper never wrote.
 */
export const COUPON_CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{2,29}$/;
export const COUPON_MAX_USES_MAX = 1_000_000;
export const COUPON_MAX_USES_PER_CUSTOMER_MAX = 1000;

/**
 * A date and a time with its offset. ISO-8601 alone also takes "2026-10-05T10:00", which is read in
 * the server's own zone — a period would start at a different instant on each machine.
 */
export const INSTANT = /T.+(Z|[+-]\d{2}:\d{2})$/;

/** A period inside what a calendar shows; past it, a date typed wrong rather than a plan. */
export const PERIOD_MIN = new Date('2000-01-01T00:00:00.000Z');
export const PERIOD_MAX = new Date('2100-01-01T00:00:00.000Z');

export const DISCOUNTS_PAGE_SIZE = 20;
export const DISCOUNTS_PAGE_SIZE_MAX = 100;
export const DISCOUNTS_PAGE_MAX = 10_000;

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function promotionError(errorCode: PromotionErrorCode, message: string): { errorCode: PromotionErrorCode; message: string } {
  return { errorCode, message };
}
