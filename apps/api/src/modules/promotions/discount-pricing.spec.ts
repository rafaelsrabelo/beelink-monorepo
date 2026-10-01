// Libs
import { describe, expect, it } from 'vitest';

// App
import { couponDiscountOf, promotionDiscountsOf, type PricingLine, type PricingPromotion } from './discount-pricing.js';

const WHEY = 'whey';
const CREATINE = 'creatine';
const PROTEINS = 'proteins';
const WHEYS = 'wheys';

const line = (productId: string, unitPriceCents: number, quantity = 1, categoryIds: string[] = []): PricingLine => ({ productId, categoryIds, unitPriceCents, quantity });

function promotion(id: string, overrides: Partial<PricingPromotion>): PricingPromotion {
  return { id, name: id, scope: 'CART', discountKind: 'PERCENT', percentBps: null, amountCents: null, productIds: [], categoryIds: [], ...overrides };
}

const cents = (lines: readonly PricingLine[], promotions: readonly PricingPromotion[]) => promotionDiscountsOf(lines, promotions).map((discount) => discount.discountCents);
const names = (lines: readonly PricingLine[], promotions: readonly PricingPromotion[]) => promotionDiscountsOf(lines, promotions).map((discount) => discount.promotion?.name ?? null);

describe('promotionDiscountsOf', () => {
  it('takes nothing off with no promotion running', () => {
    expect(promotionDiscountsOf([line(WHEY, 18990, 2)], [])).toEqual([{ discountCents: 0, promotion: null }]);
  });

  it('takes a percentage off each unit, rounded down, on every line of the cart', () => {
    const ten = promotion('dez', { percentBps: 1000 });
    // 10% of 18,99 is 1,899: 1,89 a unit, three times — never 5,69 off the line.
    expect(cents([line(WHEY, 1899, 3), line(CREATINE, 5990)], [ten])).toEqual([567, 599]);
    expect(names([line(WHEY, 1899, 3)], [ten])).toEqual(['dez']);
  });

  it('takes a fixed amount off each unit of the products it names, never more than the unit', () => {
    const five = promotion('cinco', { scope: 'PRODUCTS', discountKind: 'FIXED', amountCents: 500, productIds: [WHEY] });
    expect(cents([line(WHEY, 18990, 2), line(CREATINE, 5990)], [five])).toEqual([1000, 0]);
    expect(cents([line(WHEY, 300, 2)], [five])).toEqual([600]);
  });

  it('reaches a product through its category, and through the category above it', () => {
    const proteins = promotion('proteinas', { scope: 'CATEGORIES', percentBps: 2000, categoryIds: [PROTEINS] });
    const lines = [line(WHEY, 10000, 1, [WHEYS, PROTEINS]), line(CREATINE, 10000, 1, ['outra']), line('solto', 10000)];
    expect(cents(lines, [proteins])).toEqual([2000, 0, 0]);
  });

  it('gives each line the one promotion worth the most on it, and never adds two', () => {
    const cart = promotion('carrinho', { percentBps: 1000 });
    const whey = promotion('whey', { scope: 'PRODUCTS', percentBps: 1500, productIds: [WHEY] });
    const fixed = promotion('fixo', { scope: 'PRODUCTS', discountKind: 'FIXED', amountCents: 800, productIds: [WHEY, CREATINE] });
    const lines = [line(WHEY, 10000), line(CREATINE, 5000)];

    expect(cents(lines, [cart, whey, fixed])).toEqual([1500, 800]);
    expect(names(lines, [cart, whey, fixed])).toEqual(['whey', 'fixo']);
  });

  it('settles a tie by the list’s order, the newest first', () => {
    const newer = promotion('nova', { percentBps: 1000 });
    const older = promotion('antiga', { percentBps: 1000 });
    expect(names([line(WHEY, 10000)], [newer, older])).toEqual(['nova']);
  });

  it('shares a fixed amount off the cart among the lines, to the cent', () => {
    const twenty = promotion('vinte', { discountKind: 'FIXED', amountCents: 2000 });
    const lines = [line(WHEY, 3333), line(CREATINE, 3333), line('bcaa', 3334)];
    const shares = cents(lines, [twenty]);

    expect(shares.reduce((sum, share) => sum + share, 0)).toBe(2000);
    // 666,6 · 666,6 · 666,8 round down to 666 each: the two cents left go to the largest lines first.
    expect(shares).toEqual([667, 666, 667]);
    expect(names(lines, [twenty])).toEqual(['vinte', 'vinte', 'vinte']);
  });

  it('caps the cart’s fixed amount at the cart, and no line gives more than it is worth', () => {
    const fifty = promotion('cinquenta', { discountKind: 'FIXED', amountCents: 5000 });
    expect(cents([line(WHEY, 1000, 2), line(CREATINE, 500)], [fifty])).toEqual([2000, 500]);
  });

  it('weighs the cart’s fixed amount against the lines’ own together: the larger is the cart’s, never both', () => {
    const twenty = promotion('vinte', { discountKind: 'FIXED', amountCents: 2000 });
    const whey = promotion('whey', { scope: 'PRODUCTS', percentBps: 1000, productIds: [WHEY] });
    const lines = [line(WHEY, 19000), line(CREATINE, 6000)];

    // 19,00 from the whey's own against 20,00 off the cart.
    expect(cents(lines, [whey, twenty]).reduce((sum, share) => sum + share, 0)).toBe(2000);
    expect(names(lines, [whey, twenty])).toEqual(['vinte', 'vinte']);

    const dearer = [line(WHEY, 30000), line(CREATINE, 6000)];
    expect(cents(dearer, [whey, twenty])).toEqual([3000, 0]);
    expect(names(dearer, [whey, twenty])).toEqual(['whey', null]);

    // A tie goes to the lines.
    const even = [line(WHEY, 20000), line(CREATINE, 6000)];
    expect(names(even, [whey, twenty])).toEqual(['whey', null]);
  });

  it('takes nothing off a cart worth nothing', () => {
    const twenty = promotion('vinte', { discountKind: 'FIXED', amountCents: 2000 });
    expect(cents([line(WHEY, 0, 2)], [twenty, promotion('dez', { percentBps: 1000 })])).toEqual([0]);
  });
});

describe('couponDiscountOf', () => {
  it('takes a percentage of what is left of the products, rounded down', () => {
    expect(couponDiscountOf({ kind: 'PERCENT', percentBps: 1000, amountCents: null }, 18991, 1000)).toBe(1899);
  });

  it('takes a fixed amount, never more than what is left', () => {
    expect(couponDiscountOf({ kind: 'FIXED', percentBps: null, amountCents: 2000 }, 5000, null)).toBe(2000);
    expect(couponDiscountOf({ kind: 'FIXED', percentBps: null, amountCents: 2000 }, 1500, null)).toBe(1500);
  });

  it('takes the delivery fee on a free delivery — nothing while the fee is not agreed', () => {
    expect(couponDiscountOf({ kind: 'FREE_SHIPPING', percentBps: null, amountCents: null }, 5000, 1200)).toBe(1200);
    expect(couponDiscountOf({ kind: 'FREE_SHIPPING', percentBps: null, amountCents: null }, 5000, null)).toBe(0);
  });
});
