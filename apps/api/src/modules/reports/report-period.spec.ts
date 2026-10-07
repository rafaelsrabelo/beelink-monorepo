// Nest
import { BadRequestException } from '@nestjs/common';

// App
import { reportPeriodOf, shopDayOf } from './report-period.js';

/** 01:30 in Brasília on 6 October — still the 6th there, and already 04:30 UTC. */
const NOW = new Date('2026-10-06T04:30:00.000Z');

const refusal = (query: { from?: string; to?: string }) => {
  try {
    reportPeriodOf(query, NOW);
  } catch (error) {
    return error instanceof BadRequestException ? (error.getResponse() as { errorCode: string }).errorCode : `threw ${String(error)}`;
  }
  return 'accepted';
};

describe("a report's period (BEELINK-275)", () => {
  it("counts both days whole, on the shop's clock", () => {
    const period = reportPeriodOf({ from: '2026-09-30', to: '2026-10-01' }, NOW);

    expect(period).toEqual({ from: '2026-09-30', to: '2026-10-01', start: new Date('2026-09-30T03:00:00.000Z'), end: new Date('2026-10-02T03:00:00.000Z') });
  });

  it('takes one day as a period', () => {
    const period = reportPeriodOf({ from: '2026-10-06', to: '2026-10-06' }, NOW);

    expect(period.end.getTime() - period.start.getTime()).toBe(86_400_000);
  });

  it('reads no period as the thirty days ending today in Brasília, not in UTC', () => {
    // 23:30 in Brasília on the 5th is 02:30 UTC on the 6th: today is still the 5th.
    const lateEvening = new Date('2026-10-06T02:30:00.000Z');

    expect(reportPeriodOf({}, lateEvening)).toMatchObject({ from: '2026-09-06', to: '2026-10-05' });
    expect(reportPeriodOf({}, NOW)).toMatchObject({ from: '2026-09-07', to: '2026-10-06', start: new Date('2026-09-07T03:00:00.000Z'), end: new Date('2026-10-07T03:00:00.000Z') });
  });

  it('names the day an instant falls on in Brasília', () => {
    expect(shopDayOf(new Date('2026-01-01T02:59:59.999Z'))).toBe('2025-12-31');
    expect(shopDayOf(new Date('2026-01-01T03:00:00.000Z'))).toBe('2026-01-01');
  });

  it('takes a year and a day ahead of today, and refuses a day more than a leap year', () => {
    expect(refusal({ from: '2024-01-01', to: '2024-12-31' })).toBe('accepted');
    expect(refusal({ from: '2026-10-01', to: '2027-01-31' })).toBe('accepted');
    expect(refusal({ from: '2025-01-01', to: '2026-01-02' })).toBe('REPORT_PERIOD_INVALID');
  });

  it.each([
    ['only one of the two', { from: '2026-10-01' }],
    ['only the other', { to: '2026-10-01' }],
    ['the first after the second', { from: '2026-10-02', to: '2026-10-01' }],
    ['a day that does not exist', { from: '2026-02-30', to: '2026-03-01' }],
    ['a month that does not exist', { from: '2026-13-01', to: '2026-12-31' }],
    ['an instant', { from: '2026-10-01T00:00:00Z', to: '2026-10-02' }],
    ['another order of the parts', { from: '01/10/2026', to: '02/10/2026' }],
    ['nothing in it', { from: '', to: '' }],
    ['words', { from: 'ontem', to: 'hoje' }],
  ])('refuses %s', (_what, query) => {
    expect(refusal(query)).toBe('REPORT_PERIOD_INVALID');
  });
});
