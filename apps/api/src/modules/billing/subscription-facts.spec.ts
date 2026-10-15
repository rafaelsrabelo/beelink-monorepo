// Types
import type { BillingCycle } from '@harness-monorepo/contracts';

// App
import type { PlatformCharge, PlatformSubscription } from './platform-asaas.client.js';
import { coveredUntilDay, factsOf, nextCheckOf, SubscriptionWithoutCalendar, type PageStanding } from './subscription-facts.js';

/** A monthly subscription as the sandbox answered one on 14/10/2026, in the client's own shape. */
const standing = {
  id: 'sub_1w79svsyz8xmgj3l',
  status: 'ACTIVE',
  deleted: false,
  customerId: 'cus_000009486783',
  valueCents: 5990,
  cycle: 'MONTHLY',
  billingType: 'UNDEFINED',
  nextDueDate: '2026-11-14',
  externalReference: 'beelink-subscription-0199a0f1-0000-7000-8000-0000000000c1',
  card: null,
} satisfies PlatformSubscription;

/** A charge of it, waiting unless told otherwise; paid by the sandbox's own test action, it reads `RECEIVED` and `BOLETO`. */
const charge = (status: string, dueDate: string, change: Partial<PlatformCharge> = {}): PlatformCharge => ({
  id: `pay_${dueDate}`,
  status,
  billingType: status === 'PENDING' || status === 'OVERDUE' ? 'UNDEFINED' : 'BOLETO',
  valueCents: 5990,
  dueDate,
  paymentDate: null,
  confirmedDate: null,
  invoiceUrl: `https://sandbox.asaas.com/i/${dueDate}`,
  subscriptionId: standing.id,
  externalReference: standing.externalReference,
  card: null,
  ...change,
});

/** A page that chose the monthly plan on 14/10/2026 and was never read since. */
const page = (change: Partial<PageStanding> = {}): PageStanding => ({
  status: 'TRIALING',
  cycle: 'MONTHLY',
  firstDueDate: new Date('2026-10-14T00:00:00.000Z'),
  currentPeriodEndsAt: null,
  graceEndsAt: null,
  paymentMethod: null,
  cardBrand: null,
  cardLast4: null,
  ...change,
});

/** Noon in Brasília of a day. */
const noonOf = (day: string): Date => new Date(`${day}T15:00:00.000Z`);
/** The midnight in Brasília that closes a day. */
const closeOf = (day: string): Date => new Date(new Date(`${day}T03:00:00.000Z`).getTime() + 86_400_000);

