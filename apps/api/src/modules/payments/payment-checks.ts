/** How long after a charge is made the reconciliation first asks Asaas of it: the webhook is the fast way. */
export const FIRST_CHECK_MS = 10 * 60_000;
/** The longest wait between two asks about one charge. */
export const CHECK_MAX_MS = 12 * 60 * 60_000;
/** How long a customer's read of a waiting charge leaves Asaas alone after it was last heard about that charge. */
export const READ_CHECK_EVERY_MS = 60_000;

/**
 * When a charge asked about `checks` times is asked about next: each wait twice the last — ten
 * minutes, twenty, forty… — up to twelve hours. A Pix nobody pays costs the shop's account a dozen
 * requests in the three days before its order is cancelled, not one a minute.
 */
export function nextCheckAfter(checks: number, now: Date): Date {
  return new Date(now.getTime() + Math.min(FIRST_CHECK_MS * 2 ** Math.min(Math.max(checks, 0), 20), CHECK_MAX_MS));
}
