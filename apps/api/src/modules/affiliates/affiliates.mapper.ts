// Types
import type { AffiliateProgram, CommissionTable, CommissionTableSummary } from '@harness-monorepo/contracts';
import type { AffiliateProgramModel, CommissionTableModel, CommissionTableRateModel } from '../../generated/prisma/models.js';

export function toAffiliateProgram(row: AffiliateProgramModel): AffiliateProgram {
  return {
    enabled: row.enabled,
    attributionDays: row.attributionDays,
    payoutDelayDays: row.payoutDelayDays,
    termsText: row.termsText,
    termsVersion: row.termsVersion,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCommissionTableSummary(row: CommissionTableModel & { _count: { rates: number } }): CommissionTableSummary {
  return { id: row.id, name: row.name, defaultRateBps: row.defaultRateBps, isDefault: row.isDefault, productRateCount: row._count.rates };
}

export function toCommissionTable(row: CommissionTableModel & { rates: CommissionTableRateModel[] }): CommissionTable {
  return {
    id: row.id,
    name: row.name,
    defaultRateBps: row.defaultRateBps,
    isDefault: row.isDefault,
    rates: row.rates.map((rate) => ({ productId: rate.productId, rateBps: rate.rateBps })),
    updatedAt: row.updatedAt.toISOString(),
  };
}
