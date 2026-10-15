// App
import { brasiliaDayOf, lastDayBefore, openOfBrasiliaDay } from './billing-dates.js';
import { isNeverPaid } from './billing.constants.js';
import { lockStartOf, type LockRow } from './page-lock.js';

/*
  What a shopkeeper is told before charging starts (BEELINK-297), read from their pages: which ones
  lock without a plan, and on what day. Pure: the pages are handed in, and the day each locks is the
  lock's own answer (`lockStartOf`), walked from the first instant of the day charging starts.
*/

/** A page of the shopkeeper's as the notice reads it. */
export interface NoticePage {
  name: string;
  slug: string;
  subscription: LockRow | null;
}

/** A page the notice tells of. */
export interface NoticeLine {
  name: string;
  slug: string;
  /** Its last free day — the trial's, or a free month's — when that is after charging starts; null when it locks that very day. */
  freeUntil: string | null;
  /** The day it locks without a plan. */
  locksOn: string;
}

/**
 * The pages a notice tells of, in the order given: each that never paid and is not exempt — every one
 * of them locks one day without a plan — with the day it does, if charging starts on `switchOnDay` and
 * nothing is paid. A page that paid has its plan, an exempt one owes nothing, and one with no
 * subscription never locks: none is told.
 */
export function noticeLinesOf(pages: readonly NoticePage[], switchOnDay: string): NoticeLine[] {
  const from = openOfBrasiliaDay(switchOnDay);
  return pages.flatMap((page) => {
    const row = page.subscription;
    if (!row || !isNeverPaid(row.status)) return [];
    const locks = lockStartOf(row, from);
    if (!locks) return [];
    return [{ name: page.name, slug: page.slug, freeUntil: locks.getTime() > from.getTime() ? lastDayBefore(locks) : null, locksOn: brasiliaDayOf(locks) }];
  });
}
