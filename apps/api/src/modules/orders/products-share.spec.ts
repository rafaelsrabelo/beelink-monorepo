// Libs
import { describe, expect, it } from 'vitest';

// App
import { lineSharesOf, shareCentsOf, weightedRateOf } from './products-share.js';

describe('the share of the products', () => {
  it("weighs each line's rate by what the line costs", () => {
    expect(weightedRateOf([{ netCents: 3000, rateBps: 1000 }, { netCents: 1000, rateBps: 2000 }])).toEqual({ weighted: 5_000_000n, net: 4000n });
  });

  it('is that rate over the base, rounded down to the cent', () => {
    // 3000 at 10% and 1000 at 20% of 4000, the base cut to 3999 by a discount: 499.875 → 499.
    expect(shareCentsOf(weightedRateOf([{ netCents: 3000, rateBps: 1000 }, { netCents: 1000, rateBps: 2000 }]), 3999)).toBe(499);
  });

  it('is nothing for lines that cost nothing', () => {
    expect(shareCentsOf(weightedRateOf([]), 1000)).toBe(0);
    expect(lineSharesOf([{ netCents: 0, rateBps: 1000 }], 0)).toEqual([{ baseCents: 0, shareCents: 0 }]);
  });

  it('splits the base and the share line by line, and the lines add up to the order to the cent', () => {
    const lines = [
      { netCents: 3333, rateBps: 1000 },
      { netCents: 3333, rateBps: 1500 },
      { netCents: 3334, rateBps: 0 },
    ];
    const split = lineSharesOf(lines, 9001);

    expect(split.reduce((sum, line) => sum + line.baseCents, 0)).toBe(9001);
    expect(split.reduce((sum, line) => sum + line.shareCents, 0)).toBe(shareCentsOf(weightedRateOf(lines), 9001));
    expect(split[2]).toEqual({ baseCents: 3001, shareCents: 0 });
  });

  it('hands the cents left to the largest remainders, the earlier line on a tie', () => {
    // 100 over three equal lines: 33, 33, 33 and one cent left, to the first.
    expect(lineSharesOf([{ netCents: 1, rateBps: 0 }, { netCents: 1, rateBps: 0 }, { netCents: 1, rateBps: 0 }], 100).map((line) => line.baseCents)).toEqual([34, 33, 33]);
  });

  it('never gives a line more than its exact share plus a cent', () => {
    const lines = Array.from({ length: 7 }, (_, index) => ({ netCents: 1234 + index * 17, rateBps: 333 + index * 100 }));
    const base = 8765;
    const net = lines.reduce((sum, line) => sum + line.netCents, 0);
    for (const [index, line] of lineSharesOf(lines, base).entries()) {
      const exact = (lines[index]!.netCents * lines[index]!.rateBps * base) / (net * 10_000);
      expect(line.shareCents).toBeGreaterThanOrEqual(Math.floor(exact));
      expect(line.shareCents).toBeLessThanOrEqual(Math.floor(exact) + 1);
    }
  });
});
