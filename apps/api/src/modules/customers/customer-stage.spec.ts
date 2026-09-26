// Libs
import { describe, expect, it } from 'vitest';

// App
import { customerSince, daysSince, stageOf } from './customer-stage.js';

const NOW = new Date('2026-09-25T12:00:00.000Z');
const daysAgo = (days: number, hours = 0) => new Date(NOW.getTime() - days * 86_400_000 - hours * 3_600_000);

describe('stageOf', () => {
  it('is a lead with no valid order', () => {
    expect(stageOf({ ordersCount: 0, lastOrderAt: null }, 60, NOW)).toBe('LEAD');
  });

  it('with N = 60, is a customer at 59 days and 60 days and some hours, and inactive at 61', () => {
    expect(stageOf({ ordersCount: 1, lastOrderAt: daysAgo(59) }, 60, NOW)).toBe('CUSTOMER');
    expect(stageOf({ ordersCount: 1, lastOrderAt: daysAgo(60, 23) }, 60, NOW)).toBe('CUSTOMER');
    expect(stageOf({ ordersCount: 1, lastOrderAt: daysAgo(61) }, 60, NOW)).toBe('INACTIVE');
  });

  it('moves with the shop\'s number: 61 days is a customer again under N = 90', () => {
    expect(stageOf({ ordersCount: 3, lastOrderAt: daysAgo(61) }, 90, NOW)).toBe('CUSTOMER');
  });
});

describe('daysSince and customerSince', () => {
  it('count whole days, and cut where stageOf cuts', () => {
    expect(daysSince(daysAgo(2, 5), NOW)).toBe(2);
    expect(daysSince(null, NOW)).toBeNull();

    const cut = customerSince(60, NOW);
    expect(stageOf({ ordersCount: 1, lastOrderAt: new Date(cut.getTime() + 1) }, 60, NOW)).toBe('CUSTOMER');
    expect(stageOf({ ordersCount: 1, lastOrderAt: cut }, 60, NOW)).toBe('INACTIVE');
  });
});
