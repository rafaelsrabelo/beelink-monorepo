// Types
import type { AffiliateStatementEntry, AffiliateStatus, OrderAffiliate } from '@harness-monorepo/contracts';
import type { AffiliateAttributionChangeModel, AffiliateCommissionModel, AffiliateEntryModel, AffiliatePayoutModel } from '../../generated/prisma/models.js';
import type { OrderStatus } from '../../generated/prisma/enums.js';

// App
import { dayOfDateColumn } from '../billing/billing-dates.js';

/** An order's credit, as `AffiliateOrderChangesService` reads it. */
export interface OrderAffiliateRow {
  status: OrderStatus;
  affiliate: { id: string; name: string; slug: string | null; status: AffiliateStatus } | null;
  affiliateCommission: AffiliateCommissionModel | null;
  affiliateChanges: AffiliateAttributionChangeModel[];
  refunds: { amountCents: number }[];
}

const partyOf = (id: string | null, name: string | null) => (name !== null ? { id, name } : null);

export function toOrderAffiliate(row: OrderAffiliateRow): OrderAffiliate {
  const commission = row.affiliateCommission;
  return {
    affiliate: row.affiliate,
    commission: commission
      ? {
          status: commission.status,
          baseCents: commission.baseCents,
          commissionCents: commission.commissionCents,
          tableName: commission.tableName,
          zeroReason: commission.zeroReason,
          dueOn: commission.dueOn ? dayOfDateColumn(commission.dueOn) : null,
          availableAt: commission.availableAt?.toISOString() ?? null,
        }
      : null,
    changes: row.affiliateChanges.map((change) => ({
      from: partyOf(change.fromAffiliateId, change.fromName),
      to: partyOf(change.toAffiliateId, change.toName),
      reason: change.reason,
      at: change.createdAt.toISOString(),
    })),
    refundedCents: row.refunds.reduce((sum, refund) => sum + refund.amountCents, 0),
    changeable: row.status !== 'CANCELLED' && (commission === null || commission.status === 'PENDING'),
  };
}

export function toStatementEntry(row: AffiliateEntryModel & { order: { number: number } | null; payout: AffiliatePayoutModel | null }): AffiliateStatementEntry {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: row.amountCents,
    orderNumber: row.order?.number ?? null,
    reason: row.reason,
    payout: row.payout ? { paidOn: dayOfDateColumn(row.payout.paidOn), method: row.payout.method, note: row.payout.note } : null,
    createdAt: row.createdAt.toISOString(),
  };
}
