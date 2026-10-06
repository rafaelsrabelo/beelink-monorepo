// App
import { CHECK_MAX_MS, FIRST_CHECK_MS, nextCheckAfter } from './payment-checks.js';

const now = new Date('2026-10-06T12:00:00.000Z');
const waitOf = (checks: number) => nextCheckAfter(checks, now).getTime() - now.getTime();

describe('when a waiting charge is asked about next (BEELINK-206)', () => {
  it('waits ten minutes first, and twice as long each time', () => {
    expect([0, 1, 2, 3].map(waitOf)).toEqual([FIRST_CHECK_MS, 2 * FIRST_CHECK_MS, 4 * FIRST_CHECK_MS, 8 * FIRST_CHECK_MS]);
  });

  it('never waits longer than twelve hours, however many times it asked', () => {
    expect(waitOf(7)).toBe(CHECK_MAX_MS);
    expect(waitOf(5000)).toBe(CHECK_MAX_MS);
    expect(waitOf(-3)).toBe(FIRST_CHECK_MS);
  });
});
