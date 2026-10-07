// Types
import type { CustomerFirstPurchaseOffer, FirstPurchaseHeadline, OfferBenefit } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import type { PricingPromotion } from './discount-pricing.js';
import { couponWhereOf } from './promotion-status.js';

type Db = Prisma.TransactionClient;

/**
 * What a shop shows of its offers, unasked: the reads and the shapes behind the shop window's
 * strips and the cart's "Cupons disponíveis". Nothing here prices a cart or takes a coupon — that
 * stays `discount-pricing.ts` and `coupon-verdict.ts` — and nothing here reads a coupon its
 * shopkeeper did not switch on to be shown: `SHOWN` is in every `where` of this file.
 */

/** How many shown coupons a shop window lists; past it, the older ones are left to whoever has their code. */
export const SHOWN_COUPONS_MAX = 10;

const SHOWN = { shownInStore: true } as const satisfies Prisma.CouponWhereInput;
const NEWEST = [{ createdAt: 'desc' }, { id: 'desc' }] as const satisfies Prisma.CouponOrderByWithRelationInput[];

/**
 * The shop's shown coupons in force at `at` — started, not ended, not paused, with uses left — the
 * newest first. Whether one is this customer's to use is the verdict's, read after.
 */
export function shownCoupons(db: Db, storeId: string, at: Date, maxUses: Prisma.FieldRef<'Coupon', 'Int'>): Promise<CouponModel[]> {
  return db.coupon.findMany({ where: { storeId, ...SHOWN, ...couponWhereOf('ACTIVE', at, maxUses) }, orderBy: NEWEST, take: SHOWN_COUPONS_MAX });
}

/** The newest shown coupon for a first purchase in force at `at`; null with none. */
export function shownFirstPurchaseCoupon(db: Db, storeId: string, at: Date, maxUses: Prisma.FieldRef<'Coupon', 'Int'>): Promise<CouponModel | null> {
  return db.coupon.findFirst({ where: { storeId, ...SHOWN, audience: 'FIRST_PURCHASE', ...couponWhereOf('ACTIVE', at, maxUses) }, orderBy: NEWEST });
}

/** The shop's shown coupons for a first purchase in force at `at`, the newest first — what its pop-up may name (BEELINK-306). */
export function shownFirstPurchaseCoupons(db: Db, storeId: string, at: Date, maxUses: Prisma.FieldRef<'Coupon', 'Int'>): Promise<CouponModel[]> {
  return db.coupon.findMany({ where: { storeId, ...SHOWN, audience: 'FIRST_PURCHASE', ...couponWhereOf('ACTIVE', at, maxUses) }, orderBy: NEWEST, take: SHOWN_COUPONS_MAX });
}

/** One shown first-purchase coupon by its id, if it is in force at `at`; null otherwise — paused, ended, used up, or no longer shown. */
export function shownFirstPurchaseCouponById(db: Db, storeId: string, couponId: string, at: Date, maxUses: Prisma.FieldRef<'Coupon', 'Int'>): Promise<CouponModel | null> {
  return db.coupon.findFirst({ where: { id: couponId, storeId, ...SHOWN, audience: 'FIRST_PURCHASE', ...couponWhereOf('ACTIVE', at, maxUses) } });
}

export function couponBenefitOf(coupon: Pick<CouponModel, 'kind' | 'percentBps' | 'amountCents' | 'minSubtotalCents' | 'endsAt'>): OfferBenefit {
  return { kind: coupon.kind, percentBps: coupon.percentBps, amountCents: coupon.amountCents, minSubtotalCents: coupon.minSubtotalCents, endsAt: coupon.endsAt?.toISOString() ?? null };
}

/** A running promotion with its end, which pricing does not read and a strip may say. */
export type OfferPromotion = PricingPromotion & { endsAt: Date | null };

/** One running promotion as the benefit a page says: its kind and amount, and whether it is over the whole cart. A promotion asks for no minimum. */
export function promotionBenefitOf(promotion: OfferPromotion): OfferBenefit & { wholeCart: boolean } {
  return {
    kind: promotion.discountKind,
    percentBps: promotion.percentBps,
    amountCents: promotion.amountCents,
    minSubtotalCents: 0,
    endsAt: promotion.endsAt?.toISOString() ?? null,
    wholeCart: promotion.scope === 'CART',
  };
}

/**
 * The promotion a shop's first-purchase strip speaks of, among those running (the newest first):
 * the newest over the whole cart, since "X off your first order" is then true of any cart; with
 * none, the newest of all, said as over selected products. Null with none for a first purchase.
 */
export function firstPurchasePromotionOf(promotions: readonly OfferPromotion[]): (OfferBenefit & { wholeCart: boolean }) | null {
  const forFirstPurchase = promotions.filter((promotion) => promotion.audience === 'FIRST_PURCHASE');
  const chosen = forFirstPurchase.find((promotion) => promotion.scope === 'CART') ?? forFirstPurchase[0];
  return chosen ? promotionBenefitOf(chosen) : null;
}

/** The headline anyone is told: the promotion when there is one — it applies by itself — else the shown coupon, without its code. */
export function firstPurchaseHeadlineOf(promotions: readonly OfferPromotion[], coupon: CouponModel | null): FirstPurchaseHeadline | null {
  const promotion = firstPurchasePromotionOf(promotions);
  if (promotion) return { source: 'PROMOTION', ...promotion };
  return coupon ? { source: 'COUPON', ...couponBenefitOf(coupon), wholeCart: true } : null;
}

/**
 * What a customer with no order that stands is shown for their first order: the coupon when there
 * is one — a code is worth nothing to a customer who never saw it — else the promotion, which
 * applies by itself. The two add up, the coupon after the promotion. `coupon` is the newest shown
 * first-purchase coupon that is theirs to use; the strip, the pop-up's customer notice (BEELINK-310)
 * and the panel's preview of it all read this.
 */
export function firstOrderOfferOf(coupon: CouponModel | null | undefined, promotions: readonly OfferPromotion[]): CustomerFirstPurchaseOffer | null {
  if (coupon) return { source: 'COUPON', code: coupon.code, ...couponBenefitOf(coupon) };

  const promotion = firstPurchasePromotionOf(promotions);
  return promotion && { source: 'PROMOTION', ...promotion };
}

/**
 * When the shop's first-purchase headline next changes by itself: the soonest start or end still
 * ahead among its first-purchase promotions and its shown first-purchase coupons that are switched
 * on. Neither is a write, so nothing drops a kept answer then — whoever keeps one reads this instant
 * off it, as a catalogue's reader does (`PricesChangeInterceptor`). Null with none ahead.
 */
export async function nextHeadlineChange(db: Db, storeId: string, now: Date): Promise<Date | null> {
  const ahead = { OR: [{ startsAt: { gt: now } }, { endsAt: { gt: now } }] };
  const period = { startsAt: true, endsAt: true } as const;
  const [promotions, coupons] = await Promise.all([
    db.promotion.findMany({ where: { storeId, isActive: true, audience: 'FIRST_PURCHASE', ...ahead }, select: period }),
    db.coupon.findMany({ where: { storeId, ...SHOWN, isActive: true, audience: 'FIRST_PURCHASE', ...ahead }, select: period }),
  ]);

  const instants = [...promotions, ...coupons].flatMap((row) => [row.startsAt, row.endsAt]).filter((instant): instant is Date => instant !== null && instant > now);
  return instants.length ? new Date(Math.min(...instants.map((instant) => instant.getTime()))) : null;
}
