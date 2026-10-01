// Libs
import { describe, expect, it } from 'vitest';

// App
import { couponDiscountOf, firstPurchaseOfferOf, forEveryone, promotionDiscountsOf, unitDiscountOf, type PricingLine, type PricingPromotion } from './discount-pricing.js';

const WHEY = 'whey';
const CREATINE = 'creatine';
const PROTEINS = 'proteins';
const WHEYS = 'wheys';

const line = (productId: string, unitPriceCents: number, quantity = 1, categoryIds: string[] = []): PricingLine => ({ productId, categoryIds, unitPriceCents, quantity });

function promotion(id: string, overrides: Partial<PricingPromotion>): PricingPromotion {
  return { id, name: id, scope: 'CART', discountKind: 'PERCENT', percentBps: null, amountCents: null, audience: 'EVERYONE', productIds: [], categoryIds: [], ...overrides };
}

const cents = (lines: readonly PricingLine[], promotions: readonly PricingPromotion[]) => promotionDiscountsOf(lines, promotions).map((discount) => discount.discountCents);
const names = (lines: readonly PricingLine[], promotions: readonly PricingPromotion[]) => promotionDiscountsOf(lines, promotions).map((discount) => discount.promotion?.name ?? null);

describe('promotionDiscountsOf', () => {
  it('takes nothing off with no promotion running', () => {
    expect(promotionDiscountsOf([line(WHEY, 18990, 2)], [])).toEqual([{ discountCents: 0, promotion: null }]);
  });

  it('takes a percentage off each unit, rounded up to the cent, on every line of the cart', () => {
    const ten = promotion('dez', { percentBps: 1000 });
    // 10% of 18,99 is 1,899: 1,90 a unit, three times — the shelf's price of one, times three.
    expect(cents([line(WHEY, 1899, 3), line(CREATINE, 5990)], [ten])).toEqual([570, 599]);
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

describe('unitDiscountOf', () => {
  const unit = { productId: WHEY, categoryIds: [WHEYS, PROTEINS], unitPriceCents: 1899 };

  it('is what one unit loses on the shelf: the best of the promotions that reach it', () => {
    const ten = promotion('dez', { percentBps: 1000 });
    const proteins = promotion('proteinas', { scope: 'CATEGORIES', percentBps: 2000, categoryIds: [PROTEINS] });
    expect(unitDiscountOf(unit, [ten, proteins])).toEqual({ discountCents: 380, promotion: { id: 'proteinas', name: 'proteinas' } });
    expect(unitDiscountOf({ ...unit, categoryIds: [] }, [ten, proteins])).toEqual({ discountCents: 190, promotion: { id: 'dez', name: 'dez' } });
  });

  it('never reads a percentage as less than it is: the price left, taken from the price, is at least the share', () => {
    // The shelf's badge is floor((was − now) / was): rounding the discount down would print 9%.
    for (const unitPriceCents of [1899, 1894, 999, 101, 33, 7]) {
      const { discountCents } = unitDiscountOf({ ...unit, unitPriceCents }, [promotion('dez', { percentBps: 1000 })]);
      expect(Math.floor((discountCents * 100) / unitPriceCents), String(unitPriceCents)).toBeGreaterThanOrEqual(10);
      expect(discountCents).toBeLessThanOrEqual(unitPriceCents);
    }
  });

  it('leaves a fixed amount off the whole cart out: it is no unit\'s', () => {
    expect(unitDiscountOf(unit, [promotion('vinte', { discountKind: 'FIXED', amountCents: 2000 })])).toEqual({ discountCents: 0, promotion: null });
  });
});

describe('firstPurchaseOfferOf', () => {
  const welcome = (id: string, overrides: Partial<PricingPromotion>) => promotion(id, { audience: 'FIRST_PURCHASE', ...overrides });
  /** Two wheys and a creatine: 43970. */
  const cart = [line(WHEY, 18990, 2), line(CREATINE, 5990)];

  it('is what a first-purchase promotion would take off a cart nothing else reaches, by its name', () => {
    // 15% of each unit, rounded up: 28,49 twice and 8,99.
    expect(firstPurchaseOfferOf(cart, [welcome('boas-vindas', { percentBps: 1500 })])).toEqual({ promotionName: 'boas-vindas', discountCents: 6597 });
  });

  it('is only what it adds to what the cart already gets: the two are never added up', () => {
    const ten = promotion('dez', { percentBps: 1000 });
    // 65,97 with it against the 43,97 every cart gets.
    expect(firstPurchaseOfferOf(cart, [welcome('boas-vindas', { percentBps: 1500 }), ten])).toEqual({ promotionName: 'boas-vindas', discountCents: 2200 });
  });

  it('announces nothing when a promotion for everyone beats it', () => {
    expect(firstPurchaseOfferOf(cart, [welcome('boas-vindas', { percentBps: 1000 }), promotion('vinte', { percentBps: 2000 })])).toBeNull();
  });

  it('announces nothing on a tie, whichever of the two is the newer: the cart loses the same either way', () => {
    const first = welcome('boas-vindas', { percentBps: 1000 });
    const ten = promotion('dez', { percentBps: 1000 });
    expect(firstPurchaseOfferOf(cart, [first, ten])).toBeNull();
    expect(firstPurchaseOfferOf(cart, [ten, first])).toBeNull();
  });

  it('announces nothing with none running, or with one that reaches nothing in the cart', () => {
    expect(firstPurchaseOfferOf(cart, [])).toBeNull();
    expect(firstPurchaseOfferOf(cart, [promotion('dez', { percentBps: 1000 })])).toBeNull();
    expect(firstPurchaseOfferOf(cart, [welcome('bcaa', { scope: 'PRODUCTS', percentBps: 5000, productIds: ['bcaa'] })])).toBeNull();
  });

  it('names none when several would be on the lines, and the one left when the others lose theirs', () => {
    const wheys = welcome('whey', { scope: 'PRODUCTS', percentBps: 2000, productIds: [WHEY] });
    const creatines = welcome('creatina', { scope: 'PRODUCTS', discountKind: 'FIXED', amountCents: 500, productIds: [CREATINE] });
    // 20% of the two wheys and 5,00 off the creatine.
    expect(firstPurchaseOfferOf(cart, [wheys, creatines])).toEqual({ promotionName: null, discountCents: 8096 });

    // 10% for everyone is 5,99 off the creatine: it keeps that line, and only the wheys' is offered.
    const ten = promotion('dez', { scope: 'PRODUCTS', percentBps: 1000, productIds: [CREATINE] });
    expect(firstPurchaseOfferOf(cart, [wheys, creatines, ten])).toEqual({ promotionName: 'whey', discountCents: 7596 });
  });

  it('names the one that adds, not one that holds a line on a tie and adds nothing to it', () => {
    // 10% for everyone and 10% for a first purchase, the newer first: it keeps the creatine's line while adding nothing there.
    const tie = welcome('empate', { scope: 'PRODUCTS', percentBps: 1000, productIds: [CREATINE] });
    const ten = promotion('dez', { scope: 'PRODUCTS', percentBps: 1000, productIds: [CREATINE] });
    const wheys = welcome('whey', { scope: 'PRODUCTS', percentBps: 2000, productIds: [WHEY] });

    expect(firstPurchaseOfferOf(cart, [tie, wheys, ten])).toEqual({ promotionName: 'whey', discountCents: 7596 });
  });

  it('weighs a fixed amount off the cart as the cart’s: offered only past the lines’ own promotions together', () => {
    const twenty = welcome('vinte', { discountKind: 'FIXED', amountCents: 2000 });
    const wheys = promotion('whey', { scope: 'PRODUCTS', percentBps: 500, productIds: [WHEY] });
    // 5% of 189,90 is 9,50 a unit: 19,00 from the wheys' own against 20,00 off the cart.
    expect(firstPurchaseOfferOf(cart, [wheys, twenty])).toEqual({ promotionName: 'vinte', discountCents: 100 });
    // A third whey makes it 28,50, past the 20,00.
    expect(firstPurchaseOfferOf([line(WHEY, 18990, 3), line(CREATINE, 5990)], [wheys, twenty])).toBeNull();
  });
});

describe('forEveryone', () => {
  it('leaves the promotions for a first purchase out, in the order the rest came', () => {
    const newer = promotion('nova', { percentBps: 1000 });
    const older = promotion('antiga', { percentBps: 500 });
    expect(forEveryone([newer, promotion('boas-vindas', { audience: 'FIRST_PURCHASE', percentBps: 1500 }), older])).toEqual([newer, older]);
  });
});

describe('couponDiscountOf', () => {
  it('takes a percentage of what is left of the products, rounded up to the cent and never past it', () => {
    expect(couponDiscountOf({ kind: 'PERCENT', percentBps: 1000, amountCents: null }, 18991, 1000)).toBe(1900);
    expect(couponDiscountOf({ kind: 'PERCENT', percentBps: 10000, amountCents: null }, 18991, 1000)).toBe(18991);
    expect(couponDiscountOf({ kind: 'PERCENT', percentBps: 1, amountCents: null }, 5, null)).toBe(1);
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
