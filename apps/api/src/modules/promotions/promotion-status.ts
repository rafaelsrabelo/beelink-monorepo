// Types
import type { CouponStatus, PromotionStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

/**
 * Where a promotion or a coupon stands, read from the clock and never stored — a stored status would
 * go stale by itself. Each rule is stated twice, as a function of a row and as the `where` that
 * finds those rows; the e2e suite reads every list by status and holds the two to each other.
 *
 * The first that holds, in this order: ended, exhausted (a coupon), paused, scheduled, active.
 * Ended and exhausted come before paused because switching those back on would not make them count.
 */

interface Period {
  startsAt: Date;
  endsAt: Date | null;
  isActive: boolean;
}

interface Uses {
  maxUses: number | null;
  usedCount: number;
}

export function promotionStatusOf(row: Period, now: Date): PromotionStatus {
  if (row.endsAt !== null && row.endsAt <= now) return 'ENDED';
  if (!row.isActive) return 'PAUSED';
  return row.startsAt > now ? 'SCHEDULED' : 'ACTIVE';
}

export function couponStatusOf(row: Period & Uses, now: Date): CouponStatus {
  if (row.endsAt !== null && row.endsAt <= now) return 'ENDED';
  if (row.maxUses !== null && row.usedCount >= row.maxUses) return 'EXHAUSTED';
  return promotionStatusOf(row, now);
}

/** A period's and a switch's part of a `where`, plain enough for both tables to take. */
interface PeriodWhere {
  endsAt?: { lte: Date };
  isActive?: boolean;
  startsAt?: { gt: Date } | { lte: Date };
  OR?: ({ endsAt: null } | { endsAt: { gt: Date } })[];
}

function lasting(now: Date): PeriodWhere {
  return { OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
}

export function promotionWhereOf(status: PromotionStatus, now: Date): PeriodWhere {
  switch (status) {
    case 'ENDED':
      return { endsAt: { lte: now } };
    case 'PAUSED':
      return { ...lasting(now), isActive: false };
    case 'SCHEDULED':
      return { ...lasting(now), isActive: true, startsAt: { gt: now } };
    case 'ACTIVE':
      return { ...lasting(now), isActive: true, startsAt: { lte: now } };
  }
}

/**
 * `maxUses` is the column itself (`prisma.coupon.fields.maxUses`): the limit is compared to the
 * count row by row. A coupon with no limit has a null there, which no comparison matches — so it is
 * never exhausted, and "has uses left" names it apart.
 */
export function couponWhereOf(status: CouponStatus, now: Date, maxUses: Prisma.FieldRef<'Coupon', 'Int'>): Prisma.CouponWhereInput {
  if (status === 'ENDED') return { endsAt: { lte: now } };
  if (status === 'EXHAUSTED') return { ...lasting(now), usedCount: { gte: maxUses } };

  return { AND: [promotionWhereOf(status, now), { OR: [{ maxUses: null }, { usedCount: { lt: maxUses } }] }] };
}
