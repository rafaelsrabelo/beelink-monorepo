// Types
import type { Coupon, CouponRedemption, Promotion } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { couponStatusOf, promotionStatusOf } from './promotion-status.js';

const target = { select: { id: true, name: true, slug: true } } as const;

/** A promotion with what it names, by name, as the panel lists them. */
export const promotionInclude = {
  products: { select: { product: target }, orderBy: { product: { name: 'asc' } } },
  categories: { select: { category: target }, orderBy: { category: { name: 'asc' } } },
} as const satisfies Prisma.PromotionInclude;

export type PromotionRow = Prisma.PromotionGetPayload<{ include: typeof promotionInclude }>;

export function toPromotion(row: PromotionRow, now: Date): Promotion {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope,
    discountKind: row.discountKind,
    percentBps: row.percentBps,
    amountCents: row.amountCents,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    active: row.isActive,
    status: promotionStatusOf(row, now),
    audience: row.audience,
    products: row.products.map(({ product }) => product),
    categories: row.categories.map(({ category }) => category),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies Promotion;
}

export function toCoupon(row: CouponModel, now: Date): Coupon {
  return {
    id: row.id,
    code: row.code,
    kind: row.kind,
    percentBps: row.percentBps,
    amountCents: row.amountCents,
    minSubtotalCents: row.minSubtotalCents,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt?.toISOString() ?? null,
    maxUses: row.maxUses,
    maxUsesPerCustomer: row.maxUsesPerCustomer,
    usedCount: row.usedCount,
    active: row.isActive,
    status: couponStatusOf(row, now),
    audience: row.audience,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies Coupon;
}

/** A use with the order it went into, and that order's customer — the use itself names none. */
export const redemptionInclude = {
  order: { select: { number: true, status: true, totalCents: true, placedAt: true, customer: { select: { id: true, name: true } } } },
} as const satisfies Prisma.CouponRedemptionInclude;

export type RedemptionRow = Prisma.CouponRedemptionGetPayload<{ include: typeof redemptionInclude }>;

export function toCouponRedemption(row: RedemptionRow): CouponRedemption {
  const { customer, ...order } = row.order;
  return {
    id: row.id,
    order: { number: order.number, status: order.status, totalCents: order.totalCents, placedAt: order.placedAt.toISOString() },
    customer,
    discountCents: row.discountCents,
    redeemedAt: row.createdAt.toISOString(),
  } satisfies CouponRedemption;
}
