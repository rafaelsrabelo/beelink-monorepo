// Types
import type { BillingCycle } from '@harness-monorepo/contracts';

// App
import { CYCLE_MONTHS, TRIAL_DAYS } from './billing.constants.js';

/*
  The dates of a page's subscription (BEELINK-219), all on Brasília's calendar: a trial ends with a
  day, and Asaas speaks of a charge's due day, never of an instant.

  A day is `YYYY-MM-DD`. An end is an instant and exclusive — the first instant a thing is over — so
  "is it over?" is `now >= end` for a trial, a paid period and a free one alike.
*/

const DAY_MS = 86_400_000;
/** Brasília keeps no summer time since 2019: its day is UTC's, three hours later. */
const BRASILIA_OFFSET_MS = 3 * 3_600_000;
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** A day as the UTC midnight that carries its name: a number to count days with, never an instant of Brasília's. */
function countOf(day: string): number {
  const match = DAY.exec(day);
  const count = match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : Number.NaN;
  // `Date.UTC` rolls a day its month lacks into the next one: "2026-02-30" has the shape and names no day.
  if (Number.isNaN(count) || formatDay(count) !== day) throw new RangeError(`"${day}" is not a day (YYYY-MM-DD)`);
  return count;
}

/** The day it is in Brasília at an instant: 22h there is still today, though UTC is already tomorrow. */
export function brasiliaDayOf(at: Date): string {
  return formatDay(at.getTime() - BRASILIA_OFFSET_MS);
}

/** The midnight in Brasília that closes a day: the first instant of the day after it. */
export function closeOfBrasiliaDay(day: string): Date {
  return new Date(countOf(day) + DAY_MS + BRASILIA_OFFSET_MS);
}

/** The last day something that ends at `endsAt` still covers. */
export function lastDayBefore(endsAt: Date): string {
  return brasiliaDayOf(new Date(endsAt.getTime() - 1));
}

/**
 * The last day of a trial begun at an instant: `TRIAL_DAYS` days after the day it began. Counted in
 * days and not in hours, so that a page is never tried for less than the days promised — it gets
 * them whole, and what was left of the day it was created on.
 */
export function trialLastDayOf(startedAt: Date): string {
  return formatDay(countOf(brasiliaDayOf(startedAt)) + TRIAL_DAYS * DAY_MS);
}

/** The first instant that trial is over: the midnight in Brasília that closes its last day. */
export function trialEndOf(startedAt: Date): Date {
  return closeOfBrasiliaDay(trialLastDayOf(startedAt));
}

/**
 * How many days of the calendar are left until the last day `endsAt` covers: 1 on the eve, 0 on
 * that day — it ends today — and 0 ever after.
 */
export function daysLeft(endsAt: Date, now: Date): number {
  const days = Math.round((countOf(lastDayBefore(endsAt)) - countOf(brasiliaDayOf(now))) / DAY_MS);
  return Math.max(0, days);
}

/**
 * The due day of a subscription's charge, by Asaas's rule: `renewal` 0 is the first charge, 1 the
 * one after it, and so on.
 *
 * It falls on the first charge's day of the month, and on the month's last day where the month lacks
 * that day. Always counted from the first charge, never from the renewal before: a subscription begun
 * on 31/10 renews on 30/11 and then on 31/12, and counting from the 30 would say 30/12.
 */
export function renewalDayOf(firstDueDay: string, cycle: BillingCycle, renewal: number): string {
  if (!Number.isInteger(renewal) || renewal < 0) throw new RangeError(`A renewal is counted from 0 up: got ${renewal}`);

  const first = new Date(countOf(firstDueDay));
  const months = first.getUTCMonth() + renewal * CYCLE_MONTHS[cycle];
  const year = first.getUTCFullYear() + Math.floor(months / 12);
  const month = months % 12;
  // Day 0 of the month after is this month's last day.
  const lastOfMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  return formatDay(Date.UTC(year, month, Math.min(first.getUTCDate(), lastOfMonth)));
}

/**
 * The day a paid period ends: the due day of the charge after the one that paid for it. `period` 0
 * is the one the first charge pays for. Until what instant of that day a page stays in good standing
 * is not said here.
 */
export function periodEndDayOf(firstDueDay: string, cycle: BillingCycle, period = 0): string {
  return renewalDayOf(firstDueDay, cycle, period + 1);
}

/**
 * The first instant a free month that begins on `firstDay` is over (BEELINK-224): the midnight in
 * Brasília closing the same day a month later — that month's last day, where it lacks it. A month as
 * Asaas counts one, so a free month ends as a paid one does: a charge due on 15/10 pays until 15/11 is
 * over, and a free month begun on 15/10 lasts as long. A coupon's month, and the one the pages that
 * existed on 13/10/2026 were given (`freeMonthEndOf('2026-10-13')`, the end of 13/11/2026).
 */
export function freeMonthEndOf(firstDay: string): Date {
  return closeOfBrasiliaDay(renewalDayOf(firstDay, 'MONTHLY', 1));
}
