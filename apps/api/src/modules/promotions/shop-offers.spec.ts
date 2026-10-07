// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { couponBenefitOf, firstPurchaseHeadlineOf, firstPurchasePromotionOf, type OfferPromotion } from './shop-offers.js';

const promotion = (given: Partial<OfferPromotion>): OfferPromotion => ({
  id: 'p',
  name: 'Promoção',
  scope: 'CART',
  discountKind: 'PERCENT',
  percentBps: 1000,
  amountCents: null,
  audience: 'FIRST_PURCHASE',
  productIds: [],
  categoryIds: [],
  endsAt: null,
  ...given,
});

const coupon = { code: 'PRIMEIRA10', kind: 'PERCENT', percentBps: 1000, amountCents: null, minSubtotalCents: 5000, endsAt: new Date('2026-11-01T00:00:00.000Z') } as CouponModel;

describe('firstPurchasePromotionOf', () => {
  it('speaks of none when no running promotion is for a first purchase', () => {
    expect(firstPurchasePromotionOf([])).toBeNull();
    expect(firstPurchasePromotionOf([promotion({ audience: 'EVERYONE' })])).toBeNull();
  });

  // The list is the newest first. One over the whole cart is true of any cart, so it is the one said.
  it('speaks of the newest over the whole cart, ahead of a newer one over named products', () => {
    const named = promotion({ id: 'novo', scope: 'PRODUCTS', percentBps: 3000, productIds: ['a'] });
    const whole = promotion({ id: 'antigo', discountKind: 'FIXED', percentBps: null, amountCents: 1500, endsAt: new Date('2026-12-01T00:00:00.000Z') });

    expect(firstPurchasePromotionOf([named, whole, promotion({ id: 'mais-antigo', percentBps: 500 })])).toEqual({
      kind: 'FIXED',
      percentBps: null,
      amountCents: 1500,
      minSubtotalCents: 0,
      endsAt: '2026-12-01T00:00:00.000Z',
      wholeCart: true,
    });
  });

  it('speaks of the newest of all, as over selected products, when none is over the whole cart', () => {
    const newest = promotion({ scope: 'CATEGORIES', percentBps: 2000, categoryIds: ['c'] });

    expect(firstPurchasePromotionOf([newest, promotion({ scope: 'PRODUCTS', productIds: ['a'] })])).toMatchObject({ percentBps: 2000, wholeCart: false });
  });
});

describe('firstPurchaseHeadlineOf', () => {
  it('is the promotion when there is one, the coupon otherwise, and nothing with neither', () => {
    expect(firstPurchaseHeadlineOf([promotion({})], coupon)).toMatchObject({ source: 'PROMOTION', percentBps: 1000, minSubtotalCents: 0 });
    expect(firstPurchaseHeadlineOf([promotion({ audience: 'EVERYONE' })], coupon)).toEqual({ source: 'COUPON', ...couponBenefitOf(coupon), wholeCart: true });
    expect(firstPurchaseHeadlineOf([], null)).toBeNull();
  });

  // Anyone reads it: a crawler too.
  it('never carries the coupon\'s code', () => {
    expect(JSON.stringify(firstPurchaseHeadlineOf([], coupon))).not.toContain('PRIMEIRA10');
  });
});
