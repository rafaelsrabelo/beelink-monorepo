// Types
import type { OrderCouponRefusedDetails, OrderFulfillment } from '@harness-monorepo/contracts';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
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
  /** This customer's orders that used it and were not cancelled; null when nobody is identified. */
  customerUses: number | null;
}

export type VerdictCoupon = Pick<CouponModel, 'kind' | 'minSubtotalCents' | 'startsAt' | 'endsAt' | 'isActive' | 'maxUses' | 'maxUsesPerCustomer' | 'usedCount'>;

export function couponRefusalOf(coupon: VerdictCoupon | null, context: CouponContext): OrderCouponRefusedDetails | null {
  if (!coupon) return { reason: 'NOT_FOUND' };

  const status = couponStatusOf(coupon, context.at);
  if (status === 'ENDED') return { reason: 'EXPIRED' };
  if (status === 'EXHAUSTED') return { reason: 'EXHAUSTED' };
  if (status !== 'ACTIVE') return { reason: 'INACTIVE' };

  if (coupon.maxUsesPerCustomer !== null && context.customerUses !== null && context.customerUses >= coupon.maxUsesPerCustomer) {
    return { reason: 'CUSTOMER_LIMIT' };
  }
  // A pick-up has no fee to waive, and a cart the promotions already paid for has nothing to take.
  if (coupon.kind === 'FREE_SHIPPING' ? context.fulfillment === 'PICKUP' : context.baseCents === 0) return { reason: 'NOT_APPLICABLE' };
  if (context.baseCents < coupon.minSubtotalCents) return { reason: 'BELOW_MINIMUM', minSubtotalCents: coupon.minSubtotalCents };
  return null;
}

/**
 * A code as it is stored, or null when no coupon could have it — which is "not found" without a
 * read. Matched as typed before its case is raised, as the owner's form does.
 */
export function storedCodeOf(typed: string): string | null {
  const code = typed.trim();
  return COUPON_CODE.test(code) ? code.toUpperCase() : null;
}
