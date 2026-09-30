// Types
import type { ProductRatingSummary } from '@harness-monorepo/contracts';

/** The published reviews' average to one decimal, and how many — or null while there is none. */
export function ratingOf(count: number, sum: number): ProductRatingSummary | null {
  return count > 0 ? { average: Math.round((sum / count) * 10) / 10, count } : null;
}
