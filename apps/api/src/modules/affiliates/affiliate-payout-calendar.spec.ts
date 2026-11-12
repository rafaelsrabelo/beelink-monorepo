// App
import { payoutPeriodOf, payoutPeriodsOfMonth } from './affiliate-payout-calendar.js';

describe('the payout calendar', () => {
  it('puts the 1st to the 10th in one period, due ten days after it closes', () => {
    expect(payoutPeriodOf('2026-11-01', 10)).toEqual({ firstDay: '2026-11-01', lastDay: '2026-11-10', dueOn: '2026-11-20' });
    expect(payoutPeriodOf('2026-11-10', 10)).toEqual({ firstDay: '2026-11-01', lastDay: '2026-11-10', dueOn: '2026-11-20' });
  });

  it('puts the 11th to the 20th in the next, due on the 30th', () => {
    expect(payoutPeriodOf('2026-11-11', 10)).toEqual({ firstDay: '2026-11-11', lastDay: '2026-11-20', dueOn: '2026-11-30' });
    expect(payoutPeriodOf('2026-11-20', 10).firstDay).toBe('2026-11-11');
  });

  it("runs the third to the month's last day, and is due in the month after", () => {
    expect(payoutPeriodOf('2026-10-31', 10)).toEqual({ firstDay: '2026-10-21', lastDay: '2026-10-31', dueOn: '2026-11-10' });
    expect(payoutPeriodOf('2026-11-21', 10)).toEqual({ firstDay: '2026-11-21', lastDay: '2026-11-30', dueOn: '2026-12-10' });
  });

  it('counts the delay from the last day, so a short month moves the date and not the rule', () => {
    expect(payoutPeriodOf('2027-02-15', 10).dueOn).toBe('2027-03-02');
    expect(payoutPeriodOf('2027-02-28', 10)).toEqual({ firstDay: '2027-02-21', lastDay: '2027-02-28', dueOn: '2027-03-10' });
    expect(payoutPeriodOf('2028-02-29', 10).lastDay).toBe('2028-02-29');
  });

  it('crosses into the next year', () => {
    expect(payoutPeriodOf('2026-12-25', 10)).toEqual({ firstDay: '2026-12-21', lastDay: '2026-12-31', dueOn: '2027-01-10' });
  });

  it('is due the day it closes at no delay, and as far as the delay goes', () => {
    expect(payoutPeriodOf('2026-11-05', 0).dueOn).toBe('2026-11-10');
    expect(payoutPeriodOf('2026-11-05', 60).dueOn).toBe('2027-01-09');
  });

  it('lists the three periods of the month a day is in', () => {
    expect(payoutPeriodsOfMonth('2026-11-11', 10)).toEqual([
      { firstDay: '2026-11-01', lastDay: '2026-11-10', dueOn: '2026-11-20' },
      { firstDay: '2026-11-11', lastDay: '2026-11-20', dueOn: '2026-11-30' },
      { firstDay: '2026-11-21', lastDay: '2026-11-30', dueOn: '2026-12-10' },
    ]);
  });

  it.each(['2026-02-30', '2026-13-01', '2026-11-00', '11/11/2026'])('refuses %s, which names no day', (day) => {
    expect(() => payoutPeriodOf(day, 10)).toThrow(RangeError);
  });
});
