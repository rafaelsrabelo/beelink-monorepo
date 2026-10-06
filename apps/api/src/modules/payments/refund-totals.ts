// App
import type { AsaasRefund } from '../integrations/asaas/asaas.client.js';

/**
 * What Asaas says of a charge's refunds, added up (BEELINK-208). Asaas gives a refund no id, so its
 * list is never matched item by item to bee-link's rows: the sums are what is true whichever refund
 * is which. Whole cents.
 */
export interface RefundTotals {
  /** Money back: Asaas's `DONE` alone — "the array being there does not mean the amount went back". */
  doneCents: number;
  /** Taken by Asaas and not concluded: pending, or waiting for somebody's authorization. */
  pendingCents: number;
  /** Taken and then cancelled: nothing went back. */
  cancelledCents: number;
}

export const NO_REFUNDS: RefundTotals = { doneCents: 0, pendingCents: 0, cancelledCents: 0 };

/** One charge's refunds added up; a word Asaas adds later counts as on its way, never as money back. */
export function refundTotalsOf(refunds: readonly AsaasRefund[]): RefundTotals {
  const totals = { ...NO_REFUNDS };
  for (const refund of refunds) {
    if (refund.status === 'DONE') totals.doneCents += refund.valueCents;
    else if (refund.status === 'CANCELLED') totals.cancelledCents += refund.valueCents;
    else totals.pendingCents += refund.valueCents;
  }
  return totals;
}

/**
 * One charge's refunds as its own status and list tell them together: `REFUNDED` is all of it back,
 * whatever the list holds — a chargeback lost leaves none. Nothing else is read into the status: a
 * refund under way that the list does not show has no amount anybody can name, and guessing the
 * rest of the charge would write a refund that may not exist.
 */
export function chargeRefundTotals(charge: { status: string; valueCents: number; refunds: readonly AsaasRefund[] }): RefundTotals {
  const listed = refundTotalsOf(charge.refunds);
  if (charge.status === 'REFUNDED') return { doneCents: charge.valueCents, pendingCents: 0, cancelledCents: listed.cancelledCents };
  const doneCents = Math.min(listed.doneCents, charge.valueCents);
  const left = charge.valueCents - doneCents;
  const pendingCents = Math.min(listed.pendingCents, left);
  return { doneCents, pendingCents, cancelledCents: listed.cancelledCents };
}

export function sumRefundTotals(totals: readonly RefundTotals[]): RefundTotals {
  return totals.reduce((sum, each) => ({ doneCents: sum.doneCents + each.doneCents, pendingCents: sum.pendingCents + each.pendingCents, cancelledCents: sum.cancelledCents + each.cancelledCents }), NO_REFUNDS);
}
