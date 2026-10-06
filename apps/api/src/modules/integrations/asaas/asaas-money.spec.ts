// Libs
import { describe, expect, it } from 'vitest';

// App
import { centsOf, reaisOf } from './asaas-money.js';

describe('money between bee-link and Asaas', () => {
  it('sends cents as the reais they are, with no float tail in the JSON', () => {
    expect(reaisOf(5990)).toBe(59.9);
    expect(reaisOf(500)).toBe(5);
    expect(reaisOf(1)).toBe(0.01);
    expect(JSON.stringify({ value: reaisOf(7190) })).toBe('{"value":71.9}');
    // Every amount an order can have prints with two decimals at most.
    for (const cents of [1999, 2998, 3333, 10_001, 123_457, 99_999_999]) expect(JSON.stringify(reaisOf(cents))).toMatch(/^\d+(\.\d{1,2})?$/);
  });

  it('reads reais back as whole cents, rounding what a float cut short', () => {
    expect(centsOf(59.9)).toBe(5990);
    expect(centsOf(19.99)).toBe(1999);
    // 1.15 * 100 is 114.99999999999999.
    expect(centsOf(1.15)).toBe(115);
    expect(centsOf(0.07)).toBe(7);
    expect(centsOf(5)).toBe(500);
  });

  it('takes every amount there and back unchanged', () => {
    for (let cents = 1; cents <= 200_000; cents += 7) expect(centsOf(reaisOf(cents))).toBe(cents);
  });
});
