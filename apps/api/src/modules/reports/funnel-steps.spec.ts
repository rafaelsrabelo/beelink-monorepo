// App
import { COUNTED_FUNNEL_STEPS, FUNNEL_STEPS, funnelCutoffDay } from './funnel-steps.js';

describe("the funnel's steps and how long they are kept (BEELINK-276)", () => {
  it('counts four steps from the shop window, and reads the purchase last', () => {
    expect(COUNTED_FUNNEL_STEPS).toEqual(['PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START']);
    expect(FUNNEL_STEPS).toEqual([...COUNTED_FUNNEL_STEPS, 'PURCHASE']);
  });

  it('keeps thirteen months: the same day, thirteen months back', () => {
    expect(funnelCutoffDay(new Date('2026-10-06T15:00:00.000Z'))).toBe('2025-09-06');
    expect(funnelCutoffDay(new Date('2026-01-15T15:00:00.000Z'))).toBe('2024-12-15');
  });

  it("reads today on the shop's clock, not in UTC", () => {
    // 23:30 in Brasília on the 5th is already the 6th in UTC.
    expect(funnelCutoffDay(new Date('2026-10-06T02:30:00.000Z'))).toBe('2025-09-05');
  });

  it('gives the last day of a month too short for the day', () => {
    expect(funnelCutoffDay(new Date('2026-03-31T15:00:00.000Z'))).toBe('2025-02-28');
    expect(funnelCutoffDay(new Date('2025-03-30T15:00:00.000Z'))).toBe('2024-02-29');
  });
});
