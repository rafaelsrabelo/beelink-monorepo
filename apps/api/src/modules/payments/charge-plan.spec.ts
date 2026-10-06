// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import type { AsaasCharge } from '../integrations/asaas/asaas.client.js';
import { isPaidPlan, planCreated, planServes, plansOf, rowServes, type WantedCharge } from './charge-plan.js';

const charge = (over: Partial<AsaasCharge> = {}): AsaasCharge => ({
  id: 'pay_1',
  status: 'PENDING',
  deleted: false,
  billingType: 'PIX',
  valueCents: 5990,
  dueDate: '2026-10-07',
  invoiceUrl: 'https://sandbox.asaas.com/i/1',
  installmentId: null,
  installmentNumber: null,
  externalReference: 'order-1',
  refunds: [],
  ...over,
});
const want: WantedCharge = { orderId: 'order-1', method: 'PIX', totalCents: 5990, installments: 1 };

describe("Asaas's charges for one order, read as what there is to pay", () => {
  it("adds up a plan's refunds, and calls it refunded only when every instalment is (BEELINK-208)", () => {
    const instalment = (number: number, over: Partial<AsaasCharge>) => charge({ id: `pay_${number}`, installmentId: 'ins_1', installmentNumber: number, billingType: 'CREDIT_CARD', valueCents: 2000, status: 'CONFIRMED', ...over });

    const part = plansOf([instalment(1, { status: 'REFUNDED' }), instalment(2, { refunds: [{ status: 'PENDING', valueCents: 500 }] }), instalment(3, {})])[0]!;
    expect(part.status).toBe('CONFIRMED');
    expect(part.refunds).toEqual({ doneCents: 2000, pendingCents: 500, cancelledCents: 0 });

    const whole = plansOf([instalment(1, { status: 'REFUNDED' }), instalment(2, { status: 'REFUNDED' })])[0]!;
    expect(whole.status).toBe('REFUNDED');
    expect(whole.refunds).toEqual({ doneCents: 4000, pendingCents: 0, cancelledCents: 0 });
    expect(isPaidPlan(whole)).toBe(true);
  });

  it('says nothing of refunds on the answer to a creation', () => {
    expect(planCreated(charge(), want).refunds).toBeNull();
  });

  it('reads a charge in full as itself', () => {
    expect(plansOf([charge()])).toEqual([{ id: 'pay_1', installmentId: null, status: 'PENDING', deleted: false, billingType: 'PIX', totalCents: 5990, installments: 1, dueDate: '2026-10-07', invoiceUrl: 'https://sandbox.asaas.com/i/1', refunds: { doneCents: 0, pendingCents: 0, cancelledCents: 0 } }]);
  });

  it('reads the instalments of a plan as one payment: the first names it, the values add up, and one paid is the plan paid', () => {
    const plan = (status: string[]) =>
      plansOf([
        charge({ id: 'pay_3', installmentId: 'ins_1', installmentNumber: 3, valueCents: 1998, billingType: 'CREDIT_CARD', status: status[2]!, dueDate: '2026-12-08' }),
        charge({ id: 'pay_1', installmentId: 'ins_1', installmentNumber: 1, valueCents: 1996, billingType: 'CREDIT_CARD', status: status[0]!, dueDate: '2026-10-08' }),
        charge({ id: 'pay_2', installmentId: 'ins_1', installmentNumber: 2, valueCents: 1996, billingType: 'CREDIT_CARD', status: status[1]!, dueDate: '2026-11-08' }),
        charge({ id: 'pay_9' }),
      ]);

    expect(plan(['PENDING', 'PENDING', 'PENDING'])).toMatchObject([{ id: 'pay_1', installmentId: 'ins_1', status: 'PENDING', totalCents: 5990, installments: 3, dueDate: '2026-10-08' }, { id: 'pay_9', installments: 1 }]);
    const paid = plan(['PENDING', 'CONFIRMED', 'PENDING'])[0]!;
    expect(paid).toMatchObject({ id: 'pay_1', status: 'CONFIRMED' });
    expect(isPaidPlan(paid)).toBe(true);
  });

  it('reads the answer to a creation as the plan that was asked for: Asaas answers the first instalment alone', () => {
    const first = charge({ installmentId: 'ins_1', installmentNumber: 1, valueCents: 1996, billingType: 'CREDIT_CARD' });
    expect(planCreated(first, { ...want, method: 'CREDIT_CARD', installments: 3 })).toMatchObject({ id: 'pay_1', installmentId: 'ins_1', totalCents: 5990, installments: 3 });
  });

  it('knows a charge at Asaas serves only while it waits, of the same way, amount and split, and not past its day', () => {
    const [plan] = plansOf([charge()]);
    expect(planServes(plan!, want, '2026-10-07')).toBe(true);
    expect(planServes(plan!, want, '2026-10-08')).toBe(false);
    expect(planServes(plan!, { ...want, totalCents: 7190 }, '2026-10-06')).toBe(false);
    expect(planServes(plan!, { ...want, method: 'CREDIT_CARD' }, '2026-10-06')).toBe(false);
    expect(planServes(plan!, { ...want, installments: 2 }, '2026-10-06')).toBe(false);
    expect(planServes({ ...plan!, status: 'OVERDUE' }, want, '2026-10-06')).toBe(false);
  });
});

describe('the charge bee-link keeps, against what the order asks for now', () => {
  const now = new Date('2026-10-06T15:00:00Z');
  const connectedAt = new Date('2026-10-01T12:00:00Z');
  const row = (over: Partial<OrderPaymentModel> = {}) =>
    ({ status: 'PENDING', expiresAt: new Date('2026-10-08T02:59:59.999Z'), amountCents: 5990, method: 'PIX', installments: 1, createdAt: new Date('2026-10-06T14:00:00Z'), ...over }) as OrderPaymentModel;

  it('serves while it waits, within its time, at the order’s total, way and split', () => {
    expect(rowServes(row(), want, now, connectedAt)).toBe(true);
    expect(rowServes(row({ expiresAt: new Date('2026-10-06T14:59:59Z') }), want, now, connectedAt)).toBe(false);
    expect(rowServes(row({ expiresAt: null }), want, now, connectedAt)).toBe(false);
    expect(rowServes(row({ status: 'OVERDUE' }), want, now, connectedAt)).toBe(false);
    expect(rowServes(row({ amountCents: 7190 }), want, now, connectedAt)).toBe(false);
    expect(rowServes(row({ installments: 2 }), want, now, connectedAt)).toBe(false);
  });

  /** A key replaced since may be another account's: the charge is there, and its webhook no longer reaches this shop. */
  it('does not serve when it was made before the connection the shop has now, nor with no connection at all', () => {
    expect(rowServes(row({ createdAt: new Date('2026-09-30T10:00:00Z') }), want, now, connectedAt)).toBe(false);
    expect(rowServes(row(), want, now, null)).toBe(false);
  });
});
