// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { CouponModel, StorePopupModel } from '../../generated/prisma/models.js';

// App
import type { OfferPromotion } from './shop-offers.js';
import { plainTextOf, popupBenefitOf, promisesNumber, toPopupSettings, visitorsReadAnother } from './shop-popup.js';

const promotion = (given: Partial<OfferPromotion>): OfferPromotion => ({
  id: 'p1',
  name: 'Promoção',
  scope: 'CART',
  discountKind: 'PERCENT',
  percentBps: 1500,
  amountCents: null,
  audience: 'FIRST_PURCHASE',
  productIds: [],
  categoryIds: [],
  endsAt: null,
  ...given,
});

const coupon = (given: Partial<CouponModel> = {}) => ({ id: 'c1', code: 'PRIMEIRA10', kind: 'PERCENT', percentBps: 1000, amountCents: null, minSubtotalCents: 5000, endsAt: null, ...given }) as CouponModel;

const row = (given: Partial<StorePopupModel> = {}) =>
  ({ storeId: 's', enabled: true, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: 'ON_ARRIVAL', delaySeconds: 5, promotionId: null, couponId: null, revision: 3, keepReminder: true, createdAt: new Date(0), updatedAt: new Date('2026-10-07T12:00:00.000Z'), ...given }) as StorePopupModel;

describe('plainTextOf', () => {
  it('turns what cannot be printed into a space, collapses blanks, and reads nothing left as null', () => {
    expect(plainTextOf('  Olá\u0007\tmundo \n ')).toBe('Olá mundo');
    expect(plainTextOf(' \n\t ')).toBeNull();
    expect(plainTextOf('')).toBeNull();
  });

  it('takes out the marks that reorder or hide the text around them, and keeps an emoji whole', () => {
    expect(plainTextOf(`Ganhe${String.fromCodePoint(0x202e)}agora${String.fromCodePoint(0xfeff)}`)).toBe('Ganhe agora');
    const family = `${String.fromCodePoint(0x1f469)}${String.fromCodePoint(0x200d)}${String.fromCodePoint(0x1f467)}`;
    expect(plainTextOf(`Oi ${family}`)).toBe(`Oi ${family}`);
  });

  it('leaves markup as the letters it is, and what is not a string for the validator to refuse', () => {
    expect(plainTextOf('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
    expect(plainTextOf(12)).toBe(12);
    expect(plainTextOf(null)).toBeNull();
  });
});

describe('promisesNumber', () => {
  it.each(['Ganhe 10% agora', '10 % de desconto', 'R$ 15 de desconto', 'r$15,00 off', 'até 7,5% off'])('reads "%s" as a discount typed by hand', (sentence) => {
    expect(promisesNumber(sentence)).toBe(true);
  });

  it.each(['Ganhe {beneficio} na primeira compra', 'Entrega em 2 dias', 'Desde 1998', 'Parcele em 10 vezes', '% de quê?'])('takes "%s"', (sentence) => {
    expect(promisesNumber(sentence)).toBe(false);
  });

  it('takes no sentence at all: the default says no number of its own', () => {
    expect(promisesNumber(null)).toBe(false);
  });
});

describe('popupBenefitOf', () => {
  const read = { promotions: [promotion({ id: 'p1' }), promotion({ id: 'p2', percentBps: 500, scope: 'PRODUCTS' })], headlineCoupon: coupon(), namedCoupon: null };

  it("follows the shop's headline when it names nothing — and with no row at all", () => {
    expect(popupBenefitOf(row(), read)).toMatchObject({ source: 'PROMOTION', percentBps: 1500, wholeCart: true });
    expect(popupBenefitOf(null, { ...read, promotions: [] })).toMatchObject({ source: 'COUPON', percentBps: 1000, minSubtotalCents: 5000 });
    expect(popupBenefitOf(row(), { promotions: [], headlineCoupon: null, namedCoupon: null })).toBeNull();
  });

  it('announces the promotion it names, and nothing once that one is not running — never another in its place', () => {
    expect(popupBenefitOf(row({ promotionId: 'p2' }), read)).toMatchObject({ source: 'PROMOTION', percentBps: 500, wholeCart: false });
    expect(popupBenefitOf(row({ promotionId: 'gone' }), read)).toBeNull();
    // Edited to be for everyone after it was named: no longer a first-purchase benefit.
    expect(popupBenefitOf(row({ promotionId: 'p1' }), { ...read, promotions: [promotion({ id: 'p1', audience: 'EVERYONE' })] })).toBeNull();
  });

  it('announces the coupon it names as a benefit with no code, and nothing once that one is out of force', () => {
    const named = popupBenefitOf(row({ couponId: 'c9' }), { ...read, namedCoupon: coupon({ id: 'c9', code: 'ESCOLHIDO', percentBps: 700 }) });
    expect(named).toEqual({ source: 'COUPON', kind: 'PERCENT', percentBps: 700, amountCents: null, minSubtotalCents: 5000, endsAt: null, wholeCart: true });
    expect(popupBenefitOf(row({ couponId: 'c9' }), read)).toBeNull();
  });
});

describe('visitorsReadAnother', () => {
  const same = { imageUrl: null, title: null, text: null, buttonLabel: null, promotionId: null, couponId: null };

  it("is false for the same pop-up, whatever its switch, its trigger and the strip's reminder", () => {
    expect(visitorsReadAnother(row({ enabled: false, trigger: 'ON_LEAVE', delaySeconds: 40, keepReminder: false }), same)).toBe(false);
  });

  it.each([{ imageUrl: 'https://a/b.jpg' }, { title: 'Outro' }, { text: 'Outro' }, { buttonLabel: 'Outro' }, { promotionId: 'p1' }, { couponId: 'c1' }])('is true once %o changes', (patch) => {
    expect(visitorsReadAnother(row(), { ...same, ...patch })).toBe(true);
  });
});

describe('toPopupSettings', () => {
  it('reads the defaults, switched off, for a shop that never saved', () => {
    expect(toPopupSettings(null)).toEqual({ enabled: false, imageUrl: null, title: null, text: null, buttonLabel: null, trigger: 'ON_ARRIVAL', delaySeconds: 5, benefitSource: 'AUTO', benefitId: null, keepReminder: true, revision: 1, updatedAt: null });
  });

  it('says which of the two columns names the benefit', () => {
    expect(toPopupSettings(row({ promotionId: 'p1' }))).toMatchObject({ benefitSource: 'PROMOTION', benefitId: 'p1', revision: 3, updatedAt: '2026-10-07T12:00:00.000Z' });
    expect(toPopupSettings(row({ couponId: 'c1' }))).toMatchObject({ benefitSource: 'COUPON', benefitId: 'c1' });
    expect(toPopupSettings(row())).toMatchObject({ benefitSource: 'AUTO', benefitId: null });
  });

  it("reads the strip's reminder as saved", () => {
    expect(toPopupSettings(row({ keepReminder: false })).keepReminder).toBe(false);
    expect(toPopupSettings(row()).keepReminder).toBe(true);
  });
});
