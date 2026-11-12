// Types
import type { AffiliateProgram, CommissionTable, CommissionTableSummary, ShopAffiliate, ShopAffiliateSummary } from '@harness-monorepo/contracts';
import type { AffiliateInviteModel, AffiliateModel, AffiliateProgramModel, CommissionTableCategoryRateModel, CommissionTableModel, CommissionTableRateModel } from '../../generated/prisma/models.js';

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

export function toCommissionTableSummary(row: CommissionTableModel & { _count: { rates: number; categoryRates: number; affiliates: number } }): CommissionTableSummary {
  return {
    id: row.id,
    name: row.name,
    defaultRateBps: row.defaultRateBps,
    isDefault: row.isDefault,
    productRateCount: row._count.rates,
    categoryRateCount: row._count.categoryRates,
    affiliateCount: row._count.affiliates,
  };
}

export function toCommissionTable(row: CommissionTableModel & { rates: CommissionTableRateModel[]; categoryRates: CommissionTableCategoryRateModel[] }): CommissionTable {
  return {
    id: row.id,
    name: row.name,
    defaultRateBps: row.defaultRateBps,
    isDefault: row.isDefault,
    rates: row.rates.map((rate) => ({ productId: rate.productId, rateBps: rate.rateBps })),
    categoryRates: row.categoryRates.map((rate) => ({ categoryId: rate.categoryId, rateBps: rate.rateBps })),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** What every read of an affiliate brings along: the table's name, and the invite while there is one. */
export const affiliateInclude = { table: { select: { id: true, name: true } }, invite: true } as const;

type AffiliateRow = AffiliateModel & { table: { id: string; name: string }; invite: AffiliateInviteModel | null };

export function toShopAffiliateSummary(row: AffiliateRow): ShopAffiliateSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    slug: row.slug,
    status: row.status,
    table: row.table,
    invitedAt: row.invitedAt.toISOString(),
    acceptedAt: row.acceptedAt?.toISOString() ?? null,
  };
}

export function toShopAffiliate(row: AffiliateRow): ShopAffiliate {
  return {
    ...toShopAffiliateSummary(row),
    cpf: row.cpf,
    note: row.note,
    pixKey: row.pixKey,
    photoUrl: row.photoUrl,
    tagline: row.tagline,
    termsVersion: row.termsVersion,
    termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    // An accepted invite is history, not something the shop can act on.
    invite: row.status === 'INVITED' && row.invite ? { sentAt: row.invite.sentAt.toISOString(), expiresAt: row.invite.expiresAt.toISOString() } : null,
  };
}
