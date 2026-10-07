// Types
import type { OrderCouponRefusedDetails, OrderFulfillment } from '@harness-monorepo/contracts';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { couponDiscountOf } from './discount-pricing.js';
import { couponStatusOf } from './promotion-status.js';
import { COUPON_CODE } from './promotions.constants.js';

/**
 * Whether a coupon is taken (BEELINK-191), stated once for the quote that answers the customer and
 * for the order that is written: the first reason that holds, in the order `CouponRefusalReason`
 * lists them.
 */

export interface CouponContext {
  /** When the order is placed: the instant the coupon's period is read at. */
  at: Date;
  /** What is left of the products after the promotions: what the minimum is held against. */
  baseCents: number;
  fulfillment: OrderFulfillment;
  /** The fee the order will have: null while a delivery's is not agreed, zero on a pick-up. */
  deliveryFeeCents: number | null;
  /** This customer's orders that used it and were not cancelled; null when nobody is identified. */
  customerUses: number | null;
  /**
   * Whether no order of this customer's stands at the shop. Null when nobody is identified: a quote
   * may come before its customer is chosen, and nobody is refused for what cannot be said yet — an
   * order always has a customer.
   */
  firstPurchase: boolean | null;
}

export type VerdictCoupon = Pick<
  CouponModel,
  'kind' | 'percentBps' | 'amountCents' | 'minSubtotalCents' | 'startsAt' | 'endsAt' | 'isActive' | 'maxUses' | 'maxUsesPerCustomer' | 'usedCount' | 'audience'
>;

/** What is read of whoever asks, apart from any cart: the instant, their uses of the coupon and whether they are on a first purchase. */
export type CouponStanding = Pick<CouponContext, 'at' | 'customerUses' | 'firstPurchase'>;

/** The refusals that hold whatever the cart: the coupon's own state, and whose it may be. */
type StandingRefusal = Exclude<OrderCouponRefusedDetails['reason'], 'NOT_APPLICABLE' | 'BELOW_MINIMUM'>;

/**
 * Whether a coupon stands for this customer before any cart is looked at — the first half of
 * `couponRefusalOf`, and the same lines: what the shop window reads to say a code to a customer
 * (`CustomerOffers`) is what a quote reads to take it.
 */
export function couponStandingRefusalOf(coupon: VerdictCoupon | null, standing: CouponStanding): { reason: StandingRefusal } | null {
  if (!coupon) return { reason: 'NOT_FOUND' };

  const status = couponStatusOf(coupon, standing.at);
  if (status === 'ENDED') return { reason: 'EXPIRED' };
  if (status === 'EXHAUSTED') return { reason: 'EXHAUSTED' };
  if (status !== 'ACTIVE') return { reason: 'INACTIVE' };

  if (coupon.maxUsesPerCustomer !== null && standing.customerUses !== null && standing.customerUses >= coupon.maxUsesPerCustomer) {
    return { reason: 'CUSTOMER_LIMIT' };
  }
  if (coupon.audience === 'FIRST_PURCHASE' && standing.firstPurchase === false) return { reason: 'NOT_FIRST_PURCHASE' };
  return null;
}

export function couponRefusalOf(coupon: VerdictCoupon | null, context: CouponContext): OrderCouponRefusedDetails | null {
  const standing = couponStandingRefusalOf(coupon, context);
  if (standing || !coupon) return standing;

  if (takesNothing(coupon, context)) return { reason: 'NOT_APPLICABLE' };
  if (context.baseCents < coupon.minSubtotalCents) return { reason: 'BELOW_MINIMUM', minSubtotalCents: coupon.minSubtotalCents };
  return null;
}

/**
 * A coupon that would take nothing off is refused rather than spent: a use for no discount is a use
 * the customer lost. A free delivery has nothing to waive on a pick-up, nor on a delivery already
 * free; one whose fee is not agreed yet is taken, and its discount follows the fee. A share or an
 * amount takes nothing when the promotions left nothing of the products.
 */
function takesNothing(coupon: VerdictCoupon, context: CouponContext): boolean {
  if (coupon.kind === 'FREE_SHIPPING') return context.fulfillment === 'PICKUP' || context.deliveryFeeCents === 0;
  return couponDiscountOf(coupon, context.baseCents, context.deliveryFeeCents) === 0;
}

/**
 * A code as it is stored, or null when no coupon could have it — which is "not found" without a
 * read. Matched as typed before its case is raised, as the owner's form does.
 */
export function storedCodeOf(typed: string): string | null {
  const code = typed.trim();
  return COUPON_CODE.test(code) ? code.toUpperCase() : null;
}
