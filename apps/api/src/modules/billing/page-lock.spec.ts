// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { SUBSCRIPTION_STATUSES } from './billing.constants.js';
import { lockChangesAt, lockOf, lockStartOf, type LockRow } from './page-lock.js';
import { graceEndOf } from './subscription-status.js';

/*
  The clock is simulated: every case names the instant it is read at. Midnights in Brasília are 03:00
  UTC, and every end below is one, as the columns hold them.
*/

const at = (iso: string): Date => new Date(iso);
const before = (instant: Date): Date => new Date(instant.getTime() - 1);

/** Created on 13/10: its trial's last day is 20/10, and it is over at the midnight that closes it. */
const TRIAL_END = at('2026-10-21T03:00:00.000Z');
/** A month paid from 15/10: it runs through 15/11. */
const PERIOD_END = at('2026-11-16T03:00:00.000Z');
/** Seven days after it: through 22/11. */
const GRACE_END = at('2026-11-23T03:00:00.000Z');

function row(status: SubscriptionStatus, rest: Partial<LockRow> = {}): LockRow {
  return { status, trialEndsAt: TRIAL_END, currentPeriodEndsAt: null, freePeriodEndsAt: null, graceEndsAt: null, ...rest };
}

describe('whether a page is locked, and why (BEELINK-223)', () => {
  describe('a page that never paid', () => {
    it('is open through its trial, to the last millisecond of its last day', () => {
      expect(lockOf(row('TRIALING'), at('2026-10-13T16:24:00.000Z'))).toBeNull();
      expect(lockOf(row('TRIALING'), before(TRIAL_END))).toBeNull();
    });

    it('is locked from the instant its trial ends, though nothing wrote it', () => {
      expect(lockOf(row('TRIALING'), TRIAL_END)).toBe('TRIAL_EXPIRED');
      expect(lockOf(row('TRIALING'), at('2027-03-01T12:00:00.000Z'))).toBe('TRIAL_EXPIRED');
    });

    it('is locked once the routine wrote its trial expired', () => {
      expect(lockOf(row('TRIAL_EXPIRED'), at('2026-10-25T12:00:00.000Z'))).toBe('TRIAL_EXPIRED');
    });

    it('is open again the moment a payment made it active', () => {
      expect(lockOf(row('ACTIVE', { currentPeriodEndsAt: PERIOD_END }), at('2026-10-25T12:00:00.000Z'))).toBeNull();
    });
  });

  describe('a page that paid', () => {
    const paid = row('ACTIVE', { currentPeriodEndsAt: PERIOD_END });

    it('is open through its paid period', () => {
      expect(lockOf(paid, before(PERIOD_END))).toBeNull();
    });

    it('is still open when the period ends unpaid — past due, inside its grace — whether or not anything wrote it', () => {
      expect(lockOf(paid, PERIOD_END)).toBeNull();
      expect(lockOf(paid, before(GRACE_END))).toBeNull();
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END }), before(GRACE_END))).toBeNull();
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END, graceEndsAt: GRACE_END }), before(GRACE_END))).toBeNull();
    });

    it('is suspended from the instant its grace ends — seven days after its period — whether or not anything wrote it', () => {
      expect(lockOf(paid, GRACE_END)).toBe('SUSPENDED');
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END }), GRACE_END)).toBe('SUSPENDED');
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END, graceEndsAt: GRACE_END }), GRACE_END)).toBe('SUSPENDED');
      expect(lockOf(row('SUSPENDED', { currentPeriodEndsAt: PERIOD_END, graceEndsAt: GRACE_END }), at('2027-01-10T12:00:00.000Z'))).toBe('SUSPENDED');
    });

    it('is open again once a payment after the suspension made it active', () => {
      const renewed = at('2026-12-16T03:00:00.000Z');
      expect(lockOf(row('ACTIVE', { currentPeriodEndsAt: renewed }), at('2026-11-30T12:00:00.000Z'))).toBeNull();
    });

    it('with no period to count from, has its grace from the day it was found past due, and keeps it once written', () => {
      const found = at('2026-11-20T15:00:00.000Z');
      // Found on 20/11: its grace runs through 27/11.
      const written = at('2026-11-28T03:00:00.000Z');

      expect(graceEndOf({ currentPeriodEndsAt: null, graceEndsAt: null }, found)).toEqual(written);
      expect(lockOf(row('PAST_DUE', { graceEndsAt: written }), before(written))).toBeNull();
      expect(lockOf(row('PAST_DUE', { graceEndsAt: written }), written)).toBe('SUSPENDED');
      // Not yet written: nothing to count from, so it is not locked — the clock writes it within a minute.
      expect(lockOf(row('PAST_DUE'), at('2027-06-01T12:00:00.000Z'))).toBeNull();
    });

    it('never has a written grace moved earlier, and has one counted later than the written one followed', () => {
      const later = at('2026-11-26T03:00:00.000Z');
      expect(graceEndOf({ currentPeriodEndsAt: PERIOD_END, graceEndsAt: later }, PERIOD_END)).toEqual(later);
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END, graceEndsAt: later }), GRACE_END)).toBeNull();

      const earlier = at('2026-11-20T03:00:00.000Z');
      expect(graceEndOf({ currentPeriodEndsAt: PERIOD_END, graceEndsAt: earlier }, PERIOD_END)).toEqual(GRACE_END);
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END, graceEndsAt: earlier }), before(GRACE_END))).toBeNull();
    });
  });

  describe('a page whose subscription ended', () => {
    it('is open while the period it paid for runs, and locked from its end', () => {
      const cancelled = row('CANCELED', { currentPeriodEndsAt: PERIOD_END });
      expect(lockOf(cancelled, before(PERIOD_END))).toBeNull();
      expect(lockOf(cancelled, PERIOD_END)).toBe('CANCELED');
    });

    it('is locked at once with no paid period left — its money given back', () => {
      expect(lockOf(row('CANCELED'), at('2026-10-25T12:00:00.000Z'))).toBe('CANCELED');
    });

    it('gains no grace: a cancelled page is not past due', () => {
      expect(lockOf(row('CANCELED', { currentPeriodEndsAt: PERIOD_END }), before(GRACE_END))).toBe('CANCELED');
    });
  });

  describe('a free period a coupon gave', () => {
    const FREE_END = at('2026-11-21T03:00:00.000Z');

    it.each<SubscriptionStatus>(['TRIALING', 'TRIAL_EXPIRED', 'PAST_DUE', 'SUSPENDED', 'CANCELED'])('keeps a page standing at %s open until it ends', (status) => {
      expect(lockOf(row(status, { freePeriodEndsAt: FREE_END }), before(FREE_END))).toBeNull();
    });

    it('locks a page that never paid from the instant it ends, the rule as ever', () => {
      expect(lockOf(row('TRIALING', { freePeriodEndsAt: FREE_END }), FREE_END)).toBe('TRIAL_EXPIRED');
      expect(lockOf(row('TRIAL_EXPIRED', { freePeriodEndsAt: FREE_END }), FREE_END)).toBe('TRIAL_EXPIRED');
    });

    it('keeps one whose trial outlasts it in trial', () => {
      expect(lockOf(row('TRIALING', { freePeriodEndsAt: at('2026-10-18T03:00:00.000Z') }), at('2026-10-19T12:00:00.000Z'))).toBeNull();
    });

    it('locks a past one no more than the rule would', () => {
      expect(lockOf(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END, freePeriodEndsAt: at('2026-11-18T03:00:00.000Z') }), at('2026-11-19T12:00:00.000Z'))).toBeNull();
      expect(lockOf(row('SUSPENDED', { freePeriodEndsAt: FREE_END }), FREE_END)).toBe('SUSPENDED');
    });
  });

  it('never locks an exempt page, whatever its dates say', () => {
    const exempt = row('EXEMPT', { currentPeriodEndsAt: at('2020-01-01T03:00:00.000Z'), graceEndsAt: at('2020-01-08T03:00:00.000Z'), freePeriodEndsAt: at('2020-02-01T03:00:00.000Z') });
    expect(lockOf(exempt, at('2030-01-01T00:00:00.000Z'))).toBeNull();
  });

  it('answers one of the three reasons, and nothing else, for every standing', () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      for (const now of [at('2026-10-01T00:00:00.000Z'), at('2030-01-01T00:00:00.000Z')]) {
        expect([null, 'TRIAL_EXPIRED', 'SUSPENDED', 'CANCELED']).toContain(lockOf(row(status, { currentPeriodEndsAt: PERIOD_END }), now));
      }
    }
  });
});

