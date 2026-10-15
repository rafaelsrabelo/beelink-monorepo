// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { billingReportOf, type ReportPage } from './billing-report.js';
import type { LockRow } from './page-lock.js';

/*
  The clock is simulated: every case is read at AT, 15/10/2026 at noon in Brasília, or at the instant it
  names. Midnights in Brasília are 03:00 UTC, as the columns hold them.
*/

const at = (iso: string): Date => new Date(iso);
const AT = at('2026-10-15T15:00:00.000Z');
/** The end of the month the pages of 13/10/2026 were given: 13/11 over. */
const MONTH_END = at('2026-11-14T03:00:00.000Z');

let pages = 0;
function page(createdAt: string, status: SubscriptionStatus | null, rest: Partial<LockRow> = {}): ReportPage {
  pages += 1;
  const created = at(createdAt);
  // The trial as openTrial counts it, for the cases that do not say otherwise: seven days after the day of creation.
  const trialEndsAt = at(`${new Date(created.getTime() - 3 * 3_600_000 + 8 * 86_400_000).toISOString().slice(0, 10)}T03:00:00.000Z`);
  return {
    slug: `pagina-${pages}`,
    createdAt: created,
    subscription: status ? { status, trialEndsAt, currentPeriodEndsAt: null, freePeriodEndsAt: null, graceEndsAt: null, ...rest } : null,
  };
}

describe("the report of bee-link's pages before charging is switched on (BEELINK-297)", () => {
  it('puts every page in one group, by the lock and the standing at the instant', () => {
    const report = billingReportOf(
      [
        page('2026-09-20T13:00:00.000Z', 'TRIALING', { freePeriodEndsAt: MONTH_END }),
        page('2026-10-13T18:00:00.000Z', 'TRIAL_EXPIRED', { freePeriodEndsAt: MONTH_END }),
        page('2026-10-13T19:00:00.000Z', 'TRIALING', { freePeriodEndsAt: at('2026-11-22T03:00:00.000Z') }),
        page('2026-10-13T20:00:00.000Z', 'EXEMPT'),
        page('2026-10-13T21:00:00.000Z', 'ACTIVE', { currentPeriodEndsAt: at('2026-11-14T03:00:00.000Z') }),
        page('2026-10-13T22:00:00.000Z', 'PAST_DUE', { currentPeriodEndsAt: at('2026-10-14T03:00:00.000Z') }),
        page('2026-10-01T22:00:00.000Z', 'SUSPENDED', { currentPeriodEndsAt: at('2026-10-02T03:00:00.000Z') }),
        page('2026-10-01T22:00:00.000Z', 'CANCELED'),
        page('2026-10-14T13:00:00.000Z', 'TRIALING'),
        page('2026-10-01T13:00:00.000Z', null),
      ],
      AT,
    );

    expect(report).toEqual({
      pages: 10,
      exempt: 1,
      withoutSubscription: 1,
      locked: { TRIAL_EXPIRED: 0, SUSPENDED: 1, CANCELED: 1 },
      paid: 2,
      free: [
        { lastDay: '2026-11-13', pages: 2 },
        { lastDay: '2026-11-21', pages: 1 },
      ],
      trial: 1,
      trialOverSinceThen: [],
    });
  });

  it('counts the month of 13/10 as running to its last instant, and locks those pages the instant it ends', () => {
    const pages = [page('2026-09-20T13:00:00.000Z', 'TRIALING', { freePeriodEndsAt: MONTH_END })];

    expect(billingReportOf(pages, new Date(MONTH_END.getTime() - 1)).free).toEqual([{ lastDay: '2026-11-13', pages: 1 }]);
    expect(billingReportOf(pages, MONTH_END)).toMatchObject({ free: [], locked: { TRIAL_EXPIRED: 1 }, trialOverSinceThen: [] });
  });

  it('tells apart the pages created after 13/10 whose trial is over: they lock the day charging is on', () => {
    const report = billingReportOf(
      [
        page('2026-10-14T02:59:59.999Z', 'TRIALING'),
        page('2026-10-14T03:00:00.000Z', 'TRIALING'),
        page('2026-10-20T18:00:00.000Z', 'TRIAL_EXPIRED'),
        page('2026-10-25T18:00:00.000Z', 'TRIALING'),
      ],
      at('2026-11-01T15:00:00.000Z'),
    );

    expect(report.locked.TRIAL_EXPIRED).toBe(3);
    expect(report.trial).toBe(1);
    expect(report.trialOverSinceThen).toEqual([
      { slug: expect.any(String), createdOn: '2026-10-14', trialLastDay: '2026-10-21' },
      { slug: expect.any(String), createdOn: '2026-10-20', trialLastDay: '2026-10-27' },
    ]);
  });

  it('keeps a page that paid among the paid while a free period also runs, and a page in its trial in the trial', () => {
    const report = billingReportOf(
      [
        page('2026-10-13T21:00:00.000Z', 'ACTIVE', { currentPeriodEndsAt: at('2026-11-16T03:00:00.000Z'), freePeriodEndsAt: MONTH_END }),
        page('2026-10-13T21:00:00.000Z', 'CANCELED', { currentPeriodEndsAt: at('2026-11-16T03:00:00.000Z') }),
        page('2026-10-14T21:00:00.000Z', 'TRIALING'),
      ],
      AT,
    );

    expect(report).toMatchObject({ paid: 2, free: [], trial: 1, locked: { TRIAL_EXPIRED: 0, SUSPENDED: 0, CANCELED: 0 } });
  });

  it('is empty with no page', () => {
    expect(billingReportOf([], AT)).toEqual({ pages: 0, exempt: 0, withoutSubscription: 0, locked: { TRIAL_EXPIRED: 0, SUSPENDED: 0, CANCELED: 0 }, paid: 0, free: [], trial: 0, trialOverSinceThen: [] });
  });
});
