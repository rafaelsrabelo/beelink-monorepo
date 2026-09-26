// Types
import type { CustomerStage } from '@harness-monorepo/contracts';

const DAY_MS = 86_400_000;

/** Whole days since the last valid order; null with none. */
export function daysSince(lastOrderAt: Date | null, now: Date): number | null {
  if (!lastOrderAt) return null;
  return Math.max(Math.floor((now.getTime() - lastOrderAt.getTime()) / DAY_MS), 0);
}

/**
 * Where a customer stands, from their valid orders. Within `inactiveAfterDays` whole days of the last
 * one is a customer — sixty days and a few hours is still sixty — and past it is inactive.
 */
export function stageOf(books: { ordersCount: number; lastOrderAt: Date | null }, inactiveAfterDays: number, now: Date): CustomerStage {
  const days = daysSince(books.lastOrderAt, now);
  if (books.ordersCount === 0 || days === null) return 'LEAD';
  return days <= inactiveAfterDays ? 'CUSTOMER' : 'INACTIVE';
}

/**
 * The oldest last order that still reads as a customer's, for the database to filter with the same
 * cut `stageOf` makes: fewer than `inactiveAfterDays + 1` whole days ago.
 */
export function customerSince(inactiveAfterDays: number, now: Date): Date {
  return new Date(now.getTime() - (inactiveAfterDays + 1) * DAY_MS);
}
