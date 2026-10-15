// Types
import type { BillingCycle } from '@harness-monorepo/contracts';

// App
import { brasiliaDayOf, closeOfBrasiliaDay, daysLeft, freeMonthEndOf, lastDayBefore, periodEndDayOf, renewalDayOf, trialEndOf, trialLastDayOf } from './billing-dates.js';
import { BILLING_CYCLES, CYCLE_MONTHS, TRIAL_DAYS } from './billing.constants.js';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** An instant said as Brasília's clock reads it. */
const brt = (local: string): Date => new Date(`${local}-03:00`);

describe('a day of Brasília’s calendar', () => {
  it('is still today at 22h there, though UTC is already tomorrow', () => {
    expect(brasiliaDayOf(new Date('2026-10-14T01:30:00.000Z'))).toBe('2026-10-13');
    expect(brasiliaDayOf(new Date('2026-10-14T02:59:59.999Z'))).toBe('2026-10-13');
    expect(brasiliaDayOf(new Date('2026-10-14T03:00:00.000Z'))).toBe('2026-10-14');
  });

  it('turns the year at Brasília’s midnight, not at UTC’s', () => {
    expect(brasiliaDayOf(new Date('2027-01-01T02:00:00.000Z'))).toBe('2026-12-31');
    expect(brasiliaDayOf(new Date('2027-01-01T03:00:00.000Z'))).toBe('2027-01-01');
  });

  it('closes at the midnight that opens the day after it', () => {
    expect(closeOfBrasiliaDay('2026-10-20').toISOString()).toBe('2026-10-21T03:00:00.000Z');
    expect(closeOfBrasiliaDay('2026-12-31').toISOString()).toBe('2027-01-01T03:00:00.000Z');
    expect(closeOfBrasiliaDay('2028-02-28').toISOString()).toBe('2028-02-29T03:00:00.000Z');
  });

  it('is the last day an end still covers: the end itself is already the next', () => {
    expect(lastDayBefore(new Date('2026-10-21T03:00:00.000Z'))).toBe('2026-10-20');
    expect(lastDayBefore(new Date('2026-10-21T03:00:00.001Z'))).toBe('2026-10-21');
    expect(lastDayBefore(closeOfBrasiliaDay('2027-02-28'))).toBe('2027-02-28');
  });

  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '2026-04-31', '20261020', '2026-10-20T00:00:00Z', '13/10/2026', ''])(
    'refuses "%s", which names no day',
    (day) => {
      expect(() => closeOfBrasiliaDay(day)).toThrow(RangeError);
    },
  );
});

describe('the day a trial ends', () => {
  it('is seven days after the day the page was created, whatever the hour', () => {
    expect(TRIAL_DAYS).toBe(7);
    expect(trialLastDayOf(brt('2026-10-13T13:24:00'))).toBe('2026-10-20');
    expect(trialLastDayOf(brt('2026-10-13T00:00:00'))).toBe('2026-10-20');
    expect(trialLastDayOf(brt('2026-10-13T23:59:59.999'))).toBe('2026-10-20');
  });

  it('counts from Brasília’s day: a page created at 22h there is not created tomorrow', () => {
    const created = new Date('2026-10-14T01:00:00.000Z');
    expect(brasiliaDayOf(created)).toBe('2026-10-13');
    expect(trialLastDayOf(created)).toBe('2026-10-20');
  });

  it('is over at the midnight in Brasília that closes that day', () => {
    expect(trialEndOf(brt('2026-10-13T13:24:00')).toISOString()).toBe('2026-10-21T03:00:00.000Z');
    expect(trialEndOf(brt('2026-10-13T00:00:00')).toISOString()).toBe('2026-10-21T03:00:00.000Z');
    expect(trialEndOf(brt('2026-10-13T23:59:59.999')).toISOString()).toBe('2026-10-21T03:00:00.000Z');
  });

  it.each([
    ['the end of a month', '2026-10-28T10:00:00', '2026-11-04'],
    ['the end of a year', '2026-12-28T10:00:00', '2027-01-04'],
    ['February', '2027-02-24T10:00:00', '2027-03-03'],
    ['February of a leap year', '2028-02-24T10:00:00', '2028-03-02'],
    ['the 29th of February', '2028-02-29T10:00:00', '2028-03-07'],
    ['new year’s eve, a minute before midnight', '2026-12-31T23:59:00', '2027-01-07'],
  ])('crosses %s', (_what, created, lastDay) => {
    expect(trialLastDayOf(brt(created))).toBe(lastDay);
    expect(trialEndOf(brt(created))).toEqual(brt(`${lastDay}T24:00:00`));
  });

  it('never lasts less than seven whole days, nor more than eight, from any hour of two years', () => {
    const first = brt('2027-01-01T00:00:00').getTime();
    const last = brt('2028-12-31T23:00:00').getTime();

    // Every hour, and the last millisecond of each: the two ends of a day are where a count goes wrong.
    for (let at = first; at <= last; at += HOUR) {
      for (const created of [new Date(at), new Date(at + HOUR - 1)]) {
        const length = trialEndOf(created).getTime() - created.getTime();
        if (length < 7 * DAY || length > 8 * DAY) throw new Error(`A trial begun at ${created.toISOString()} lasts ${length / DAY} days`);
      }
    }

    expect(trialEndOf(brt('2027-06-10T00:00:00')).getTime() - brt('2027-06-10T00:00:00').getTime()).toBe(8 * DAY);
    expect(trialEndOf(brt('2027-06-10T23:59:59.999')).getTime() - brt('2027-06-10T23:59:59.999').getTime()).toBe(7 * DAY + 1);
  });
});

