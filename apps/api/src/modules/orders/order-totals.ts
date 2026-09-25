// Types
import type { OrderFulfillment } from '@harness-monorepo/contracts';

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

/**
 * The order's totals, from the lines' photographed prices. Null when the discount would take the
 * total below zero — a discount bigger than what is being paid is a typo, not a gift.
 *
 * A pick-up has no delivery fee, whatever was typed: the fee is what the delivery costs.
 */
export function totalsOf(
  lines: readonly PricedLine[],
  fulfillment: OrderFulfillment,
  deliveryFeeCents: number,
  discountCents: number,
): OrderTotals | null {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const fee = fulfillment === 'PICKUP' ? 0 : deliveryFeeCents;
  const totalCents = subtotalCents + fee - discountCents;

  return totalCents < 0 ? null : { subtotalCents, deliveryFeeCents: fee, discountCents, totalCents };
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
