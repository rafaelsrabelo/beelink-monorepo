// Types
import type { PageLockReason } from '@harness-monorepo/contracts';

// App
import { brasiliaDayOf, closeOfBrasiliaDay, lastDayBefore } from './billing-dates.js';
import { PAGES_EXISTED_ON } from './billing.constants.js';
import { lockOf, type LockRow } from './page-lock.js';
import { statusAt } from './subscription-status.js';

/*
  bee-link's pages as charging would find them at an instant (BEELINK-297), for the report run before
  it is switched on. Pure: the pages are handed in, and what each stands at is `lockOf` and `statusAt`
  asked at that instant — the rule is never written a second time here.
*/

/** A page as the report reads it. */
export interface ReportPage {
  slug: string;
  createdAt: Date;
  subscription: LockRow | null;
}

/** A page created after `PAGES_EXISTED_ON`, locked at the instant by its trial alone. */
export interface TrialOverPage {
  slug: string;
  createdOn: string;
  trialLastDay: string;
}

/** Every page in one group: exempt, with no subscription, locked by a reason, open on a paid plan, open by a free period, or in its trial. */
export interface BillingReport {
  pages: number;
  exempt: number;
  /** None once the migration of BEELINK-297 ran: a page with no row never locks, so it is counted to be seen. */
  withoutSubscription: number;
  locked: Record<PageLockReason, number>;
  /** Open on a plan it paid for: active, past due inside its grace, or cancelled while its paid period runs. */
  paid: number;
  /** Open by a free period — the month of 13/10/2026, or a coupon's — by its last day, the earliest first. */
  free: { lastDay: string; pages: number }[];
  /** Open in its trial, with no free period. */
  trial: number;
  /** Apart: the pages created after 13/10/2026 that lock the day charging is switched on, their trial being over. */
  trialOverSinceThen: TrialOverPage[];
}

/** The first instant of the day after `PAGES_EXISTED_ON` in Brasília: a page created from it on was given no month. */
const EXISTED_BEFORE = closeOfBrasiliaDay(PAGES_EXISTED_ON);

/** The report at `at`, of the pages in the order given. */
export function billingReportOf(pages: readonly ReportPage[], at: Date): BillingReport {
  const report: BillingReport = { pages: pages.length, exempt: 0, withoutSubscription: 0, locked: { TRIAL_EXPIRED: 0, SUSPENDED: 0, CANCELED: 0 }, paid: 0, free: [], trial: 0, trialOverSinceThen: [] };
  const free = new Map<string, number>();

  for (const page of pages) {
    const row = page.subscription;
    if (!row) {
      report.withoutSubscription += 1;
      continue;
    }
    if (row.status === 'EXEMPT') {
      report.exempt += 1;
      continue;
    }

    const lock = lockOf(row, at);
    if (lock) {
      report.locked[lock] += 1;
      if (lock === 'TRIAL_EXPIRED' && page.createdAt.getTime() >= EXISTED_BEFORE.getTime()) {
        report.trialOverSinceThen.push({ slug: page.slug, createdOn: brasiliaDayOf(page.createdAt), trialLastDay: lastDayBefore(row.trialEndsAt) });
      }
      continue;
    }

    // Open: a page that paid is told by its paid life, a free period before a trial that runs inside it.
    const status = statusAt(row, at);
    if (status === 'ACTIVE' || status === 'PAST_DUE' || status === 'CANCELED') report.paid += 1;
    else if (row.freePeriodEndsAt && at.getTime() < row.freePeriodEndsAt.getTime()) {
      const lastDay = lastDayBefore(row.freePeriodEndsAt);
      free.set(lastDay, (free.get(lastDay) ?? 0) + 1);
    } else report.trial += 1;
  }

  report.free = [...free].sort(([a], [b]) => a.localeCompare(b)).map(([lastDay, count]) => ({ lastDay, pages: count }));
  return report;
}
