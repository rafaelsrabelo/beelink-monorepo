// Types
import type { CouponKind } from '@harness-monorepo/contracts';

/** The parts of an order its cashback is worked out from. */
export interface EarningParts {
  subtotalCents: number;
  promotionDiscountCents: number;
  couponDiscountCents: number;
  /** A free delivery's coupon takes its discount off the delivery, which earns nothing anyway. */
  couponKind: CouponKind | null;
  /** What the shopkeeper took off by hand. */
  manualDiscountCents: number;
  /** Credit spent on the order (U3): a debt being paid, which earns nothing. */
  cashbackUsedCents: number;
}

export interface EarningRules {
  enabled: boolean;
  rateBps: number;
  minSubtotalCents: number;
}

/**
 * What the customer paid for the products (BEELINK-239): the subtotal less every discount on them and
 * the credit spent. Never the delivery. Never below zero: a discount typed by hand may be larger than
 * the products when it also covers the delivery.
 */
export function earningBaseOf(parts: EarningParts): number {
  const coupon = parts.couponKind === 'FREE_SHIPPING' ? 0 : parts.couponDiscountCents;
  return Math.max(0, parts.subtotalCents - parts.promotionDiscountCents - coupon - parts.manualDiscountCents - parts.cashbackUsedCents);
}

/**
 * What an order earns, and the rate it was worked out at: the rate over the base, rounded down to
 * the cent. Null when it earns nothing — the cashback off, the base under the shop's minimum, or a
 * share smaller than a cent — so the order records no rate and no lot is made.
 */
export function earningOf(rules: EarningRules | null, baseCents: number): { earnedCents: number; rateBps: number } | null {
  if (!rules?.enabled || baseCents < rules.minSubtotalCents) return null;
  const earnedCents = Math.floor((baseCents * rules.rateBps) / 10_000);
  return earnedCents > 0 ? { earnedCents, rateBps: rules.rateBps } : null;
}