describe('when what the lock answers may stop holding by the clock alone (BEELINK-223)', () => {
  const now = at('2026-10-15T12:00:00.000Z');

  it("is a page in trial's end of trial", () => {
    expect(lockChangesAt(row('TRIALING'), now)).toEqual(TRIAL_END);
  });

  it("is a paid page's end of period, where a cancellation would lock it and the grace begins", () => {
    expect(lockChangesAt(row('ACTIVE', { currentPeriodEndsAt: PERIOD_END }), at('2026-11-01T12:00:00.000Z'))).toEqual(PERIOD_END);
    expect(lockChangesAt(row('CANCELED', { currentPeriodEndsAt: PERIOD_END }), at('2026-11-01T12:00:00.000Z'))).toEqual(PERIOD_END);
  });

  it("is a past due page's end of grace", () => {
    expect(lockChangesAt(row('PAST_DUE', { currentPeriodEndsAt: PERIOD_END }), at('2026-11-18T12:00:00.000Z'))).toEqual(GRACE_END);
    expect(lockChangesAt(row('ACTIVE', { currentPeriodEndsAt: PERIOD_END }), at('2026-11-18T12:00:00.000Z'))).toEqual(GRACE_END);
  });

  it('is the end of a free period, when it comes first', () => {
    const freeEnd = at('2026-11-14T03:00:00.000Z');
    expect(lockChangesAt(row('TRIAL_EXPIRED', { freePeriodEndsAt: freeEnd }), at('2026-11-01T12:00:00.000Z'))).toEqual(freeEnd);
  });

  it('is a minute from now for a locked page: only a payment opens it', () => {
    expect(lockChangesAt(row('TRIAL_EXPIRED'), now)).toEqual(new Date(now.getTime() + 60_000));
    expect(lockChangesAt(row('CANCELED'), now)).toEqual(new Date(now.getTime() + 60_000));
  });

  it('is nothing for an exempt page, which no clock moves', () => {
    expect(lockChangesAt(row('EXEMPT'), now)).toBeNull();
  });
});

