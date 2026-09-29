// Libs
import { ValidateBy, buildMessage } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

/** Before this, a birth date is a typing slip, not a customer. */
const EARLIEST_YEAR = 1900;

/**
 * Whether `YYYY-MM-DD` is a day someone could have been born on: one that exists — 31/02 does not,
 * and `Date` would quietly roll it into March — no earlier than 1900, and not after today. Today is
 * the server's in UTC, a few hours off Brazil's: a baby born tonight can wait until the morning.
 */
export function isBirthDate(value: string, today: Date = new Date()): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exists && year >= EARLIEST_YEAR && date.getTime() <= today.getTime();
}

export function IsBirthDate(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isBirthDate',
      validator: {
        validate: (value: unknown) => typeof value === 'string' && isBirthDate(value),
        defaultMessage: buildMessage((each) => `${each}$property must be a date, YYYY-MM-DD, between 1900 and today`, options),
      },
    },
    options,
  );
}

/**
 * A `DATE` column as the wire writes a day. Prisma reads it as midnight UTC, so the UTC parts are
 * the day itself — local parts would turn the 17th into the 16th west of Greenwich.
 */
export function dayOf(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
