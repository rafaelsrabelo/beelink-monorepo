// Types
import type { AffiliatePayoutPeriod } from '@harness-monorepo/contracts';

// App
import { daysAfter } from '../billing/billing-dates.js';

/*
  When an affiliate's commission falls due (plan 2026-10-24--afiliados, 11/11): a month has three
  periods — the 1st to the 10th, the 11th to the 20th, the 21st to its last day — and a period is
  due its last day plus the programme's delay. A commission falls in the period of the day its order
  was delivered. Days are `YYYY-MM-DD` on Brasília's calendar, as `billing-dates.ts` counts them.
*/

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const FIRST_DAYS = [1, 11, 21] as const;

const pad = (n: number): string => String(n).padStart(2, '0');

/** The period a day falls in, and when it is due at `delayDays`. */
export function payoutPeriodOf(day: string, delayDays: number): AffiliatePayoutPeriod {
  const match = DAY.exec(day);
  if (!match) throw new RangeError(`"${day}" is not a day (YYYY-MM-DD)`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const date = Number(match[3]);
  // Day 0 of the next month is this month's last: 28, 29, 30 or 31.
  const monthEnd = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || date < 1 || date > monthEnd) throw new RangeError(`"${day}" is not a day (YYYY-MM-DD)`);

  const first = date <= 10 ? 1 : date <= 20 ? 11 : 21;
  const last = first === 21 ? monthEnd : first + 9;
  const prefix = `${match[1]}-${match[2]}-`;
  const lastDay = `${prefix}${pad(last)}`;
  return { firstDay: `${prefix}${pad(first)}`, lastDay, dueOn: daysAfter(lastDay, delayDays) };
}

/** The three periods of the month a day is in, in order. */
export function payoutPeriodsOfMonth(day: string, delayDays: number): AffiliatePayoutPeriod[] {
  return FIRST_DAYS.map((first) => payoutPeriodOf(`${day.slice(0, 8)}${pad(first)}`, delayDays));
}
