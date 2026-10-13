// App
import type { PlatformCharge, PlatformSubscription } from './platform-asaas.client.js';
import { awaitsPayment, firstChargeOf, invoiceDescriptionOf, serves, touchedByMoney } from './subscription-attempt.js';

/** A monthly subscription as the sandbox answered one on 13/10/2026, in the client's own shape. */
const standing = {
  id: 'sub_cwtxq513jlpjfid1',
  status: 'ACTIVE',
  deleted: false,
  customerId: 'cus_000009459220',
  valueCents: 5990,
  cycle: 'MONTHLY',
  billingType: 'UNDEFINED',
  nextDueDate: '2026-11-13',
  externalReference: 'beelink-subscription-0199a0f1-0000-7000-8000-0000000000c1',
  card: null,
} satisfies PlatformSubscription;

const want = { customerId: 'cus_000009459220', cycle: 'MONTHLY', priceCents: 5990 } as const;

const charge = (status: string, dueDate = '2026-10-13'): PlatformCharge => ({
  id: `pay_${status.toLowerCase()}_${dueDate}`,
  status,
  billingType: 'UNDEFINED',
  valueCents: 5990,
  dueDate,
  paymentDate: null,
  confirmedDate: null,
  invoiceUrl: `https://sandbox.asaas.com/i/${dueDate}`,
  subscriptionId: standing.id,
  externalReference: standing.externalReference,
  card: null,
});

describe("what stands at Asaas for a page's subscription (BEELINK-292)", () => {
  describe('a charge', () => {
    it.each(['PENDING', 'OVERDUE'])('only waits to be paid while it is %s', (status) => {
      expect(awaitsPayment(charge(status))).toBe(true);
    });

    it.each(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS', 'UNKNOWN', '', 'pending'])(
      'no longer only waits once it is %j — money moved, or may have',
      (status) => {
        expect(awaitsPayment(charge(status))).toBe(false);
      },
    );
  });

  describe('a subscription', () => {
    it('was not touched by money with every charge waiting, or with none at all', () => {
      expect(touchedByMoney([])).toBe(false);
      expect(touchedByMoney([charge('PENDING'), charge('OVERDUE', '2026-11-13')])).toBe(false);
    });

    it('was touched by money with one charge that does not wait, wherever it comes in the list', () => {
      expect(touchedByMoney([charge('PENDING', '2026-11-13'), charge('CONFIRMED')])).toBe(true);
      expect(touchedByMoney([charge('REFUNDED')])).toBe(true);
    });

    it('serves when it is alive, the customer\'s, in the cycle chosen and at the price asked', () => {
      expect(serves(standing, want)).toBe(true);
      expect(serves({ ...standing, cycle: 'SEMIANNUALLY', valueCents: 32340 }, { ...want, cycle: 'SEMIANNUAL', priceCents: 32340 })).toBe(true);
      expect(serves({ ...standing, cycle: 'YEARLY', valueCents: 57480 }, { ...want, cycle: 'ANNUAL', priceCents: 57480 })).toBe(true);
    });

    it.each([
      ['another cycle', { cycle: 'YEARLY' }],
      ["bee-link's word for the cycle where Asaas's is expected", { cycle: 'ANNUAL' }],
      ['another amount, by one cent', { valueCents: 5991 }],
      ['another customer', { customerId: 'cus_000009459221' }],
      ['no customer', { customerId: null }],
      ['removed', { deleted: true }],
      ['inactive', { status: 'INACTIVE' }],
      ['expired', { status: 'EXPIRED' }],
    ])('does not serve when it is of %s', (_what, change) => {
      expect(serves({ ...standing, ...change }, want)).toBe(false);
    });

    it('does not serve an amount the plan no longer has, though the cycle is the one chosen', () => {
      expect(serves(standing, { ...want, priceCents: 6490 })).toBe(false);
    });
  });

  describe('the first charge', () => {
    it('is the one due earliest, whatever the order Asaas lists them in', () => {
      const charges = [charge('PENDING', '2026-12-31'), charge('PENDING', '2026-10-31'), charge('PENDING', '2026-11-30')];

      expect(firstChargeOf(charges)?.dueDate).toBe('2026-10-31');
      expect(firstChargeOf([...charges].reverse())?.dueDate).toBe('2026-10-31');
    });

    it('is none with no charge, and never one whose due day could not be read', () => {
      expect(firstChargeOf([])).toBeNull();
      expect(firstChargeOf([charge('PENDING', '')])).toBeNull();
      expect(firstChargeOf([charge('PENDING', ''), charge('PENDING', '2027-01-31')])?.dueDate).toBe('2027-01-31');
    });
  });

  describe("the invoice's description", () => {
    it.each([
      ['MONTHLY', 'Plano Beelink mensal — página "Padaria da Lia"'],
      ['SEMIANNUAL', 'Plano Beelink semestral — página "Padaria da Lia"'],
      ['ANNUAL', 'Plano Beelink anual — página "Padaria da Lia"'],
    ] as const)('says the plan, the cycle and the page in Portuguese: %s', (cycle, said) => {
      expect(invoiceDescriptionOf('Beelink', cycle, '  Padaria da Lia ')).toBe(said);
    });

    it('cuts a name longer than any shop has, by characters and not by bytes', () => {
      const said = invoiceDescriptionOf('Beelink', 'MONTHLY', '🥐'.repeat(300));

      expect(said).toBe(`Plano Beelink mensal — página "${'🥐'.repeat(120)}"`);
    });
  });
});
