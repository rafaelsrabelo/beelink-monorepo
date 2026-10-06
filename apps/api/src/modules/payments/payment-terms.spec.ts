// Libs
import { describe, expect, it } from 'vitest';

// App
import { belowMinimumOf, brasiliaDayOf, dueDateOf, endOfBrasiliaDay, installmentsFor, installmentsRoomOf } from './payment-terms.js';

describe("a charge's days, in Brasília's calendar", () => {
  it('reads the day it is in Brasília, three hours behind UTC', () => {
    expect(brasiliaDayOf(new Date('2026-10-06T02:59:59Z'))).toBe('2026-10-05');
    expect(brasiliaDayOf(new Date('2026-10-06T03:00:00Z'))).toBe('2026-10-06');
    expect(brasiliaDayOf(new Date('2027-01-01T01:00:00Z'))).toBe('2026-12-31');
  });

  it('makes a Pix due the next day and a card in three, counted from the day in Brasília', () => {
    // 23h on the 5th in Brasília is already the 6th in UTC.
    const late = new Date('2026-10-06T02:00:00Z');
    expect(dueDateOf('PIX', late)).toBe('2026-10-06');
    expect(dueDateOf('CREDIT_CARD', late)).toBe('2026-10-08');
    expect(dueDateOf('PIX', new Date('2026-10-31T15:00:00Z'))).toBe('2026-11-01');
  });

  it('offers a charge until the last instant of its due day there', () => {
    expect(endOfBrasiliaDay('2026-10-06').toISOString()).toBe('2026-10-07T02:59:59.999Z');
  });
});

describe("Asaas's least amounts", () => {
  it('says how many instalments a total splits into, none under R$ 5,00', () => {
    expect(installmentsRoomOf(499)).toBe(0);
    expect(installmentsRoomOf(500)).toBe(1);
    expect(installmentsRoomOf(999)).toBe(1);
    expect(installmentsRoomOf(1000)).toBe(2);
    expect(installmentsRoomOf(5990)).toBe(11);
  });

  it('refuses a total under the least charge, and a split with an instalment under the least', () => {
    expect(belowMinimumOf(499, 1)).toEqual({ minimumCents: 500, maxInstallments: 0 });
    expect(belowMinimumOf(500, 1)).toBeNull();
    expect(belowMinimumOf(5990, 11)).toBeNull();
    expect(belowMinimumOf(5990, 12)).toEqual({ minimumCents: 500, maxInstallments: 11 });
  });

  it('charges in what the customer chose, in fewer when the total no longer splits that far, and a Pix always in full', () => {
    expect(installmentsFor('CREDIT_CARD', 7190, 6)).toBe(6);
    expect(installmentsFor('CREDIT_CARD', 1200, 6)).toBe(2);
    expect(installmentsFor('CREDIT_CARD', 700, 6)).toBe(1);
    expect(installmentsFor('PIX', 7190, 6)).toBe(1);
  });
});
