// App
import { businessDaysAfter } from './business-days.js';

const day = (date: Date) => date.toISOString().slice(0, 10);

describe('business days after an order (BEELINK-186)', () => {
  it('counts on from the day of the order, skipping the weekend', () => {
    // Friday 2 October 2026, at noon in Brasília.
    const friday = new Date('2026-10-02T15:00:00.000Z');

    expect(day(businessDaysAfter(friday, 0))).toBe('2026-10-02');
    expect(day(businessDaysAfter(friday, 1))).toBe('2026-10-05');
    expect(day(businessDaysAfter(friday, 5))).toBe('2026-10-09');
    expect(day(businessDaysAfter(friday, 6))).toBe('2026-10-12');
  });

  it("starts from the shop's day, which is still the day before late at night in UTC", () => {
    // 01:00 UTC on Saturday is 22:00 on Friday in Brasília.
    expect(day(businessDaysAfter(new Date('2026-10-03T01:00:00.000Z'), 0))).toBe('2026-10-02');
    expect(day(businessDaysAfter(new Date('2026-10-03T01:00:00.000Z'), 1))).toBe('2026-10-05');
  });
});
