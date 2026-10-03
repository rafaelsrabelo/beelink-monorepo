// Libs
import { describe, expect, it } from 'vitest';

// App
import { carrierGapOf } from './carrier-readiness.js';

const boxed = { weightGrams: 500, lengthMm: 200, widthMm: 150, heightMm: 100 };
const loose = { weightGrams: 500, lengthMm: null, widthMm: null, heightMm: null };

describe('carrierGapOf', () => {
  it('finds nothing missing on a weighed, boxed product', () => {
    expect(carrierGapOf([boxed], false)).toBeNull();
  });

  it('says a product with any variant unweighed cannot be quoted, default parcel or not', () => {
    expect(carrierGapOf([boxed, { ...boxed, weightGrams: null }], true)).toBe('NO_WEIGHT');
    expect(carrierGapOf([{ ...boxed, weightGrams: 0 }], true)).toBe('NO_WEIGHT');
  });

  it("says a product with any variant unboxed needs the shop's default parcel, and is fine with one", () => {
    expect(carrierGapOf([boxed, loose], false)).toBe('NO_SIZE');
    expect(carrierGapOf([boxed, { ...boxed, heightMm: null }], false)).toBe('NO_SIZE');
    expect(carrierGapOf([boxed, loose], true)).toBeNull();
  });

  it('says the weight first: a product missing both needs its weight before anything', () => {
    expect(carrierGapOf([{ ...loose, weightGrams: null }], false)).toBe('NO_WEIGHT');
  });
});
