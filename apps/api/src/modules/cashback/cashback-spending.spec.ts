// Libs
import { describe, expect, it } from 'vitest';

// App
import { expiryOf, spendingOrder, takeFrom, type SpendableLot } from './cashback-spending.js';

const DAY = 24 * 60 * 60 * 1000;
const at = (day: number) => new Date(Date.UTC(2026, 9, day));
const lot = (id: string, remainingCents: number, expiresDay: number | null, createdDay = 1): SpendableLot => ({
  id,
  remainingCents,
  expiresAt: expiresDay === null ? null : at(expiresDay),
  createdAt: at(createdDay),
});

describe('spendingOrder', () => {
  it('spends the soonest to expire first, and what never expires last', () => {
    const lots = [lot('never', 100, null), lot('late', 100, 30), lot('soon', 100, 10)];

    expect(spendingOrder(lots).map((it) => it.id)).toEqual(['soon', 'late', 'never']);
  });

  it('takes the oldest first between two that expire together, then the id, so two reads agree', () => {
    const lots = [lot('b-new', 100, 10, 5), lot('c-old', 100, 10, 2), lot('a-old', 100, 10, 2)];

    expect(spendingOrder(lots).map((it) => it.id)).toEqual(['a-old', 'c-old', 'b-new']);
  });

  it('leaves the lots it was given as they were', () => {
    const lots = [lot('late', 100, 30), lot('soon', 100, 10)];
    spendingOrder(lots);

    expect(lots.map((it) => it.id)).toEqual(['late', 'soon']);
  });
});

describe('takeFrom', () => {
  it('empties the soonest lot before touching the next, and stops once the sum is taken', () => {
    const lots = [lot('late', 500, 30), lot('soon', 300, 10), lot('never', 900, null)];

    expect(takeFrom(lots, 600)).toEqual([
      { id: 'soon', takeCents: 300 },
      { id: 'late', takeCents: 300 },
    ]);
  });

  it('skips a lot with nothing left', () => {
    expect(takeFrom([lot('spent', 0, 5), lot('full', 200, 9)], 150)).toEqual([{ id: 'full', takeCents: 150 }]);
  });

  /** Decided on 01/10/2026: the balance never goes below zero. */
  it('takes nothing when the lots hold less than the sum', () => {
    expect(takeFrom([lot('a', 100, 5), lot('b', 100, null)], 201)).toBeNull();
  });

  it('takes every cent there is when the sum is exactly the balance', () => {
    expect(takeFrom([lot('a', 100, 5), lot('b', 100, null)], 200)).toEqual([
      { id: 'a', takeCents: 100 },
      { id: 'b', takeCents: 100 },
    ]);
  });
});

describe('expiryOf', () => {
  it('counts the validity from when the credit became usable', () => {
    expect(expiryOf(at(1), 30, DAY)).toEqual(at(31));
  });

  it('never expires with no validity', () => {
    expect(expiryOf(at(1), null, DAY)).toBeNull();
  });
});
