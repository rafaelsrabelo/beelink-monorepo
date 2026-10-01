// Types
import type { CashbackCredit, CashbackEntry, CashbackSettings } from '@harness-monorepo/contracts';
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
