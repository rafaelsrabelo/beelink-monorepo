// Types
import type { CashbackCredit, CashbackEntry, CashbackSettings, ShopOrderCashback } from '@harness-monorepo/contracts';
import type { CashbackCreditModel, CashbackEntryModel, CashbackSettingsModel } from '../../generated/prisma/models.js';

// App
import { CASHBACK_DEFAULTS } from './cashback.constants.js';

export function toCashbackSettings(row: CashbackSettingsModel | null): CashbackSettings {
  if (!row) return { ...CASHBACK_DEFAULTS, updatedAt: null };
  return {
    enabled: row.enabled,
    rateBps: row.rateBps,
    expiresAfterDays: row.expiresAfterDays,
    minSubtotalCents: row.minSubtotalCents,
    maxRedeemBps: row.maxRedeemBps,
    updatedAt: row.updatedAt.toISOString(),
  };
}

type OrderNumber = { order: { number: number } | null };

export function toCashbackCredit(row: CashbackCreditModel & OrderNumber): CashbackCredit {
  return {
    id: row.id,
    // Only open lots are listed: the query asks for these two.
    status: row.status === 'PENDING' ? 'PENDING' : 'AVAILABLE',
    amountCents: row.amountCents,
    remainingCents: row.remainingCents,
    orderNumber: row.order?.number ?? null,
    availableAt: row.availableAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

export function toCashbackEntry(row: CashbackEntryModel & OrderNumber): CashbackEntry {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: row.amountCents,
    orderNumber: row.order?.number ?? null,
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * An order's cashback as the shop reads it (BEELINK-239): what it earns, at the rate it was placed
 * at, and where its lot stands. Null when it earns none. The customer's reading drops
 * `unrecoveredCents`, which is the shop's business.
 */
export function toOrderCashback(row: { cashbackEarnedCents: number; cashbackRateBps: number | null; cashbackCredit: CashbackCreditModel | null }): ShopOrderCashback | null {
  const lot = row.cashbackCredit;
  if (row.cashbackRateBps === null || !lot) return null;
  return {
    earnedCents: row.cashbackEarnedCents,
    rateBps: row.cashbackRateBps,
    status: lot.status,
    remainingCents: lot.remainingCents,
    availableAt: lot.availableAt?.toISOString() ?? null,
    expiresAt: lot.expiresAt?.toISOString() ?? null,
    unrecoveredCents: lot.unrecoveredCents,
  };
}