describe("what a read of Asaas comes to for a page's subscription (BEELINK-221)", () => {
  describe('the day a charge pays until', () => {
    it("is the next due day of the calendar, counted from the first charge as Asaas counts", () => {
      expect(coveredUntilDay('2026-10-14', 'MONTHLY', '2026-10-14')).toBe('2026-11-14');
      expect(coveredUntilDay('2026-10-14', 'MONTHLY', '2026-11-14')).toBe('2026-12-14');
      expect(coveredUntilDay('2026-10-14', 'SEMIANNUAL', '2026-10-14')).toBe('2027-04-14');
      expect(coveredUntilDay('2026-10-14', 'ANNUAL', '2026-10-14')).toBe('2027-10-14');
    });

    it('keeps the 31st where a month has it and falls back to the last day where it has not', () => {
      const days = ['2026-10-31'];
      for (let step = 0; step < 6; step += 1) days.push(coveredUntilDay('2026-10-31', 'MONTHLY', days.at(-1)!));
      expect(days).toEqual(['2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30']);
    });

    it('brings a year begun on 29 February back to it only in a leap year', () => {
      expect(coveredUntilDay('2028-02-29', 'ANNUAL', '2028-02-29')).toBe('2029-02-28');
      expect(coveredUntilDay('2028-02-29', 'ANNUAL', '2031-02-28')).toBe('2032-02-29');
    });

    it('gives a charge whose due day was moved by hand nothing more than the calendar has', () => {
      expect(coveredUntilDay('2026-10-14', 'MONTHLY', '2026-10-20')).toBe('2026-11-14');
      expect(coveredUntilDay('2026-10-14', 'MONTHLY', '2026-10-01')).toBe('2026-10-14');
    });

    it('finds its place in a subscription years old without walking from the start', () => {
      expect(coveredUntilDay('2020-01-15', 'MONTHLY', '2026-10-15')).toBe('2026-11-15');
      expect(coveredUntilDay('2020-01-31', 'MONTHLY', '2026-02-28')).toBe('2026-03-31');
    });
  });

  describe('a payment', () => {
    it.each<[BillingCycle, string, string]>([
      ['MONTHLY', 'MONTHLY', '2026-11-14'],
      ['SEMIANNUAL', 'SEMIANNUALLY', '2027-04-14'],
      ['ANNUAL', 'YEARLY', '2027-10-14'],
    ])('makes a page in trial active, %s, until the end of the next due day in Brasília', (cycle, word, next) => {
      const read = factsOf(page({ cycle }), { ...standing, cycle: word }, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-14'));

      expect(read).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(next), paymentMethod: 'BOLETO', cardBrand: null, cardLast4: null, invoiceUrl: null, gone: false });
    });

    it('makes a page whose trial ran out active the same way — the row still says TRIALING', () => {
      const read = factsOf(page(), standing, [charge('CONFIRMED', '2026-10-14', { billingType: 'PIX' })], noonOf('2026-10-30'));

      expect(read).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2026-11-14'), paymentMethod: 'PIX' });
    });

    it('gains no days for being late: the period follows the calendar, not the day it was paid', () => {
      const read = factsOf(page(), standing, [charge('RECEIVED', '2026-10-14', { paymentDate: '2026-10-20' })], noonOf('2026-10-20'));

      expect(read.currentPeriodEndsAt).toEqual(closeOf('2026-11-14'));
    });

    it('stretches the period over the next charge once that one is paid too, before its due day', () => {
      const read = factsOf(page({ status: 'ACTIVE' }), standing, [charge('RECEIVED', '2026-10-14'), charge('RECEIVED', '2026-11-14', { billingType: 'PIX' })], noonOf('2026-10-20'));

      expect(read).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2026-12-14'), paymentMethod: 'PIX' });
    });

    it('counts any of the words Asaas holds money by — and none of the others', () => {
      for (const status of ['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH', 'DUNNING_RECEIVED']) {
        expect(factsOf(page(), standing, [charge(status, '2026-10-14')], noonOf('2026-10-14')).status).toBe('ACTIVE');
      }
      for (const status of ['PENDING', 'OVERDUE', 'AWAITING_RISK_ANALYSIS', 'DUNNING_REQUESTED', 'A_WORD_ASAAS_ADDS_LATER']) {
        expect(factsOf(page(), standing, [charge(status, '2026-10-14')], noonOf('2026-10-14'))).toMatchObject({ status: 'TRIALING', currentPeriodEndsAt: null });
      }
    });

    it('keeps the page active through the whole due day of the next charge, and past due from the midnight after', () => {
      const charges = [charge('RECEIVED', '2026-10-14'), charge('PENDING', '2026-11-14')];

      expect(factsOf(page({ status: 'ACTIVE' }), standing, charges, new Date(closeOf('2026-11-14').getTime() - 1)).status).toBe('ACTIVE');
      expect(factsOf(page({ status: 'ACTIVE' }), standing, charges, closeOf('2026-11-14'))).toMatchObject({
        status: 'PAST_DUE',
        currentPeriodEndsAt: closeOf('2026-11-14'),
        invoiceUrl: 'https://sandbox.asaas.com/i/2026-11-14',
      });
    });

    it('brings a page past due back to active once the charge it owes is paid', () => {
      const read = factsOf(page({ status: 'PAST_DUE', currentPeriodEndsAt: closeOf('2026-11-14') }), standing, [charge('RECEIVED', '2026-10-14'), charge('RECEIVED', '2026-11-14')], noonOf('2026-11-20'));

      expect(read).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2026-12-14'), invoiceUrl: null });
    });

    it('brings a suspended page back to active once it pays, and otherwise leaves it to the lock that suspended it', () => {
      const owing = [charge('RECEIVED', '2026-10-14'), charge('OVERDUE', '2026-11-14')];
      expect(factsOf(page({ status: 'SUSPENDED' }), standing, owing, noonOf('2026-11-30')).status).toBe('SUSPENDED');

      const paid = [charge('RECEIVED', '2026-10-14'), charge('RECEIVED', '2026-11-14')];
      expect(factsOf(page({ status: 'SUSPENDED' }), standing, paid, noonOf('2026-11-30')).status).toBe('ACTIVE');
    });

    it('is active again on the period a card renewal paid, though the one before it was never paid', () => {
      const charges = [charge('RECEIVED', '2026-10-14'), charge('OVERDUE', '2026-11-14'), charge('CONFIRMED', '2026-12-14', { billingType: 'CREDIT_CARD' })];

      const read = factsOf(page({ status: 'PAST_DUE' }), standing, charges, noonOf('2026-12-20'));

      // The old charge's period is over: paying it would cover nothing of today, so it is no invoice to offer.
      expect(read).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2027-01-14'), invoiceUrl: null });
    });
  });

  describe('a charge given back', () => {
    it("cancels the page when it is the period's, and leaves it no paid period", () => {
      const read = factsOf(page({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2026-11-14'), paymentMethod: 'PIX' }), standing, [charge('REFUNDED', '2026-10-14', { billingType: 'PIX' })], noonOf('2026-10-20'));

      expect(read).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: null, paymentMethod: 'PIX', gone: false, givenBackStanding: true });
    });

    it.each(['REFUND_REQUESTED', 'REFUND_IN_PROGRESS'])('cancels it as soon as the refund is %s', (status) => {
      expect(factsOf(page({ status: 'ACTIVE' }), standing, [charge(status, '2026-10-14')], noonOf('2026-10-20')).status).toBe('CANCELED');
    });

    it('cancels the page when the current period went back, with the earlier paid period as the one it had', () => {
      const read = factsOf(page({ status: 'ACTIVE' }), standing, [charge('RECEIVED', '2026-10-14'), charge('REFUNDED', '2026-11-14')], noonOf('2026-11-20'));

      expect(read).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: closeOf('2026-11-14') });
    });

    it('changes nothing of a period paid since: a refund of an old one does not undo the current one', () => {
      const read = factsOf(page({ status: 'ACTIVE' }), standing, [charge('REFUNDED', '2026-10-14'), charge('RECEIVED', '2026-11-14')], noonOf('2026-11-20'));

      expect(read).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2026-12-14'), givenBackStanding: false });
    });
  });

  describe('a subscription gone at Asaas', () => {
    it('cancels a page that paid, with what it paid for still running — removed, ended, or not there at all', () => {
      const removed = { ...standing, deleted: true, status: 'INACTIVE' };
      // As the sandbox answered on 14/10/2026: the paid charge of a removed subscription is still listed.
      const charges = [charge('RECEIVED', '2026-10-14')];

      for (const subscription of [removed, { ...standing, status: 'INACTIVE' }, { ...standing, status: 'EXPIRED' }]) {
        expect(factsOf(page({ status: 'ACTIVE' }), subscription, charges, noonOf('2026-10-20'))).toMatchObject({
          status: 'CANCELED',
          currentPeriodEndsAt: closeOf('2026-11-14'),
          invoiceUrl: null,
          nextCheckAt: null,
          gone: true,
          givenBackStanding: false,
        });
      }
    });

    it('keeps the period the row knew when Asaas lists nothing of a subscription it no longer has', () => {
      const read = factsOf(page({ status: 'ACTIVE', currentPeriodEndsAt: closeOf('2026-11-14'), paymentMethod: 'CREDIT_CARD', cardBrand: 'VISA', cardLast4: '4242' }), null, [], noonOf('2026-10-20'));

      expect(read).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: closeOf('2026-11-14'), paymentMethod: 'CREDIT_CARD', cardBrand: 'VISA', cardLast4: '4242', gone: true });
    });

    it('cancels nothing of a page that never paid: its trial goes on, and the invoice of the removed one is gone', () => {
      const removed = { ...standing, deleted: true, status: 'INACTIVE' };

      for (const status of ['TRIALING', 'TRIAL_EXPIRED', 'CANCELED'] as const) {
        expect(factsOf(page({ status }), removed, [], noonOf('2026-10-14'))).toMatchObject({ status, invoiceUrl: null, nextCheckAt: null, gone: true });
      }
    });

    it('is not gone for a word of Asaas it does not know', () => {
      expect(factsOf(page({ status: 'ACTIVE' }), { ...standing, status: 'A_WORD_ASAAS_ADDS_LATER' }, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-20'))).toMatchObject({ status: 'ACTIVE', gone: false });
    });
  });

  describe('nothing paid yet', () => {
    it('leaves the page as it was, with the invoice of the first charge to pay', () => {
      for (const status of ['TRIALING', 'TRIAL_EXPIRED', 'CANCELED'] as const) {
        expect(factsOf(page({ status }), standing, [charge('PENDING', '2026-10-14')], noonOf('2026-10-14'))).toMatchObject({
          status,
          currentPeriodEndsAt: null,
          paymentMethod: null,
          invoiceUrl: 'https://sandbox.asaas.com/i/2026-10-14',
        });
      }
    });

    it('does not turn a page cancelled with a paid period still running active, for the new subscription it chose and has not paid', () => {
      const read = factsOf(page({ status: 'CANCELED', currentPeriodEndsAt: closeOf('2026-11-14') }), standing, [charge('PENDING', '2026-10-20')], noonOf('2026-10-20'));

      expect(read).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: closeOf('2026-11-14') });
    });

    it('offers no invoice for a charge in risk analysis: it was paid, and nobody knows yet whether it took', () => {
      expect(factsOf(page(), standing, [charge('AWAITING_RISK_ANALYSIS', '2026-10-14')], noonOf('2026-10-14'))).toMatchObject({ status: 'TRIALING', invoiceUrl: null });
    });
  });

  describe("a page's grace, written with its standing (BEELINK-223)", () => {
    const owing = [charge('RECEIVED', '2026-10-14'), charge('OVERDUE', '2026-11-14')];

    it('is seven days after the paid period, written as the page is found past due', () => {
      expect(factsOf(page({ status: 'ACTIVE' }), standing, owing, closeOf('2026-11-14'))).toMatchObject({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-11-21') });
    });

    it('suspends the page from the instant it ends, as it is read, and keeps when it ended', () => {
      expect(factsOf(page({ status: 'PAST_DUE' }), standing, owing, new Date(closeOf('2026-11-21').getTime() - 1))).toMatchObject({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-11-21') });
      expect(factsOf(page({ status: 'PAST_DUE' }), standing, owing, closeOf('2026-11-21'))).toMatchObject({ status: 'SUSPENDED', graceEndsAt: closeOf('2026-11-21') });
      expect(factsOf(page({ status: 'SUSPENDED', graceEndsAt: closeOf('2026-11-21') }), standing, owing, noonOf('2026-12-01'))).toMatchObject({ status: 'SUSPENDED', graceEndsAt: closeOf('2026-11-21') });
    });

    it('with no period to count from — its only payment contested — counts from the day it was found, and keeps that day', () => {
      const contested = [charge('CHARGEBACK_REQUESTED', '2026-10-14')];

      expect(factsOf(page({ status: 'ACTIVE' }), standing, contested, noonOf('2026-10-20'))).toMatchObject({ status: 'PAST_DUE', currentPeriodEndsAt: null, graceEndsAt: closeOf('2026-10-27') });
      expect(factsOf(page({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-10-27') }), standing, contested, noonOf('2026-10-25'))).toMatchObject({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-10-27') });
    });

    it('is never moved earlier once written', () => {
      expect(factsOf(page({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-11-25') }), standing, owing, noonOf('2026-11-22'))).toMatchObject({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-11-25') });
    });

    it('is gone once the page pays, or its subscription ends', () => {
      const paid = [charge('RECEIVED', '2026-10-14'), charge('RECEIVED', '2026-11-14')];
      expect(factsOf(page({ status: 'SUSPENDED', graceEndsAt: closeOf('2026-11-21') }), standing, paid, noonOf('2026-11-30'))).toMatchObject({ status: 'ACTIVE', graceEndsAt: null });
      expect(factsOf(page({ status: 'PAST_DUE', graceEndsAt: closeOf('2026-11-21') }), { ...standing, deleted: true }, owing, noonOf('2026-11-18'))).toMatchObject({ status: 'CANCELED', graceEndsAt: null });
    });

    it('is no part of a page in trial or paid for', () => {
      expect(factsOf(page(), standing, [charge('PENDING', '2026-10-14')], noonOf('2026-10-14')).graceEndsAt).toBeNull();
      expect(factsOf(page(), standing, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-14')).graceEndsAt).toBeNull();
    });
  });

  describe('a page that paid and whose payment is contested', () => {
    it('is past due: the money is not the page’s while the bank disputes it', () => {
      expect(factsOf(page({ status: 'ACTIVE' }), standing, [charge('CHARGEBACK_REQUESTED', '2026-10-14')], noonOf('2026-10-20'))).toMatchObject({ status: 'PAST_DUE', currentPeriodEndsAt: null });
    });
  });

  describe('an exempt page', () => {
    it('stays exempt whatever Asaas says, and the rest is written as it is', () => {
      expect(factsOf(page({ status: 'EXEMPT' }), standing, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-20'))).toMatchObject({ status: 'EXEMPT', currentPeriodEndsAt: closeOf('2026-11-14'), nextCheckAt: null });
      expect(factsOf(page({ status: 'EXEMPT' }), { ...standing, deleted: true }, [charge('REFUNDED', '2026-10-14')], noonOf('2026-10-20')).status).toBe('EXEMPT');
    });
  });

  describe('how it was paid', () => {
    it('keeps the brand and the last four digits of a card, and nothing more', () => {
      const card = { brand: 'MASTERCARD', last4: '8829' };
      const read = factsOf(page(), standing, [charge('CONFIRMED', '2026-10-14', { billingType: 'CREDIT_CARD', card })], noonOf('2026-10-14'));

      expect(read).toMatchObject({ paymentMethod: 'CREDIT_CARD', cardBrand: 'MASTERCARD', cardLast4: '8829' });
    });

    it("takes the subscription's card when the charge brought none", () => {
      const read = factsOf(page(), { ...standing, billingType: 'CREDIT_CARD', card: { brand: 'VISA', last4: '1234' } }, [charge('CONFIRMED', '2026-10-14', { billingType: 'CREDIT_CARD' })], noonOf('2026-10-14'));

      expect(read).toMatchObject({ cardBrand: 'VISA', cardLast4: '1234' });
    });

    it('keeps no card for a payment that was not made with one, and none whose brand does not fit its column', () => {
      const subscription = { ...standing, card: { brand: 'VISA', last4: '1234' } };
      expect(factsOf(page({ cardBrand: 'VISA', cardLast4: '1234' }), subscription, [charge('RECEIVED', '2026-10-14', { billingType: 'PIX' })], noonOf('2026-10-14'))).toMatchObject({ paymentMethod: 'PIX', cardBrand: null, cardLast4: null });

      const long = { brand: 'A_BRAND_ASAAS_ADDS_LATER_LONG', last4: '1234' };
      expect(factsOf(page(), standing, [charge('CONFIRMED', '2026-10-14', { billingType: 'CREDIT_CARD', card: long })], noonOf('2026-10-14'))).toMatchObject({ paymentMethod: 'CREDIT_CARD', cardBrand: null, cardLast4: null });
    });

    it('tells the way of the latest money that moved, past one Asaas gives no known word for', () => {
      const charges = [charge('RECEIVED', '2026-10-14', { billingType: 'PIX' }), charge('RECEIVED_IN_CASH', '2026-11-14', { billingType: 'UNDEFINED' })];

      expect(factsOf(page({ status: 'ACTIVE' }), standing, charges, noonOf('2026-11-20')).paymentMethod).toBe('PIX');
    });

    it('keeps what the row knew while no money moved on this subscription', () => {
      const read = factsOf(page({ paymentMethod: 'CREDIT_CARD', cardBrand: 'VISA', cardLast4: '1234' }), standing, [charge('PENDING', '2026-10-14')], noonOf('2026-10-14'));

      expect(read).toMatchObject({ paymentMethod: 'CREDIT_CARD', cardBrand: 'VISA', cardLast4: '1234' });
    });
  });

  describe('the invoice', () => {
    it("is the renewal's as soon as Asaas makes it, while the page is still covered", () => {
      const read = factsOf(page({ status: 'ACTIVE' }), standing, [charge('RECEIVED', '2026-10-14'), charge('PENDING', '2026-11-14')], noonOf('2026-10-20'));

      expect(read).toMatchObject({ status: 'ACTIVE', invoiceUrl: 'https://sandbox.asaas.com/i/2026-11-14' });
    });

    it("is the earliest charge waiting whose period is not over — the one whose payment covers today", () => {
      const charges = [charge('RECEIVED', '2026-10-14'), charge('OVERDUE', '2026-11-14'), charge('PENDING', '2026-12-14')];

      expect(factsOf(page({ status: 'PAST_DUE' }), standing, charges, noonOf('2026-11-20')).invoiceUrl).toBe('https://sandbox.asaas.com/i/2026-11-14');
      expect(factsOf(page({ status: 'PAST_DUE' }), standing, charges, noonOf('2026-12-20')).invoiceUrl).toBe('https://sandbox.asaas.com/i/2026-12-14');
    });

    it('is none for a charge with no https invoice', () => {
      expect(factsOf(page(), standing, [charge('PENDING', '2026-10-14', { invoiceUrl: null })], noonOf('2026-10-14')).invoiceUrl).toBeNull();
    });
  });

  describe('a calendar', () => {
    it("is the subscription's cycle in Asaas's word when the row names none", () => {
      expect(factsOf(page({ cycle: null }), { ...standing, cycle: 'YEARLY' }, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-14')).currentPeriodEndsAt).toEqual(closeOf('2027-10-14'));
    });

    it("is counted from the earliest charge when the row has no first due day", () => {
      expect(factsOf(page({ firstDueDate: null }), standing, [charge('RECEIVED', '2026-10-31')], noonOf('2026-11-01')).currentPeriodEndsAt).toEqual(closeOf('2026-11-30'));
    });

    it('is refused when no cycle can be found, rather than guessed', () => {
      expect(() => factsOf(page({ cycle: null }), { ...standing, cycle: 'WEEKLY' }, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-14'))).toThrow(SubscriptionWithoutCalendar);
      // With no charge there is nothing to place on one.
      expect(factsOf(page({ cycle: null }), { ...standing, cycle: 'WEEKLY' }, [], noonOf('2026-10-14')).status).toBe('TRIALING');
    });
  });

  describe('when the routine looks again', () => {
    const covered = { status: 'ACTIVE' as const, gone: false, covered: true, paidThrough: closeOf('2026-11-14'), waitingSince: null };

    it('never, for a page exempt or whose subscription is gone', () => {
      expect(nextCheckOf({ ...covered, status: 'EXEMPT' }, noonOf('2026-10-20'))).toBeNull();
      expect(nextCheckOf({ ...covered, status: 'CANCELED', gone: true }, noonOf('2026-10-20'))).toBeNull();
    });

    it('at noon of the last day an active page covers, and just after its end', () => {
      expect(nextCheckOf(covered, noonOf('2026-10-20'))).toEqual(noonOf('2026-11-14'));
      expect(nextCheckOf(covered, new Date(noonOf('2026-11-14').getTime() + 1))).toEqual(new Date(closeOf('2026-11-14').getTime() + 60_000));
    });

    it('further and further apart while a charge waits', () => {
      const waiting = { status: 'TRIALING' as const, gone: false, covered: false, paidThrough: null, waitingSince: '2026-10-14' };
      const opened = new Date('2026-10-14T03:00:00.000Z').getTime();
      const after = (ms: number) => new Date(opened + ms);
      const step = (ms: number) => nextCheckOf(waiting, after(ms))!.getTime() - after(ms).getTime();

      expect(step(30 * 60_000)).toBe(10 * 60_000);
      expect(step(5 * 3_600_000)).toBe(3_600_000);
      expect(step(3 * 86_400_000)).toBe(6 * 3_600_000);
      expect(step(30 * 86_400_000)).toBe(86_400_000);
    });

    it('from the end of the paid period for a page past due with no invoice yet', () => {
      const late = { status: 'PAST_DUE' as const, gone: false, covered: false, paidThrough: closeOf('2026-11-14'), waitingSince: null };

      expect(nextCheckOf(late, new Date(closeOf('2026-11-14').getTime() + 60_000))!.getTime() - closeOf('2026-11-14').getTime()).toBe(11 * 60_000);
    });

    it('is what a read answers for a page that just paid', () => {
      expect(factsOf(page(), standing, [charge('RECEIVED', '2026-10-14')], noonOf('2026-10-14')).nextCheckAt).toEqual(noonOf('2026-11-14'));
    });
  });
});
