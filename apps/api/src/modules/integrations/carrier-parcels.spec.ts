// App
import { quoteProductsOf, type CartParcel } from './carrier-parcels.js';

const blouse: CartParcel = { variantId: 'v1', quantity: 2, unitValueCents: 5990, weightGrams: 300, lengthMm: 255, widthMm: 200, heightMm: 40 };
const unsized: CartParcel = { variantId: 'v2', quantity: 1, unitValueCents: 12050, weightGrams: 1200, lengthMm: null, widthMm: null, heightMm: null };
const box = { lengthMm: 300, widthMm: 200, heightMm: 100 };

describe('a cart as a carrier quotes it (BEELINK-185)', () => {
  it('speaks centimetres rounded up, kilograms and reais', () => {
    expect(quoteProductsOf([blouse], null)).toEqual([{ id: 'v1', lengthCm: 26, widthCm: 20, heightCm: 4, weightKg: 0.3, insuranceReais: 59.9, quantity: 2 }]);
  });

  it("gives a product with no size the default parcel's three sizes, and keeps its own weight", () => {
    expect(quoteProductsOf([blouse, unsized], box)).toEqual([
      { id: 'v1', lengthCm: 26, widthCm: 20, heightCm: 4, weightKg: 0.3, insuranceReais: 59.9, quantity: 2 },
      { id: 'v2', lengthCm: 30, widthCm: 20, heightCm: 10, weightKg: 1.2, insuranceReais: 120.5, quantity: 1 },
    ]);
  });

  it('says what keeps a carrier from quoting, by the rule the product list reads', () => {
    expect(quoteProductsOf([blouse, unsized], null)).toBe('NO_SIZE');
    expect(quoteProductsOf([{ ...blouse, weightGrams: null }], box)).toBe('NO_WEIGHT');
  });

  it('never sends a size of nothing: a parcel thinner than a centimetre is one centimetre', () => {
    expect(quoteProductsOf([{ ...blouse, heightMm: 3 }], null)).toMatchObject([{ heightCm: 1 }]);
  });
});