describe('the days left of a trial', () => {
  const endsAt = trialEndOf(brt('2026-10-13T13:24:00'));

  it.each([
    ['the instant the page is created', '2026-10-13T13:24:00', 7],
    ['the last minute of that day', '2026-10-13T23:59:00', 7],
    ['the first instant of the day after', '2026-10-14T00:00:00', 6],
    ['the middle of the trial', '2026-10-17T09:00:00', 3],
    ['the eve of the last day', '2026-10-19T23:59:59.999', 1],
    ['the first instant of the last day', '2026-10-20T00:00:00', 0],
    ['the last instant of the last day', '2026-10-20T23:59:59.999', 0],
    ['the instant it ends', '2026-10-21T00:00:00', 0],
    ['a year after', '2027-10-21T12:00:00', 0],
  ])('at %s', (_when, now, days) => {
    expect(daysLeft(endsAt, brt(now))).toBe(days);
  });

  it('counts days of Brasília’s calendar: 22h there is the day it is, not UTC’s', () => {
    // 01:00 UTC on the 20th is still the 19th in Brasília: one day is left, not none.
    expect(daysLeft(endsAt, new Date('2026-10-20T01:00:00.000Z'))).toBe(1);
  });

  it('reads an end that is no midnight by the day it falls on', () => {
    const noon = brt('2026-10-20T12:00:00');
    expect(daysLeft(noon, brt('2026-10-19T08:00:00'))).toBe(1);
    expect(daysLeft(noon, brt('2026-10-20T08:00:00'))).toBe(0);
  });

  it('crosses a year', () => {
    expect(daysLeft(trialEndOf(brt('2026-12-28T10:00:00')), brt('2026-12-31T23:00:00'))).toBe(4);
    expect(daysLeft(trialEndOf(brt('2026-12-28T10:00:00')), brt('2027-01-01T00:00:00'))).toBe(3);
  });
});

