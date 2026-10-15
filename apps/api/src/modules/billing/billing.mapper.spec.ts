// Types
import type { PlanModel } from '../../generated/prisma/models.js';
import type { StoreSubscriptionRow } from './billing.mapper.js';

// App
import { priceOf, toBillingAccount, toPlan, toStoreSubscription } from './billing.mapper.js';

const beelink = {
  id: '0199a0f1-0000-7000-8000-0000000000b1',
  slug: 'beelink',
  name: 'Beelink',
  active: true,
  monthlyPriceCents: 5990,
  semiannualPriceCents: 32340,
  annualPriceCents: 57480,
  createdAt: new Date('2026-10-13T16:00:00.000Z'),
  updatedAt: new Date('2026-10-13T16:00:00.000Z'),
} satisfies PlanModel;

const withBeelia = { ...beelink, slug: 'beelink-beelia', name: 'Beelink + Beelia', monthlyPriceCents: 8990, semiannualPriceCents: null, annualPriceCents: null } satisfies PlanModel;

/** A page created at 13:24 in Brasília on 13/10/2026, as the write that creates it leaves its row. */
const trialing = {
  id: '0199a0f1-0000-7000-8000-0000000000c1',
  storeId: '0199a0f1-0000-7000-8000-000000000001',
  status: 'TRIALING',
  trialStartedAt: new Date('2026-10-13T16:24:00.000Z'),
  trialEndsAt: new Date('2026-10-21T03:00:00.000Z'),
  planId: null,
  plan: null,
  cycle: null,
  priceCents: null,
  currentPeriodEndsAt: null,
  graceEndsAt: null,
  cancelRequestedAt: null,
  freePeriodEndsAt: null,
  asaasSubscriptionId: null,
  asaasSubscriptionClaimedUntil: null,
  firstDueDate: null,
  paymentMethod: null,
  invoiceUrl: null,
  cardBrand: null,
  cardLast4: null,
  asaasCheckedAt: null,
  nextCheckAt: null,
  createdAt: new Date('2026-10-13T16:24:00.000Z'),
  updatedAt: new Date('2026-10-13T16:24:00.000Z'),
} satisfies StoreSubscriptionRow;

describe('a plan, as it is listed', () => {
  it('says each cycle it is sold in, shortest first, at the whole cycle’s price', () => {
    expect(toPlan(beelink)).toEqual({
      id: beelink.id,
      slug: 'beelink',
      name: 'Beelink',
      cycles: [
        { cycle: 'MONTHLY', months: 1, priceCents: 5990 },
        { cycle: 'SEMIANNUAL', months: 6, priceCents: 32340 },
        { cycle: 'ANNUAL', months: 12, priceCents: 57480 },
      ],
    });
  });

  it('leaves out a cycle it is not sold in', () => {
    expect(toPlan(withBeelia).cycles).toEqual([{ cycle: 'MONTHLY', months: 1, priceCents: 8990 }]);
    expect(priceOf(withBeelia, 'ANNUAL')).toBeNull();
    expect(priceOf(beelink, 'ANNUAL')).toBe(57480);
  });

  it('says nothing of the switch or the dates', () => {
    expect(Object.keys(toPlan(beelink)).sort()).toEqual(['cycles', 'id', 'name', 'slug']);
  });
});

