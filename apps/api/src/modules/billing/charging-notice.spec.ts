// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { noticeLinesOf, type NoticePage } from './charging-notice.js';
import type { LockRow } from './page-lock.js';

/*
  The day each page locks, told before charging starts. Midnights in Brasília are 03:00 UTC, as the
  columns hold them; charging starts, in these cases, on 20/11/2026 unless one says otherwise.
*/

const at = (iso: string): Date => new Date(iso);
/** The end of the month the pages of 13/10/2026 were given: 13/11 over. */
const MONTH_END = at('2026-11-14T03:00:00.000Z');

function page(name: string, status: SubscriptionStatus | null, rest: Partial<LockRow> = {}): NoticePage {
  return {
    name,
    slug: name.toLowerCase(),
    subscription: status ? { status, trialEndsAt: at('2026-10-21T03:00:00.000Z'), currentPeriodEndsAt: null, freePeriodEndsAt: null, graceEndsAt: null, ...rest } : null,
  };
}

describe('the pages a notice tells of, and the day each locks (BEELINK-297)', () => {
  it('tells a page of 13/10 it is free to the end of its month, and locks the day after, when charging starts before', () => {
    expect(noticeLinesOf([page('Antiga', 'TRIALING', { freePeriodEndsAt: MONTH_END })], '2026-11-01')).toEqual([{ name: 'Antiga', slug: 'antiga', freeUntil: '2026-11-13', locksOn: '2026-11-14' }]);
  });

  it('tells a page whose free time is over by then that it locks the day charging starts', () => {
    expect(noticeLinesOf([page('Antiga', 'TRIALING', { freePeriodEndsAt: MONTH_END }), page('Vencida', 'TRIAL_EXPIRED')], '2026-11-20')).toEqual([
      { name: 'Antiga', slug: 'antiga', freeUntil: null, locksOn: '2026-11-20' },
      { name: 'Vencida', slug: 'vencida', freeUntil: null, locksOn: '2026-11-20' },
    ]);
  });

  it('tells a page in a trial or a coupon month that outlasts the day, the day it ends', () => {
    expect(noticeLinesOf([page('Nova', 'TRIALING', { trialEndsAt: at('2026-11-25T03:00:00.000Z') }), page('Cupom', 'TRIALING', { freePeriodEndsAt: at('2026-11-22T03:00:00.000Z') })], '2026-11-20')).toEqual([
      { name: 'Nova', slug: 'nova', freeUntil: '2026-11-24', locksOn: '2026-11-25' },
      { name: 'Cupom', slug: 'cupom', freeUntil: '2026-11-21', locksOn: '2026-11-22' },
    ]);
  });

  it('tells a page whose free time ends as the day begins that it locks that day', () => {
    expect(noticeLinesOf([page('Antiga', 'TRIALING', { freePeriodEndsAt: MONTH_END })], '2026-11-14')).toEqual([{ name: 'Antiga', slug: 'antiga', freeUntil: null, locksOn: '2026-11-14' }]);
  });

  it('tells nothing of a page exempt, one that paid, or one with no subscription', () => {
    const left = [
      page('Isenta', 'EXEMPT'),
      page('Ativa', 'ACTIVE', { currentPeriodEndsAt: at('2026-12-01T03:00:00.000Z') }),
      page('Atrasada', 'PAST_DUE', { currentPeriodEndsAt: at('2026-11-01T03:00:00.000Z') }),
      page('Suspensa', 'SUSPENDED', { currentPeriodEndsAt: at('2026-10-01T03:00:00.000Z') }),
      page('Cancelada', 'CANCELED'),
      page('Sem linha', null),
    ];

    expect(noticeLinesOf(left, '2026-11-20')).toEqual([]);
  });
});
