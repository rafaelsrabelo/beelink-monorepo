// Libs
import { describe, expect, it } from 'vitest';

// App
import { couponStatusOf, promotionStatusOf } from './promotion-status.js';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const at = (iso: string) => new Date(iso);
const running = { startsAt: at('2026-09-01T00:00:00.000Z'), endsAt: at('2026-11-01T00:00:00.000Z'), isActive: true };

describe('promotionStatusOf', () => {
  it('runs between its start and its end, and with no end at all', () => {
    expect(promotionStatusOf(running, NOW)).toBe('ACTIVE');
    expect(promotionStatusOf({ ...running, endsAt: null }, NOW)).toBe('ACTIVE');
  });

  it('starts on its first instant and is over on its last', () => {
    expect(promotionStatusOf({ ...running, startsAt: NOW }, NOW)).toBe('ACTIVE');
    expect(promotionStatusOf({ ...running, endsAt: NOW }, NOW)).toBe('ENDED');
  });

  it('is scheduled until its start comes', () => {
    expect(promotionStatusOf({ ...running, startsAt: at('2026-10-02T00:00:00.000Z') }, NOW)).toBe('SCHEDULED');
  });

  it('reads paused when switched off, running or still to start, and ended once over, paused or not', () => {
    expect(promotionStatusOf({ ...running, isActive: false }, NOW)).toBe('PAUSED');
    expect(promotionStatusOf({ ...running, startsAt: at('2026-10-02T00:00:00.000Z'), isActive: false }, NOW)).toBe('PAUSED');
    expect(promotionStatusOf({ ...running, endsAt: at('2026-09-30T00:00:00.000Z'), isActive: false }, NOW)).toBe('ENDED');
  });
});

describe('couponStatusOf', () => {
  const coupon = { ...running, maxUses: 10, usedCount: 3 };

  it('reads as a promotion while it has uses left, or no limit', () => {
    expect(couponStatusOf(coupon, NOW)).toBe('ACTIVE');
    expect(couponStatusOf({ ...coupon, maxUses: null, usedCount: 5000 }, NOW)).toBe('ACTIVE');
    expect(couponStatusOf({ ...coupon, isActive: false }, NOW)).toBe('PAUSED');
    expect(couponStatusOf({ ...coupon, startsAt: at('2026-10-02T00:00:00.000Z') }, NOW)).toBe('SCHEDULED');
  });

  it('is exhausted at its limit, and past it once the limit was lowered', () => {
    expect(couponStatusOf({ ...coupon, usedCount: 10 }, NOW)).toBe('EXHAUSTED');
    expect(couponStatusOf({ ...coupon, maxUses: 2 }, NOW)).toBe('EXHAUSTED');
  });

  it('reads exhausted before paused, and ended before both', () => {
    expect(couponStatusOf({ ...coupon, usedCount: 10, isActive: false }, NOW)).toBe('EXHAUSTED');
    expect(couponStatusOf({ ...coupon, usedCount: 10, isActive: false, endsAt: at('2026-09-30T00:00:00.000Z') }, NOW)).toBe('ENDED');
  });
});