describe('a subscription, as its page’s owner reads it', () => {
  it('reads a page in trial: the last day and the days left on Brasília’s calendar, and nothing chosen', () => {
    expect(toStoreSubscription(trialing, new Date('2026-10-15T12:00:00.000Z'), false)).toEqual({
      id: trialing.id,
      status: 'TRIALING',
      trialStartedAt: '2026-10-13T16:24:00.000Z',
      trialEndsAt: '2026-10-21T03:00:00.000Z',
      trialLastDay: '2026-10-20',
      trialDaysLeft: 5,
      plan: null,
      cycle: null,
      priceCents: null,
      currentPeriodEndsAt: null,
      cancelRequestedAt: null,
      freePeriodEndsAt: null,
      paymentMethod: null,
      invoiceUrl: null,
      card: null,
      graceEndsAt: null,
      lock: null,
    });
  });

  it('reads the trial as expired from the instant it ends, the row still saying TRIALING', () => {
    expect(toStoreSubscription(trialing, new Date('2026-10-21T02:59:59.999Z'), false)).toMatchObject({ status: 'TRIALING', trialDaysLeft: 0 });
    expect(toStoreSubscription(trialing, new Date('2026-10-21T03:00:00.000Z'), false)).toMatchObject({ status: 'TRIAL_EXPIRED', trialDaysLeft: 0 });
  });

  it('carries no id of Asaas’s, nor the store’s, nor the first due day', () => {
    const paying = { ...trialing, status: 'ACTIVE', asaasSubscriptionId: 'sub_000000000001', firstDueDate: new Date('2026-10-13T00:00:00.000Z') } satisfies StoreSubscriptionRow;

    const read = toStoreSubscription(paying, new Date('2026-10-15T12:00:00.000Z'), false);

    expect(JSON.stringify(read)).not.toMatch(/sub_000000000001|asaas|firstDueDate|storeId/);
  });

  it('reads what a paying page’s row holds', () => {
    const paying = {
      ...trialing,
      status: 'ACTIVE',
      planId: beelink.id,
      plan: beelink,
      cycle: 'ANNUAL',
      priceCents: 57480,
      currentPeriodEndsAt: new Date('2027-10-14T03:00:00.000Z'),
      cancelRequestedAt: new Date('2026-12-01T12:00:00.000Z'),
      freePeriodEndsAt: new Date('2026-11-14T03:00:00.000Z'),
      paymentMethod: 'PIX',
      invoiceUrl: 'https://sandbox.asaas.com/i/000000000001',
    } satisfies StoreSubscriptionRow;

    expect(toStoreSubscription(paying, new Date('2026-12-02T12:00:00.000Z'), false)).toMatchObject({
      status: 'ACTIVE',
      // The plan's reference alone: its prices are the catalogue's to say, and `priceCents` this page's.
      plan: { id: beelink.id, slug: 'beelink', name: 'Beelink' },
      cycle: 'ANNUAL',
      priceCents: 57480,
      currentPeriodEndsAt: '2027-10-14T03:00:00.000Z',
      cancelRequestedAt: '2026-12-01T12:00:00.000Z',
      freePeriodEndsAt: '2026-11-14T03:00:00.000Z',
      paymentMethod: 'PIX',
      invoiceUrl: 'https://sandbox.asaas.com/i/000000000001',
      card: null,
    });
    expect(Object.keys(toStoreSubscription(paying, new Date(), false).plan ?? {}).sort()).toEqual(['id', 'name', 'slug']);
  });

  it('reads an active page as past due once its paid period is over, the row still saying ACTIVE (BEELINK-221)', () => {
    const paid = { ...trialing, status: 'ACTIVE', currentPeriodEndsAt: new Date('2026-11-15T03:00:00.000Z') } satisfies StoreSubscriptionRow;

    expect(toStoreSubscription(paid, new Date('2026-11-15T02:59:59.999Z'), false).status).toBe('ACTIVE');
    expect(toStoreSubscription(paid, new Date('2026-11-15T03:00:00.000Z'), false)).toMatchObject({ status: 'PAST_DUE', currentPeriodEndsAt: '2026-11-15T03:00:00.000Z' });
  });

  it('says why a page is locked where pages lock, and never where they do not (BEELINK-223)', () => {
    const ended = new Date('2026-10-21T03:00:00.000Z');

    expect(toStoreSubscription(trialing, new Date(ended.getTime() - 1), true).lock).toBeNull();
    expect(toStoreSubscription(trialing, ended, true)).toMatchObject({ status: 'TRIAL_EXPIRED', lock: 'TRIAL_EXPIRED' });
    expect(toStoreSubscription(trialing, ended, false)).toMatchObject({ status: 'TRIAL_EXPIRED', lock: null });
    expect(toStoreSubscription({ ...trialing, status: 'EXEMPT' }, ended, true).lock).toBeNull();
    expect(toStoreSubscription({ ...trialing, freePeriodEndsAt: new Date('2026-11-14T03:00:00.000Z') }, ended, true).lock).toBeNull();
  });

  it("says when a page past due locks — as the lock counts it, written or not — and suspends it then (BEELINK-223)", () => {
    const paid = { ...trialing, status: 'ACTIVE', currentPeriodEndsAt: new Date('2026-11-15T03:00:00.000Z') } satisfies StoreSubscriptionRow;

    expect(toStoreSubscription(paid, new Date('2026-11-10T12:00:00.000Z'), true)).toMatchObject({ status: 'ACTIVE', graceEndsAt: null, lock: null });
    expect(toStoreSubscription(paid, new Date('2026-11-18T12:00:00.000Z'), true)).toMatchObject({ status: 'PAST_DUE', graceEndsAt: '2026-11-22T03:00:00.000Z', lock: null });
    expect(toStoreSubscription(paid, new Date('2026-11-22T03:00:00.000Z'), true)).toMatchObject({ status: 'SUSPENDED', graceEndsAt: '2026-11-22T03:00:00.000Z', lock: 'SUSPENDED' });

    const written = { ...paid, status: 'PAST_DUE', graceEndsAt: new Date('2026-11-25T03:00:00.000Z') } satisfies StoreSubscriptionRow;
    expect(toStoreSubscription(written, new Date('2026-11-23T12:00:00.000Z'), true)).toMatchObject({ status: 'PAST_DUE', graceEndsAt: '2026-11-25T03:00:00.000Z', lock: null });
  });

  it('tells of a card only its brand and its last four digits', () => {
    const card = { ...trialing, status: 'ACTIVE', paymentMethod: 'CREDIT_CARD', cardBrand: 'MASTERCARD', cardLast4: '8829' } satisfies StoreSubscriptionRow;

    expect(toStoreSubscription(card, new Date(), false).card).toEqual({ brand: 'MASTERCARD', last4: '8829' });
  });
});

