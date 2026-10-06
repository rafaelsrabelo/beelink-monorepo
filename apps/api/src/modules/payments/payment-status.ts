// Types
import type { OrderPaymentStatus } from '@harness-monorepo/contracts';

export const ORDER_PAYMENT_STATUSES = ['PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED', 'FAILED'] as const satisfies readonly OrderPaymentStatus[];

/** Out of the living: removed from Asaas, or never made there. Every other status is the order's one charge. */
export const DEAD_STATUSES = ['CANCELLED', 'FAILED'] as const satisfies readonly OrderPaymentStatus[];

/** Every status of a charge that was paid, wherever the money is now. */
export const PAID_STATUSES = ['CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED', 'REFUNDED'] as const satisfies readonly OrderPaymentStatus[];

export const isLive = (status: OrderPaymentStatus): boolean => status !== 'CANCELLED' && status !== 'FAILED';

/** The shop holds the customer's money for it: such an order is not cancelled, nor its total changed, without a refund. */
export const holdsMoney = (status: OrderPaymentStatus): boolean => status === 'CONFIRMED' || status === 'RECEIVED' || status === 'PARTIALLY_REFUNDED';

/** It was paid, wherever the money is now: no other charge is made for its order. */
export const wasPaid = (status: OrderPaymentStatus): boolean => holdsMoney(status) || status === 'REFUNDED';

/** How far along the money is. A fact from Asaas never takes a charge back down: a late "overdue" after a "received" moves nothing. */
const RANK: Record<OrderPaymentStatus, number> = { FAILED: -1, CANCELLED: -1, PENDING: 0, OVERDUE: 1, CONFIRMED: 2, RECEIVED: 3, PARTIALLY_REFUNDED: 4, REFUNDED: 5 };

/**
 * Asaas's statuses that say where the money is, as ours. The rest — a refund on its way, a
 * chargeback in dispute, a word Asaas adds later — say nothing ours can hold: see `statusSaidBy`.
 */
const SAID: Record<string, OrderPaymentStatus> = {
  PENDING: 'PENDING',
  // A card in manual review is not paid yet; `inReview` keeps its charge from being replaced meanwhile.
  AWAITING_RISK_ANALYSIS: 'PENDING',
  OVERDUE: 'OVERDUE',
  DUNNING_REQUESTED: 'OVERDUE',
  CONFIRMED: 'CONFIRMED',
  RECEIVED: 'RECEIVED',
  // The shop told Asaas it was paid outside: no longer payable there, and paid as far as the order goes.
  RECEIVED_IN_CASH: 'RECEIVED',
  DUNNING_RECEIVED: 'RECEIVED',
  REFUNDED: 'REFUNDED',
};

/** Paid, with the money on its way back or in dispute: how much came back is the refund's to say (BEELINK-208). */
const PAID_AND_UNSETTLED = new Set(['REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL']);

/**
 * What Asaas's word makes of a charge that stands at `current` — null for one bee-link first hears of.
 * A word of money that was paid and is in dispute or on its way back leaves a paid charge where it
 * stands, and makes paid one that was not yet; a word nobody knows leaves the charge as it is, and
 * one first heard of in it pending.
 */
export function statusSaidBy(asaasStatus: string, current: OrderPaymentStatus | null): OrderPaymentStatus {
  const said = SAID[asaasStatus];
  if (said) return said;
  // Money on its way back was paid first: a charge still waiting here missed that news, and is paid.
  if (PAID_AND_UNSETTLED.has(asaasStatus)) return current && wasPaid(current) ? current : 'CONFIRMED';
  return current ?? 'PENDING';
}

/**
 * Where a charge stands after Asaas told of it. Never down the money's way; a charge removed is
 * cancelled unless it was paid; and one bee-link had given up on comes back only as paid — money
 * that arrived is never left unsaid.
 */
export function statusAfter(current: OrderPaymentStatus | null, charge: { status: string; deleted: boolean }): OrderPaymentStatus {
  if (charge.deleted) return current && wasPaid(current) ? current : 'CANCELLED';
  const said = statusSaidBy(charge.status, current && isLive(current) ? current : null);
  if (!current) return said;
  if (!isLive(current)) return wasPaid(said) ? said : current;
  return RANK[said] >= RANK[current] ? said : current;
}

/** A card Asaas is reviewing by hand: its charge is neither paid nor to be replaced. */
export const inReview = (asaasStatus: string | null): boolean => asaasStatus === 'AWAITING_RISK_ANALYSIS';
