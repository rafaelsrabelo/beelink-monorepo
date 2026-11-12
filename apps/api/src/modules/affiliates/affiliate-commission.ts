// App
import { earningBaseOf, type EarningParts } from '../cashback/cashback-earning.js';
import { lineSharesOf, shareCentsOf, weightedRateOf } from '../orders/products-share.js';

/**
 * What an order owes the affiliate it was credited to (IMPULSEIA-106, decision 6 of the epic): the
 * order's cashback calculation, with the affiliate's table in place of the cashback's rates. The base
 * is what the customer paid for the products — the subtotal less the promotions, the coupon, the hand
 * discount and the credit spent, never the delivery — and it is split over the lines by the one split
 * the cashback is worked out on (`products-share.ts`). Rounded down to the cent.
 */

/** An affiliate's table as an order reads it: its rate, and each product's own where it has one. */
export interface CommissionRates {
  defaultRateBps: number;
  byProduct: ReadonlyMap<string, number>;
}

/** One line's commission: its rate then, what it took of the base, and of the commission. */
export interface CommissionLine {
  rateBps: number;
  baseCents: number;
  commissionCents: number;
}

export interface OrderCommission {
  baseCents: number;
  commissionCents: number;
  /** In the order's lines' order. */
  lines: CommissionLine[];
}

/** A product's rate on the table: its own, else the table's. A product gone since is the table's. */
export function rateOf(rates: CommissionRates, productId: string | null): number {
  return (productId !== null ? rates.byProduct.get(productId) : undefined) ?? rates.defaultRateBps;
}

/**
 * The commission, line by line. `parts` are the very ones the order's cashback is worked out from
 * (`earningPartsOf`), whose lines' own rates are not read; `productIds` name each line's product, in
 * the same order.
 */
export function commissionOf(parts: EarningParts, productIds: readonly (string | null)[], rates: CommissionRates): OrderCommission {
  const baseCents = earningBaseOf(parts);
  const lines = parts.lines.map((line, index) => ({ netCents: line.netCents, rateBps: rateOf(rates, productIds[index] ?? null) }));
  const shares = lineSharesOf(lines, baseCents);
  return {
    baseCents,
    commissionCents: shareCentsOf(weightedRateOf(lines), baseCents),
    lines: lines.map((line, index) => ({ rateBps: line.rateBps, baseCents: shares[index]!.baseCents, commissionCents: shares[index]!.shareCents })),
  };
}

/** The same order, owing nothing: the affiliate bought it themselves. The rates and the split are kept, for the shop to see. */
export function zeroed(commission: OrderCommission): OrderCommission {
  return { ...commission, commissionCents: 0, lines: commission.lines.map((line) => ({ ...line, commissionCents: 0 })) };
}
