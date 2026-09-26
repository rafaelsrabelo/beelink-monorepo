// Types
import type { OrderFulfillment } from '@harness-monorepo/contracts';

// App
import { ORDER_AMOUNT_MAX_CENTS } from './orders.constants.js';

export interface PricedLine {
  unitPriceCents: number;
  quantity: number;
}

export interface OrderTotals {
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  totalCents: number;
}

/** Why an order cannot be totalled: a discount beyond it, or an amount past what one order may be. */
export type TotalsRefusal = 'DISCOUNT_TOO_LARGE' | 'TOTAL_TOO_LARGE';

/**
 * The order's totals, from the lines' photographed prices.
 *
 * Refused when the discount would take the total below zero — a discount bigger than what is paid
 * is a typo, not a gift — and when a line or the order passes `ORDER_AMOUNT_MAX_CENTS`, which also
 * keeps every amount inside the columns' integer range. A pick-up has no delivery fee, whatever
 * was typed: the fee is what the delivery costs.
 */
export function totalsOf(
  lines: readonly PricedLine[],
  fulfillment: OrderFulfillment,
  deliveryFeeCents: number,
  discountCents: number,
): OrderTotals | TotalsRefusal {
  if (lines.some((line) => line.unitPriceCents * line.quantity > ORDER_AMOUNT_MAX_CENTS)) return 'TOTAL_TOO_LARGE';

  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const fee = fulfillment === 'PICKUP' ? 0 : deliveryFeeCents;
  const totalCents = subtotalCents + fee - discountCents;

  if (subtotalCents > ORDER_AMOUNT_MAX_CENTS || totalCents > ORDER_AMOUNT_MAX_CENTS) return 'TOTAL_TOO_LARGE';
  if (totalCents < 0) return 'DISCOUNT_TOO_LARGE';
  return { subtotalCents, deliveryFeeCents: fee, discountCents, totalCents };
}

export interface ChosenValue {
  optionName: string;
  optionPosition: number;
  valueName: string;
}

/** "Sabor: Uva · Peso: 300 g", in the product's own option order. Null for a product with no options. */
export function variantLabelOf(values: readonly ChosenValue[]): string | null {
  if (values.length === 0) return null;

  return [...values]
    .sort((a, b) => a.optionPosition - b.optionPosition)
    .map((value) => `${value.optionName}: ${value.valueName}`)
    .join(' · ');
}
