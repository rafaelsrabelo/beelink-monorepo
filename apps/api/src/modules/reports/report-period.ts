// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { ReportErrorCode, SalesByOriginQuery } from '@harness-monorepo/contracts';

/** The shops are Brazilian, and so is a report's day: it starts at midnight in Brasília — the offset a customer's year is read with. */
const SHOP_OFFSET = '-03:00';
const SHOP_OFFSET_MS = 3 * 60 * 60_000;
const DAY_MS = 86_400_000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** With no period asked: the thirty days ending today. */
export const REPORT_DEFAULT_DAYS = 30;
/** The longest period one read sums: a leap year. */
export const REPORT_MAX_DAYS = 366;

export interface ReportPeriod {
  /** The days as asked, or as defaulted: `YYYY-MM-DD` on the shop's clock, both counted. */
  from: string;
  to: string;
  /** The first instant counted, and the first one not counted. */
  start: Date;
  end: Date;
}

export function reportError(errorCode: ReportErrorCode, message: string): { errorCode: ReportErrorCode; message: string } {
  return { errorCode, message };
}

const refuse = (message: string) => new BadRequestException(reportError('REPORT_PERIOD_INVALID', message));

/** Midnight of that day on the shop's clock; null for what is not a day — "2026-02-30" has the shape and names none. */
function startOfDay(day: string): Date | null {
  if (!DAY.test(day)) return null;
  const instant = new Date(`${day}T00:00:00.000${SHOP_OFFSET}`);
  if (Number.isNaN(instant.getTime())) return null;
  return shopDayOf(instant) === day ? instant : null;
}

/** The day an instant falls on, on the shop's clock. */
export function shopDayOf(instant: Date): string {
  return new Date(instant.getTime() - SHOP_OFFSET_MS).toISOString().slice(0, 10);
}

/**
 * The period a report reads: two days on the shop's clock, both counted, a year at most. Both or
 * neither — with neither, the thirty days ending today. A day ahead of today is taken: nothing was
 * sold there.
 */
export function reportPeriodOf(query: SalesByOriginQuery, now = new Date()): ReportPeriod {
  if ((query.from === undefined) !== (query.to === undefined)) throw refuse('from and to come together');

  const to = query.to ?? shopDayOf(now);
  const last = startOfDay(to);
  if (!last) throw refuse('to is not a day (YYYY-MM-DD)');

  const from = query.from ?? shopDayOf(new Date(last.getTime() - (REPORT_DEFAULT_DAYS - 1) * DAY_MS));
  const start = startOfDay(from);
  if (!start) throw refuse('from is not a day (YYYY-MM-DD)');

  if (start.getTime() > last.getTime()) throw refuse('from is after to');
  const days = Math.round((last.getTime() - start.getTime()) / DAY_MS) + 1;
  if (days > REPORT_MAX_DAYS) throw refuse(`A period holds ${REPORT_MAX_DAYS} days at most`);

  return { from, to, start, end: new Date(last.getTime() + DAY_MS) };
}
