// Types
import type { OrderErrorCode, OrderPaymentErrorCode } from '@harness-monorepo/contracts';

/**
 * How long one request holds an order's talk with Asaas: past every call it may make — a list, the
 * removals, the customer, the charge — at the client's ten seconds each.
 */
export const CLAIM_MS = 120_000;

/** How long nobody creates after a creation Asaas did not answer: time for a charge it did make to show in its list. */
export const UNKNOWN_OUTCOME_HOLD_MS = 45_000;

/** How long placing an order waits for its charge. Past it the order answers without one, and the talk ends on its own. */
export const PLACE_CHARGE_BUDGET_MS = 8_000;

/** What `OrderPayment.lastError` holds. */
export const LAST_ERROR_MAX_LENGTH = 500;

export function paymentError(errorCode: OrderPaymentErrorCode | Extract<OrderErrorCode, 'ORDER_NOT_FOUND' | 'ORDER_CANCELLED'>, message: string) {
  return { errorCode, message };
}
