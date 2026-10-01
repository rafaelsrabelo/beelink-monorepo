// Types
import type { CashbackEntryKind, CashbackErrorCode, CashbackExpiringSoonDays, CashbackSettingsPayload } from '@harness-monorepo/contracts';

/**
 * What a shop that never saved its rules reads (BEELINK-238): switched off, so nothing is given until
 * the shopkeeper says so, and the rest a sensible place for the form to start — 5% back, no expiry,
 * any order earns, and credit may pay for all of the products.
 */
export const CASHBACK_DEFAULTS = {
  enabled: false,
  rateBps: 500,
  expiresAfterDays: null,
  minSubtotalCents: 0,
  maxRedeemBps: 10_000,
} as const satisfies CashbackSettingsPayload;

/** 100.00%, in basis points. */
export const CASHBACK_BPS_MAX = 10_000;
/** Ten years: past it, a typo rather than a rule. The migration's CHECK repeats it. */
export const CASHBACK_VALIDITY_DAYS_MAX = 3650;
/** R$ 1.000.000,00, the cap an order's own amounts have. */
export const CASHBACK_AMOUNT_MAX_CENTS = 100_000_000;
export const CASHBACK_REASON_MIN = 3;
export const CASHBACK_REASON_MAX = 200;

export const CASHBACK_EXPIRING_SOON_DAYS = 30 satisfies CashbackExpiringSoonDays;

export const CASHBACK_ENTRY_KINDS = ['EARN', 'REDEEM', 'REVERSAL', 'EXPIRE', 'ADJUST'] as const satisfies readonly CashbackEntryKind[];

export const CASHBACK_PAGE_SIZE = 20;
export const CASHBACK_PAGE_SIZE_MAX = 100;
export const CASHBACK_PAGE_MAX = 10_000;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function cashbackError(errorCode: CashbackErrorCode, message: string): { errorCode: CashbackErrorCode; message: string } {
  return { errorCode, message };
}