describe('the first instant a page is locked if only the clock moves (BEELINK-297)', () => {
  /** The start of the day charging is switched on, in these cases: 20/11. */
  const SWITCH_ON = at('2026-11-20T03:00:00.000Z');
  /** The end of the month the pages of 13/10/2026 were given: 13/11 over. */
  const MONTH_END = at('2026-11-14T03:00:00.000Z');

  it('is the end of the free month, when charging is on before it', () => {
    expect(lockStartOf(row('TRIALING', { freePeriodEndsAt: MONTH_END }), at('2026-11-01T03:00:00.000Z'))).toEqual(MONTH_END);
    expect(lockStartOf(row('TRIAL_EXPIRED', { freePeriodEndsAt: MONTH_END }), at('2026-11-01T03:00:00.000Z'))).toEqual(MONTH_END);
  });

  it('is the day charging is on, for a page whose free month or trial is already over by then', () => {
    expect(lockStartOf(row('TRIALING', { freePeriodEndsAt: MONTH_END }), SWITCH_ON)).toEqual(SWITCH_ON);
    expect(lockStartOf(row('TRIALING'), SWITCH_ON)).toEqual(SWITCH_ON);
    expect(lockStartOf(row('TRIAL_EXPIRED'), SWITCH_ON)).toEqual(SWITCH_ON);
  });

  it('is the end of a trial still running then, or of a free month that outlasts it', () => {
    const lateTrial = at('2026-11-25T03:00:00.000Z');
    expect(lockStartOf(row('TRIALING', { trialEndsAt: lateTrial }), SWITCH_ON)).toEqual(lateTrial);
    const coupon = at('2026-11-22T03:00:00.000Z');
    expect(lockStartOf(row('TRIALING', { freePeriodEndsAt: coupon }), SWITCH_ON)).toEqual(coupon);
    expect(lockStartOf(row('TRIALING', { trialEndsAt: lateTrial, freePeriodEndsAt: at('2026-12-26T03:00:00.000Z') }), SWITCH_ON)).toEqual(at('2026-12-26T03:00:00.000Z'));
  });

  it('is the end of the grace for a page that paid and does not renew', () => {
    expect(lockStartOf(row('ACTIVE', { currentPeriodEndsAt: PERIOD_END }), at('2026-11-01T03:00:00.000Z'))).toEqual(GRACE_END);
    expect(lockStartOf(row('CANCELED', { currentPeriodEndsAt: PERIOD_END }), at('2026-11-01T03:00:00.000Z'))).toEqual(PERIOD_END);
  });

  it('is never, for an exempt page', () => {
    expect(lockStartOf(row('EXEMPT', { freePeriodEndsAt: MONTH_END }), SWITCH_ON)).toBeNull();
  });

  it('agrees with the lock: open just before it, locked at it', () => {
    for (const page of [row('TRIALING', { freePeriodEndsAt: MONTH_END }), row('TRIALING', { trialEndsAt: at('2026-11-25T03:00:00.000Z') }), row('ACTIVE', { currentPeriodEndsAt: PERIOD_END })]) {
      const from = at('2026-11-01T03:00:00.000Z');
      const locks = lockStartOf(page, from)!;
      expect(lockOf(page, before(locks))).toBeNull();
      expect(lockOf(page, locks)).not.toBeNull();
    }
  });
});
