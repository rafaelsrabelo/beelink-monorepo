// App
import { owedOf, type OwedAffiliate } from './affiliate-owed.js';

const person = (id: string, availableCents: number, pendingCents = 0): OwedAffiliate => ({ id, name: id, slug: id, status: 'ACTIVE', pixKey: null, availableCents, pendingCents });

describe('what a shop owes its affiliates, by due day', () => {
  it('lays a balance over the latest commissions first, since a payout settles the oldest', () => {
    const owed = owedOf({
      today: '2026-11-25',
      affiliates: [person('maria', 1500)],
      // Latest first: 1000 due on the 20th, 1000 on the 10th, 1000 on 31/10 — 3000 earned, 1500 left after a payout.
      available: [
        { affiliateId: 'maria', dueOn: '2026-11-20', commissionCents: 1000 },
        { affiliateId: 'maria', dueOn: '2026-11-10', commissionCents: 1000 },
        { affiliateId: 'maria', dueOn: '2026-10-31', commissionCents: 1000 },
      ],
      upcoming: [],
      awaitingDeliveryCents: 0,
    });

    expect(owed.owedCents).toBe(1500);
    expect(owed.due).toEqual([
      { dueOn: '2026-11-10', amountCents: 500, affiliateCount: 1, state: 'OVERDUE' },
      { dueOn: '2026-11-20', amountCents: 1000, affiliateCount: 1, state: 'OVERDUE' },
    ]);
    expect(owed.affiliates[0]).toMatchObject({ availableCents: 1500, oldestDueOn: '2026-11-10', overdue: true });
    expect(owed.undatedCents).toBe(0);
  });

  it('groups a day across affiliates, and says which is today and which is still to come', () => {
    const owed = owedOf({
      today: '2026-11-20',
      affiliates: [person('ana', 700), person('joao', 300, 900)],
      available: [
        { affiliateId: 'ana', dueOn: '2026-11-20', commissionCents: 700 },
        { affiliateId: 'joao', dueOn: '2026-11-20', commissionCents: 300 },
      ],
      upcoming: [
        { affiliateId: 'joao', dueOn: '2026-11-30', commissionCents: 400 },
        { affiliateId: 'joao', dueOn: '2026-11-30', commissionCents: 500 },
      ],
      awaitingDeliveryCents: 250,
    });

    expect(owed.due).toEqual([{ dueOn: '2026-11-20', amountCents: 1000, affiliateCount: 2, state: 'TODAY' }]);
    expect(owed.upcoming).toEqual([{ dueOn: '2026-11-30', amountCents: 900, affiliateCount: 1, state: 'UPCOMING' }]);
    expect(owed.awaitingDeliveryCents).toBe(250);
    expect(owed.affiliates.map((row) => row.affiliate.id)).toEqual(['ana', 'joao']);
    expect(owed.affiliates.every((row) => !row.overdue)).toBe(true);
  });

  it('keeps what an adjustment added past every commission apart, with no due day', () => {
    const owed = owedOf({
      today: '2026-11-25',
      affiliates: [person('maria', 1200)],
      available: [{ affiliateId: 'maria', dueOn: '2026-11-20', commissionCents: 1000 }],
      upcoming: [],
      awaitingDeliveryCents: 0,
    });

    expect(owed.due).toEqual([{ dueOn: '2026-11-20', amountCents: 1000, affiliateCount: 1, state: 'OVERDUE' }]);
    expect(owed.undatedCents).toBe(200);
  });

  it('owes nothing to a balance below zero, and still lists it, short', () => {
    const owed = owedOf({
      today: '2026-11-25',
      affiliates: [person('maria', -300, 500), person('ana', 0)],
      available: [{ affiliateId: 'maria', dueOn: '2026-11-20', commissionCents: 1000 }],
      upcoming: [],
      awaitingDeliveryCents: 500,
    });

    expect(owed.owedCents).toBe(0);
    expect(owed.due).toEqual([]);
    expect(owed.affiliates.find((row) => row.affiliate.id === 'maria')).toMatchObject({ availableCents: -300, pendingCents: 500, oldestDueOn: null, overdue: false });
  });
});
