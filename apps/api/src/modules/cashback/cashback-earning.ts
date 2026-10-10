// Types
import type { CashbackMode, CouponKind, QuotedCashback } from '@harness-monorepo/contracts';

/** A line of an order as its cashback reads it (BEELINK-313). */
export interface EarningLine {
  /** What the line costs after its promotion. */
  netCents: number;
  /** Its product's own rate; null has none. Read only in a shop that gives by product. */
  rateBps: number | null;
}

/** The parts of an order its cashback is worked out from. */
export interface EarningParts {
  /** Every line, whose `netCents` add up to the subtotal less the promotions. */
  lines: readonly EarningLine[];
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
  mode: CashbackMode;
  rateBps: number;
  minSubtotalCents: number;
}

/**
 * What the customer paid for the products (BEELINK-239): the subtotal less every discount on them and
 * the credit spent. Never the delivery. Never below zero: a discount typed by hand may be larger than
 * the products when it also covers the delivery.
 */
export function earningBaseOf(parts: Omit<EarningParts, 'lines'>): number {
  const coupon = parts.couponKind === 'FREE_SHIPPING' ? 0 : parts.couponDiscountCents;
  return Math.max(0, parts.subtotalCents - parts.promotionDiscountCents - coupon - parts.manualDiscountCents - parts.cashbackUsedCents);
}

/**
 * The order's rate as a fraction, `weighted / net` basis points (BEELINK-313): the shop's one rate,
 * or — by product — each line's own over what the line costs, a line with none counting as nothing.
 * A coupon, a hand discount and credit spent are the order's, not a line's: they are taken to come
 * off every line in proportion to its cost, which is what multiplying this average by the base does.
 * BigInt, since cents by basis points by cents is past what a double holds whole.
 */
function rateOf(rules: EarningRules, lines: readonly EarningLine[]): { weighted: bigint; net: bigint } {
  if (rules.mode === 'STORE') return { weighted: BigInt(rules.rateBps), net: 1n };
  return lines.reduce((sum, line) => ({ weighted: sum.weighted + BigInt(line.netCents) * BigInt(line.rateBps ?? 0), net: sum.net + BigInt(line.netCents) }), { weighted: 0n, net: 0n });
}

/** That fraction to the nearest basis point, for an order to record and a screen to say. */
function roundedRateOf({ weighted, net }: { weighted: bigint; net: bigint }): number {
  return net === 0n ? 0 : Number((weighted * 2n + net) / (net * 2n));
}

/**
 * What an order earns, and the rate it was worked out at: the rate over the base, rounded down to
 * the cent. Null when it earns nothing — the cashback off, the order under the shop's minimum, none
 * of its products with a rate, or a share smaller than a cent — so the order records no rate and no
 * lot is made.
 *
 * The minimum is held against the products before any credit was spent on them: spending credit
 * never takes an order under the minimum (BEELINK-240). The share is of what was paid in money.
 */
export function earningOf(rules: EarningRules | null, parts: EarningParts): { earnedCents: number; rateBps: number } | null {
  if (!rules?.enabled || earningBaseOf({ ...parts, cashbackUsedCents: 0 }) < rules.minSubtotalCents) return null;
  const rate = rateOf(rules, parts.lines);
  const earnedCents = rate.net === 0n ? 0 : Number((rate.weighted * BigInt(earningBaseOf(parts))) / (rate.net * 10_000n));
  // An average under half a basis point still earned a cent: the order's CHECK takes no rate of 0.
  return earnedCents > 0 ? { earnedCents, rateBps: Math.max(1, roundedRateOf(rate)) } : null;
}

/**
 * What a cart would earn, as its quote says it (BEELINK-243): the same `earningOf` the order is placed
 * with, and below the minimum, what is missing to reach it. Null with the cashback off, with a share
 * under a cent, and with a cart none of whose products has a rate: reaching the minimum would earn nothing.
 */
export function quotedCashbackOf(rules: EarningRules | null, parts: EarningParts): QuotedCashback | null {
  if (!rules?.enabled) return null;
  const productsCents = earningBaseOf({ ...parts, cashbackUsedCents: 0 });
  if (productsCents < rules.minSubtotalCents) {
    const rateBps = roundedRateOf(rateOf(rules, parts.lines));
    return rateBps > 0 ? { status: 'BELOW_MINIMUM', missingCents: rules.minSubtotalCents - productsCents, rateBps } : null;
  }
  const earning = earningOf(rules, parts);
  return earning && { status: 'EARNS', ...earning };
}