describe("an account's billing data, as its owner reads it (BEELINK-291)", () => {
  const synced = { name: 'Zuleica Tavares', document: '52998224725', asaasCustomerId: 'cus_000009458155', asaasCustomerSyncedAt: new Date('2026-10-13T18:00:00.000Z') };

  it('never answers the document whole: a CPF and a CNPJ each by their own mask', () => {
    expect(toBillingAccount(synced)).toEqual({ name: 'Zuleica Tavares', document: '***.982.247-**', documentType: 'CPF', customerReady: true });
    expect(toBillingAccount({ ...synced, name: 'Lessari Moda LTDA', document: '11222333000181' })).toEqual({ name: 'Lessari Moda LTDA', document: '**.222.333/0001-**', documentType: 'CNPJ', customerReady: true });
    expect(toBillingAccount({ ...synced, document: '12ABC34501DE35' })).toMatchObject({ document: '**.ABC.345/01DE-**', documentType: 'CNPJ' });
  });

  it('answers nothing at all of a document the mask does not know the shape of', () => {
    expect(toBillingAccount({ ...synced, document: '529982247' }).document).toBe('');
  });

  it('says the customer is ready only when Asaas holds it with what the row says', () => {
    expect(toBillingAccount({ ...synced, asaasCustomerSyncedAt: null }).customerReady).toBe(false);
    expect(toBillingAccount({ ...synced, asaasCustomerId: null }).customerReady).toBe(false);
    expect(toBillingAccount({ ...synced, asaasCustomerId: null, asaasCustomerSyncedAt: null }).customerReady).toBe(false);
  });

  it('answers nothing of Asaas: no id, no date, no claim', () => {
    expect(Object.keys(toBillingAccount(synced)).sort()).toEqual(['customerReady', 'document', 'documentType', 'name']);
  });
});