describe('the due day of a renewal, by Asaas’s rule', () => {
  // What Asaas's sandbox answered for a monthly subscription first due on the 31st (BEELINK-289, test 15).
  it('keeps the 31st and falls back to the month’s last day, as the sandbox did', () => {
    const days = [0, 1, 2, 3, 4, 5, 6, 7].map((renewal) => renewalDayOf('2026-10-31', 'MONTHLY', renewal));
    expect(days).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31']);
  });

  // The same sandbox, tests 2 to 4: a subscription first charged on 13/10/2026.
  it('answers the next due days the sandbox answered for the three cycles', () => {
    expect(renewalDayOf('2026-10-13', 'MONTHLY', 1)).toBe('2026-11-13');
    expect(renewalDayOf('2026-10-13', 'SEMIANNUAL', 1)).toBe('2027-04-13');
    expect(renewalDayOf('2026-10-13', 'ANNUAL', 1)).toBe('2027-10-13');
  });

  it('is counted from the first charge, never from the renewal before', () => {
    const second = renewalDayOf('2026-10-31', 'MONTHLY', 2);
    const chained = renewalDayOf(renewalDayOf('2026-10-31', 'MONTHLY', 1), 'MONTHLY', 1);

    expect(second).toBe('2026-12-31');
    expect(chained).toBe('2026-12-30');
  });

  it('the first charge is its own day', () => {
    for (const cycle of BILLING_CYCLES) expect(renewalDayOf('2028-02-29', cycle, 0)).toBe('2028-02-29');
  });

  it.each<[string, string, BillingCycle, string[]]>([
    ['the 30th through February', '2026-12-30', 'MONTHLY', ['2027-01-30', '2027-02-28', '2027-03-30']],
    ['the 29th through a February that has none', '2027-01-29', 'MONTHLY', ['2027-02-28', '2027-03-29']],
    ['the 31st through a leap February', '2027-12-31', 'MONTHLY', ['2028-01-31', '2028-02-29', '2028-03-31', '2028-04-30']],
    ['the 29th through a leap February, which has it', '2028-01-29', 'MONTHLY', ['2028-02-29', '2028-03-29']],
    ['the turn of the year', '2026-12-15', 'MONTHLY', ['2027-01-15', '2027-02-15']],
    ['the 30th of November through the turn of the year', '2026-11-30', 'MONTHLY', ['2026-12-30', '2027-01-30', '2027-02-28', '2027-03-30']],
    ['six months from the 31st of August', '2026-08-31', 'SEMIANNUAL', ['2027-02-28', '2027-08-31', '2028-02-29', '2028-08-31']],
    ['six months from the 30th of September', '2026-09-30', 'SEMIANNUAL', ['2027-03-30', '2027-09-30']],
    ['six months across the turn of the year', '2026-07-15', 'SEMIANNUAL', ['2027-01-15', '2027-07-15']],
    ['a year from an ordinary day', '2026-10-13', 'ANNUAL', ['2027-10-13', '2028-10-13']],
    ['a year from the 28th of February into a leap year', '2027-02-28', 'ANNUAL', ['2028-02-28', '2029-02-28']],
    ['a year from the 31st of December', '2026-12-31', 'ANNUAL', ['2027-12-31', '2028-12-31']],
  ])('%s', (_what, first, cycle, expected) => {
    expect(expected.map((_day, index) => renewalDayOf(first, cycle, index + 1))).toEqual(expected);
  });

  // Not seen at Asaas: the rule of the 31st applied to a subscription first due on a 29th of February.
  it('a yearly one begun on the 29th of February returns to the 29th in the next leap year', () => {
    const days = [1, 2, 3, 4].map((renewal) => renewalDayOf('2028-02-29', 'ANNUAL', renewal));
    expect(days).toEqual(['2029-02-28', '2030-02-28', '2031-02-28', '2032-02-29']);
  });

  it('holds over many years: ten years of months from the 31st', () => {
    expect(renewalDayOf('2026-10-31', 'MONTHLY', 120)).toBe('2036-10-31');
    expect(renewalDayOf('2026-10-31', 'MONTHLY', 124)).toBe('2037-02-28');
    expect(renewalDayOf('2026-10-31', 'MONTHLY', 16)).toBe('2028-02-29');
  });

  /**
   * The same rule written the slow way — a month at a time, and the day walked down from the first
   * charge's until the month has it — to hold the arithmetic above to something it does not share.
   */
  function slowly(first: string, cycle: BillingCycle, renewal: number): string {
    const [year, month, day] = first.split('-').map(Number) as [number, number, number];
    let y = year;
    let m = month;
    for (let step = 0; step < renewal * CYCLE_MONTHS[cycle]; step += 1) {
      m += 1;
      if (m === 13) {
        m = 1;
        y += 1;
      }
    }
    for (let d = day; d >= 28; d -= 1) {
      const candidate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (!Number.isNaN(new Date(`${candidate}T00:00:00.000Z`).getTime()) && new Date(`${candidate}T00:00:00.000Z`).toISOString().startsWith(candidate)) return candidate;
    }
    return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  it('agrees with the rule walked a month at a time, from every day of a leap year and of the one before it', () => {
    let compared = 0;
    for (let at = Date.UTC(2027, 0, 1); at <= Date.UTC(2028, 11, 31); at += DAY) {
      const first = new Date(at).toISOString().slice(0, 10);
      for (const cycle of BILLING_CYCLES) {
        for (let renewal = 0; renewal <= 26; renewal += 1) {
          const day = renewalDayOf(first, cycle, renewal);
          if (day !== slowly(first, cycle, renewal)) throw new Error(`${first} ${cycle} #${renewal}: ${day}, and slowly ${slowly(first, cycle, renewal)}`);
          compared += 1;
        }
      }
    }
    expect(compared).toBe(731 * 3 * 27);
  });

  it('never leaves the month it is due in, and never passes the first charge’s day', () => {
    for (const first of ['2027-01-28', '2027-01-29', '2027-01-30', '2027-01-31', '2028-02-29']) {
      for (let renewal = 1; renewal <= 48; renewal += 1) {
        const day = renewalDayOf(first, 'MONTHLY', renewal);
        const monthsOn = (Number(day.slice(0, 4)) - Number(first.slice(0, 4))) * 12 + Number(day.slice(5, 7)) - Number(first.slice(5, 7));
        expect(monthsOn).toBe(renewal);
        expect(Number(day.slice(8))).toBeLessThanOrEqual(Number(first.slice(8)));
      }
    }
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('refuses %s as a renewal', (renewal) => {
    expect(() => renewalDayOf('2026-10-13', 'MONTHLY', renewal)).toThrow(RangeError);
  });

  it('refuses a first day that names none', () => {
    expect(() => renewalDayOf('2026-02-31', 'MONTHLY', 1)).toThrow(RangeError);
  });
});

describe('the day a paid period ends', () => {
  it('is one, six and twelve months after the first charge', () => {
    expect(periodEndDayOf('2026-10-13', 'MONTHLY')).toBe('2026-11-13');
    expect(periodEndDayOf('2026-10-13', 'SEMIANNUAL')).toBe('2027-04-13');
    expect(periodEndDayOf('2026-10-13', 'ANNUAL')).toBe('2027-10-13');
  });

  it('is the due day of the charge after the one that paid for it', () => {
    expect(periodEndDayOf('2026-10-31', 'MONTHLY', 0)).toBe('2026-11-30');
    expect(periodEndDayOf('2026-10-31', 'MONTHLY', 1)).toBe('2026-12-31');
    expect(periodEndDayOf('2026-10-31', 'MONTHLY', 3)).toBe('2027-02-28');
    expect(periodEndDayOf('2026-08-31', 'SEMIANNUAL', 0)).toBe('2027-02-28');
    expect(periodEndDayOf('2028-02-29', 'ANNUAL', 0)).toBe('2029-02-28');
  });

  it('a period paid in December ends in the year after', () => {
    expect(periodEndDayOf('2026-12-31', 'MONTHLY')).toBe('2027-01-31');
    expect(periodEndDayOf('2026-12-10', 'SEMIANNUAL')).toBe('2027-06-10');
    expect(periodEndDayOf('2026-12-10', 'ANNUAL')).toBe('2027-12-10');
  });
});

describe('the end of a free month (BEELINK-224)', () => {
  it('is the midnight in Brasília closing the same day a month later: a free month ends as a paid one does', () => {
    expect(freeMonthEndOf('2026-10-15').toISOString()).toBe('2026-11-16T03:00:00.000Z');
    expect(freeMonthEndOf('2026-10-15').getTime()).toBe(closeOfBrasiliaDay(periodEndDayOf('2026-10-15', 'MONTHLY')).getTime());
  });

  it("is the end of 13/11/2026 for the month the pages that existed on 13/10/2026 were given", () => {
    expect(freeMonthEndOf('2026-10-13').toISOString()).toBe('2026-11-14T03:00:00.000Z');
    expect(lastDayBefore(freeMonthEndOf('2026-10-13'))).toBe('2026-11-13');
  });

  it("falls on the month's last day where it lacks the day — February, a leap year, a thirty-day month", () => {
    expect(lastDayBefore(freeMonthEndOf('2027-01-31'))).toBe('2027-02-28');
    expect(lastDayBefore(freeMonthEndOf('2028-01-31'))).toBe('2028-02-29');
    expect(lastDayBefore(freeMonthEndOf('2026-10-31'))).toBe('2026-11-30');
  });

  it('turns the year', () => {
    expect(lastDayBefore(freeMonthEndOf('2026-12-31'))).toBe('2027-01-31');
    expect(freeMonthEndOf('2026-12-31').toISOString()).toBe('2027-02-01T03:00:00.000Z');
  });
});
