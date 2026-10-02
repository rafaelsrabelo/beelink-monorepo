// Libs
import { describe, expect, it } from 'vitest';

// App
import { cashbackMaxOf, returnedLotOf, type ReturnedLot } from './cashback-return.js';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-02T12:00:00.000Z');
const inDays = (days: number) => new Date(now.getTime() + days * DAY);
const lot = (change: Partial<ReturnedLot> = {}): ReturnedLot => ({ status: 'AVAILABLE', remainingCents: 100, unrecoveredCents: 0, expiresAt: inDays(30), ...change });

describe('returnedLotOf', () => {
  it('gives a usable lot back what was spent, keeping its validity when it has a week or more', () => {
    expect(returnedLotOf(lot(), 400, now, DAY)).toEqual({ status: 'AVAILABLE', remainingCents: 500, unrecoveredCents: 0, expiresAt: inDays(30), creditedCents: 400 });
  });

  /** Decided on 01/10/2026: the old validity, and at least seven days. */
  it('gives a lot about to expire, or expired, seven days from now', () => {
    expect(returnedLotOf(lot({ expiresAt: inDays(2) }), 400, now, DAY).expiresAt).toEqual(inDays(7));
    expect(returnedLotOf(lot({ status: 'EXPIRED', remainingCents: 0, expiresAt: inDays(-3) }), 400, now, DAY)).toEqual({
      status: 'AVAILABLE',
      remainingCents: 400,
      unrecoveredCents: 0,
      expiresAt: inDays(7),
      creditedCents: 400,
    });
  });

  it('keeps a lot that never expires that way', () => {
    expect(returnedLotOf(lot({ expiresAt: null }), 400, now, DAY).expiresAt).toBeNull();
  });

  /** Its order was cancelled after the customer spent from it: what returns pays the shop back, and is no credit. */
  it('pays back what a void lot never got back, and credits nothing', () => {
    expect(returnedLotOf(lot({ status: 'VOIDED', remainingCents: 0, unrecoveredCents: 300 }), 400, now, DAY)).toEqual({
      status: 'VOIDED',
      remainingCents: 0,
      unrecoveredCents: 0,
      expiresAt: inDays(30),
      creditedCents: 0,
    });
  });

  it('puts back on a pending lot what it will pay out once its order is delivered again', () => {
    expect(returnedLotOf(lot({ status: 'PENDING', remainingCents: 200, unrecoveredCents: 300, expiresAt: null }), 250, now, DAY)).toEqual({
      status: 'PENDING',
      remainingCents: 450,
      unrecoveredCents: 50,
      expiresAt: null,
      creditedCents: 0,
    });
  });
});

describe('cashbackMaxOf', () => {
  it("is the shop's share of the products, rounded down, never more than the balance", () => {
    expect(cashbackMaxOf(10_000, 9_999, 5_000)).toBe(4_999);
    expect(cashbackMaxOf(1_200, 9_999, 5_000)).toBe(1_200);
  });

  it('is nothing with nothing to pay for, or nothing to spend', () => {
    expect(cashbackMaxOf(1_000, 0, 10_000)).toBe(0);
    expect(cashbackMaxOf(0, 5_000, 10_000)).toBe(0);
  });
});
