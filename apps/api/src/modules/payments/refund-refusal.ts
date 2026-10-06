// Types
import type { OrderRefundErrorCode } from '@harness-monorepo/contracts';

/** Asaas's words for a charge it lets be refunded: paid, with nothing else under way on it. */
const REFUNDABLE_WORDS = new Set(['CONFIRMED', 'RECEIVED', 'DUNNING_RECEIVED']);

/**
 * Whether Asaas lets the charge be refunded as it last told it (BEELINK-208): not one under review,
 * already being refunded, in a chargeback, or received in cash — which never went through Asaas. A
 * row that keeps no word of Asaas's is let through: Asaas answers for itself.
 */
export const refundableWord = (asaasStatus: string | null): boolean => asaasStatus === null || REFUNDABLE_WORDS.has(asaasStatus);

/**
 * Asaas's no to a refund, as the code the shop's screen words. The reference gives a refusal no
 * code of its own — only that a Pix refunded right after it was received answers 400 for want of
 * balance, the fees having come out of it — so that one is known by Asaas's own word for balance.
 * Anything else is told in Asaas's words.
 */
export function refundRefusalOf(reason: string): Extract<OrderRefundErrorCode, 'REFUND_NO_BALANCE' | 'REFUND_REFUSED'> {
  return /saldo|balance/i.test(reason) ? 'REFUND_NO_BALANCE' : 'REFUND_REFUSED';
}
