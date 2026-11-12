// Types
import type { AffiliateOwed, AffiliateOwedDay, AffiliateOwedRow, AffiliateStatus } from '@harness-monorepo/contracts';

/*
  What a shop owes its affiliates, by due day (IMPULSEIA-107, addendum A of the epic). What is owed
  to one affiliate is their available balance; a payout settles what fell due first, so that balance
  is the most recent of their commissions. It is laid over their available commissions from the
  latest due day back, and what is left past all of them — an adjustment in their favour — has no due
  day. A day before today with something still owed is overdue.
*/

export interface OwedAffiliate {
  id: string;
  name: string;
  slug: string | null;
  status: AffiliateStatus;
  pixKey: string | null;
  availableCents: number;
  pendingCents: number;
}

/** One available commission of an affiliate who is owed something: its due day and its amount. */
export interface OwedCommission {
  affiliateId: string;
  dueOn: string;
  commissionCents: number;
}

export interface OwedInput {
  today: string;
  affiliates: readonly OwedAffiliate[];
  /** Available commissions of the affiliates owed something, each affiliate's latest due day first. */
  available: readonly OwedCommission[];
  /** Pending commissions already delivered: their due day, still to come. */
  upcoming: readonly OwedCommission[];
  awaitingDeliveryCents: number;
}

/** Days `YYYY-MM-DD` compare as the strings they are. */
const stateOf = (dueOn: string, today: string): AffiliateOwedDay['state'] => (dueOn < today ? 'OVERDUE' : dueOn === today ? 'TODAY' : 'UPCOMING');

/** What falls on each day, across affiliates, soonest first. */
function daysOf(slices: readonly OwedCommission[], today: string): AffiliateOwedDay[] {
  const byDay = new Map<string, { amountCents: number; affiliates: Set<string> }>();
  for (const slice of slices) {
    const day = byDay.get(slice.dueOn) ?? { amountCents: 0, affiliates: new Set<string>() };
    day.amountCents += slice.commissionCents;
    day.affiliates.add(slice.affiliateId);
    byDay.set(slice.dueOn, day);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([dueOn, day]) => ({ dueOn, amountCents: day.amountCents, affiliateCount: day.affiliates.size, state: stateOf(dueOn, today) }));
}

export function owedOf(input: OwedInput): AffiliateOwed {
  const owedSlices: OwedCommission[] = [];
  const rows: AffiliateOwedRow[] = [];
  let undatedCents = 0;

  for (const affiliate of input.affiliates) {
    let left = Math.max(0, affiliate.availableCents);
    let oldestDueOn: string | null = null;
    for (const commission of input.available) {
      if (left === 0) break;
      if (commission.affiliateId !== affiliate.id || commission.commissionCents <= 0) continue;
      const taken = Math.min(left, commission.commissionCents);
      owedSlices.push({ affiliateId: affiliate.id, dueOn: commission.dueOn, commissionCents: taken });
      left -= taken;
      oldestDueOn = commission.dueOn;
    }
    undatedCents += left;
    rows.push({
      affiliate: { id: affiliate.id, name: affiliate.name, slug: affiliate.slug, status: affiliate.status, pixKey: affiliate.pixKey },
      availableCents: affiliate.availableCents,
      pendingCents: affiliate.pendingCents,
      oldestDueOn,
      overdue: oldestDueOn !== null && oldestDueOn < input.today,
    });
  }

  rows.sort((a, b) => b.availableCents - a.availableCents || b.pendingCents - a.pendingCents || a.affiliate.name.localeCompare(b.affiliate.name, 'pt-BR'));
  return {
    today: input.today,
    owedCents: input.affiliates.reduce((sum, affiliate) => sum + Math.max(0, affiliate.availableCents), 0),
    due: daysOf(owedSlices, input.today),
    undatedCents,
    upcoming: daysOf(input.upcoming, input.today),
    awaitingDeliveryCents: input.awaitingDeliveryCents,
    affiliates: rows,
  };
}
