// App
import { endOf, hasEnded, saleEndOf } from './page-countdown.js';

const countdown = (endsAt?: string) => ({ kind: 'COUNTDOWN' as const, items: endsAt ? [{ id: 'fim', endsAt }] : [] });
const END = Date.parse('2026-09-30T02:59:00.000Z');

describe('hasEnded', () => {
  it('is over at its end, not a millisecond before', () => {
    expect(hasEnded(countdown('2026-09-30T02:59:00.000Z'), END)).toBe(true);
    expect(hasEnded(countdown('2026-09-30T02:59:00.000Z'), END - 1)).toBe(false);
  });

  it('counts a countdown with no end as over, and never another kind', () => {
    expect(hasEnded(countdown(), END)).toBe(true);
    expect(hasEnded({ kind: 'HEADING', items: [] }, END)).toBe(false);
    expect(endOf({ kind: 'HEADING', items: [] })).toBeNull();
  });
});

describe('saleEndOf', () => {
  it('ends three days later, on the next hour', () => {
    expect(saleEndOf(new Date('2026-09-26T10:15:30.000Z'))).toBe('2026-09-29T11:00:00.000Z');
    expect(saleEndOf(new Date('2026-09-26T10:00:00.000Z'))).toBe('2026-09-29T10:00:00.000Z');
  });
});
