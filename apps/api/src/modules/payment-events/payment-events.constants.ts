/** Events claimed per sweep. */
export const ASAAS_EVENT_BATCH = 10;
/** How many times an event is tried before it is given up: the last waits two hours, some four hours in all. */
export const ASAAS_EVENT_ATTEMPTS_MAX = 8;
/** How long a claimed event is one sweep's: longer than a whole batch may take, each event hearing Asaas and removing a charge at the client's ten seconds a call. */
export const ASAAS_EVENT_LEASE_MS = 10 * 60_000;
/** How long a done event is kept to tell a second delivery by. */
export const ASAAS_EVENT_KEEP_MS = 30 * 24 * 60 * 60_000;

/** The events that say a key of the account stopped working — not which key: the shop's own is tried. */
export const KEY_EVENTS: ReadonlySet<string> = new Set(['ACCESS_TOKEN_DISABLED', 'ACCESS_TOKEN_DELETED', 'ACCESS_TOKEN_EXPIRED']);

/** When an event that failed its `attempts`-th try is due again: after 1, 2, 4, 8… minutes. */
export function retryAtOf(attempts: number, now = Date.now()): Date {
  return new Date(now + 60_000 * 2 ** (Math.max(attempts, 1) - 1));
}

/** Waiting charges asked about per pass of the reconciliation, and unpaid orders looked at per pass. */
export const RECONCILE_BATCH = 40;
export const UNPAID_BATCH = 20;
/** How long an unpaid order whose charge could not be checked at Asaas is left before it is looked at again. */
export const UNPAID_RETRY_MS = 60 * 60_000;
/** Between passes of the routine. */
export const PAYMENT_ROUTINE_MS = 60_000;
