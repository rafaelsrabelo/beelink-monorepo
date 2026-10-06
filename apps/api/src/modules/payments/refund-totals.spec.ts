// Libs
import { describe, expect, it } from 'vitest';

// App
import { chargeRefundTotals, refundTotalsOf, sumRefundTotals } from './refund-totals.js';

describe("a charge's refunds, added up (BEELINK-208)", () => {
  it('counts only DONE as money back, CANCELLED as nothing, and every other word as on its way', () => {
    expect(
      refundTotalsOf([
        { status: 'DONE', valueCents: 1000 },
        { status: 'PENDING', valueCents: 200 },
        { status: 'AWAITING_CRITICAL_ACTION_AUTHORIZATION', valueCents: 30 },
        { status: 'A_WORD_ASAAS_ADDS_LATER', valueCents: 4 },
        { status: 'CANCELLED', valueCents: 500 },
      ]),
    ).toEqual({ doneCents: 1000, pendingCents: 234, cancelledCents: 500 });
  });

  it('takes a charge Asaas calls refunded as all of it back, whatever its list holds', () => {
    expect(chargeRefundTotals({ status: 'REFUNDED', valueCents: 5990, refunds: [] })).toEqual({ doneCents: 5990, pendingCents: 0, cancelledCents: 0 });
  });

  it('takes a refund under way with nothing pending on the list as the rest of the charge on its way', () => {
    expect(chargeRefundTotals({ status: 'REFUND_IN_PROGRESS', valueCents: 5990, refunds: [] })).toEqual({ doneCents: 0, pendingCents: 5990, cancelledCents: 0 });
    expect(chargeRefundTotals({ status: 'REFUND_REQUESTED', valueCents: 5990, refunds: [{ status: 'DONE', valueCents: 990 }] })).toEqual({ doneCents: 990, pendingCents: 5000, cancelledCents: 0 });
    expect(chargeRefundTotals({ status: 'REFUND_IN_PROGRESS', valueCents: 5990, refunds: [{ status: 'PENDING', valueCents: 1000 }] })).toEqual({ doneCents: 0, pendingCents: 1000, cancelledCents: 0 });
  });

  it('never counts more than the charge is worth', () => {
    expect(chargeRefundTotals({ status: 'RECEIVED', valueCents: 1000, refunds: [{ status: 'DONE', valueCents: 800 }, { status: 'DONE', valueCents: 800 }, { status: 'PENDING', valueCents: 800 }] })).toEqual({ doneCents: 1000, pendingCents: 0, cancelledCents: 0 });
  });

  it("adds a plan's instalments together", () => {
    expect(sumRefundTotals([{ doneCents: 100, pendingCents: 0, cancelledCents: 0 }, { doneCents: 0, pendingCents: 100, cancelledCents: 5 }])).toEqual({ doneCents: 100, pendingCents: 100, cancelledCents: 5 });
    expect(sumRefundTotals([])).toEqual({ doneCents: 0, pendingCents: 0, cancelledCents: 0 });
  });
});
