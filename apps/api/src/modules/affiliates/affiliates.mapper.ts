// Types
import type { AffiliateProgram, CommissionTable, CommissionTableSummary, ShopAffiliate, ShopAffiliateSummary } from '@harness-monorepo/contracts';
import type { AffiliateDocumentType } from '../../generated/prisma/enums.js';
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

/** Whose own commission a table is (12/11/2026): what every read of a table brings along. */
export const tableOwnerInclude = { owner: { select: { id: true, name: true } } } as const;
type Owned = { owner: { id: string; name: string } | null };

export function toCommissionTableSummary(row: CommissionTableModel & Owned & { _count: { rates: number; categoryRates: number; affiliates: number } }): CommissionTableSummary {
  return {
    id: row.id,
    name: row.name,
    defaultRateBps: row.defaultRateBps,
    isDefault: row.isDefault,
    productRateCount: row._count.rates,
    categoryRateCount: row._count.categoryRates,
    affiliateCount: row._count.affiliates,
    affiliate: row.owner,
  };
}

export function toCommissionTable(row: CommissionTableModel & Owned & { rates: CommissionTableRateModel[]; categoryRates: CommissionTableCategoryRateModel[] }): CommissionTable {
  return {
    id: row.id,
    name: row.name,
    defaultRateBps: row.defaultRateBps,
    isDefault: row.isDefault,
    rates: row.rates.map((rate) => ({ productId: rate.productId, rateBps: rate.rateBps })),
    categoryRates: row.categoryRates.map((rate) => ({ categoryId: rate.categoryId, rateBps: rate.rateBps })),
    affiliate: row.owner,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * What every read of an affiliate brings along: the table's name and whose it is, the invite while
 * there is one, and what is said of the document — never its files' ids (12/11/2026).
 */
export const affiliateInclude = {
  table: { select: { id: true, name: true, affiliateId: true } },
  invite: true,
  document: { select: { type: true, backPublicId: true, updatedAt: true } },
} as const;

type AffiliateRow = AffiliateModel & {
  table: { id: string; name: string; affiliateId: string | null };
  invite: AffiliateInviteModel | null;
  document: { type: AffiliateDocumentType; backPublicId: string | null; updatedAt: Date } | null;
};

export function toShopAffiliateSummary(row: AffiliateRow): ShopAffiliateSummary {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    slug: row.slug,
    status: row.status,
    table: { id: row.table.id, name: row.table.name, personal: row.table.affiliateId === row.id },
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
    document: row.document ? { type: row.document.type, hasBack: row.document.backPublicId !== null, uploadedAt: row.document.updatedAt.toISOString() } : null,
  };
}
