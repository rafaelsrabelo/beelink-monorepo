// App
import { SUBSCRIPTION_STATUSES } from './billing.constants.js';
import { statusAt } from './subscription-status.js';

const trialEndsAt = new Date('2026-10-21T03:00:00.000Z');

describe('where a subscription stands at an instant', () => {
  it('is in trial until the instant the trial ends', () => {
    expect(statusAt({ status: 'TRIALING', trialEndsAt }, new Date('2026-10-13T16:24:00.000Z'))).toBe('TRIALING');
    expect(statusAt({ status: 'TRIALING', trialEndsAt }, new Date('2026-10-21T02:59:59.999Z'))).toBe('TRIALING');
  });

  it('reads a trial as expired from that instant on, though nothing wrote it', () => {
    expect(statusAt({ status: 'TRIALING', trialEndsAt }, trialEndsAt)).toBe('TRIAL_EXPIRED');
    expect(statusAt({ status: 'TRIALING', trialEndsAt }, new Date('2027-01-01T00:00:00.000Z'))).toBe('TRIAL_EXPIRED');
  });

  it('keeps an expired trial that was written as one', () => {
    expect(statusAt({ status: 'TRIAL_EXPIRED', trialEndsAt }, new Date('2026-10-13T16:24:00.000Z'))).toBe('TRIAL_EXPIRED');
  });

  it.each(SUBSCRIPTION_STATUSES.filter((status) => status !== 'TRIALING'))('leaves %s as it was written, before the trial’s end and after it', (status) => {
    expect(statusAt({ status, trialEndsAt }, new Date('2026-10-13T16:24:00.000Z'))).toBe(status);
    expect(statusAt({ status, trialEndsAt }, new Date('2027-01-01T00:00:00.000Z'))).toBe(status);
  });

  it('knows the seven of them', () => {
    expect(SUBSCRIPTION_STATUSES).toEqual(['TRIALING', 'TRIAL_EXPIRED', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELED', 'EXEMPT']);
  });
});
