// Types
import type { CountedFunnelStep, FunnelStep } from '@harness-monorepo/contracts';

// App
import { shopDayOf } from './report-period.js';

/** The steps a shop window may have counted — the only words the public route takes. */
export const COUNTED_FUNNEL_STEPS = ['PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START'] as const satisfies readonly CountedFunnelStep[];

/** The funnel, in the order it is read. */
export const FUNNEL_STEPS = [...COUNTED_FUNNEL_STEPS, 'PURCHASE'] as const satisfies readonly FunnelStep[];

/**
 * For how long a day's counters are kept: thirteen months, so a month can be set beside the same
 * month a year before — and no longer, since nothing asks for more.
 */
export const FUNNEL_RETENTION_MONTHS = 13;

/**
 * The first day still kept at `now`: the same day of the month, thirteen months back, on the shop's
 * clock. A month too short for the day gives its last one — 31 March keeps from the last of
 * February.
 */
export function funnelCutoffDay(now: Date): string {
  const [year, month, day] = shopDayOf(now).split('-').map(Number) as [number, number, number];
  const first = new Date(Date.UTC(year, month - 1 - FUNNEL_RETENTION_MONTHS, 1));
  const lastOfMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();

  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, lastOfMonth))).toISOString().slice(0, 10);
}
