/** The shops are Brazilian: a day of the shop's calendar starts at midnight in Brasília. */
const SHOP_OFFSET_MS = -3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SATURDAY = 6;
const SUNDAY = 0;

/**
 * The day of the shop's calendar that falls `days` business days after an instant, at midnight UTC
 * as a date column holds it. Saturdays and Sundays are skipped; holidays are not known here, so what
 * comes of it is an estimate — which is what a carrier's window is (BEELINK-186).
 */
export function businessDaysAfter(from: Date, days: number): Date {
  const local = new Date(from.getTime() + SHOP_OFFSET_MS);
  let day = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  let left = days;
  while (left > 0) {
    day += DAY_MS;
    const weekday = new Date(day).getUTCDay();
    if (weekday !== SATURDAY && weekday !== SUNDAY) left -= 1;
  }
  return new Date(day);
}
