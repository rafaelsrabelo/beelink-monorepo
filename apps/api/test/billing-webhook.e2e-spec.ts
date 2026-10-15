// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession } from '@harness-monorepo/contracts';

// App
import { BillingEvents } from '../src/modules/billing/billing-events.service.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { AsaasThrottled, AsaasUnreachable } from '../src/shared/asaas/asaas-errors.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** Made up, in the shape `openssl rand -base64 32` gives — and set as this deployment's before anything reads the environment. */
const TOKEN = vi.hoisted(() => {
  const token = 'nX0bq3l8V7mYkU2sA9cR4tE6wZ1pH5jD0fG8iK3oL2M=';
  process.env.BILLING_ENFORCED = 'true';
  process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = token;
  return token;
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
const WEBHOOK = '/api/billing/asaas/webhook';
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

describe("bee-link's own Asaas webhook (BEELINK-221)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: BillingEvents;
  let owner: AuthSession;
  const asaas = new FakePlatformAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(asaas));
    prisma = app.get(PrismaService);
    events = app.get(BillingEvents);
  });

  afterAll(async () => {
    await events.settled();
    await app.close();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  /** Posted as Asaas posts — the token in `asaas-access-token`, none when null — answered, and whatever it led to finished. */
  async function deliver(body: object | string, token: string | null = TOKEN) {
    const response = await app.inject({ method: 'POST', url: WEBHOOK, headers: { 'content-type': 'application/json', ...(token === null ? {} : { 'asaas-access-token': token }) }, payload: typeof body === 'string' ? body : JSON.stringify(body) });
    await events.settled();
    return response;
  }

  /** A charge's event as Asaas sends one, with more in it than bee-link reads. */
  const paymentEvent = (id: string, event: string, payment: object) => ({ id, event, dateCreated: '2026-10-14 23:00:00', account: { id: 'acc-1', ownerId: null }, payment: { object: 'payment', ...payment }, somethingNew: { nested: true } });
  /** The same of a subscription's event. */
  const subscriptionEvent = (id: string, event: string, subscription: object) => ({ id, event, dateCreated: '2026-10-14 23:00:00', subscription: { object: 'subscription', ...subscription } });

  const rowOf = () => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug: 'padaria' } } });
  const eventRows = () => prisma.billingEvent.findMany({ orderBy: { createdAt: 'asc' } });

  /** The page chose the monthly plan: its subscription and first charge stand at Asaas, unpaid. */
  async function chosen() {
    const response = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' });
    if (response.statusCode !== 200) throw new Error(`PUT /subscription answered ${response.statusCode}: ${response.payload}`);
    const row = await rowOf();
    asaas.calls.length = 0;
    return { row, subscriptionId: row.asaasSubscriptionId!, reference: `beelink-subscription-${row.id}`, charge: asaas.charges.at(-1)! };
  }

  beforeEach(async () => {
    await events.settled();
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    const opened = await call('POST', '/api/stores', owner, { name: 'Padaria da Lia', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    if (opened.statusCode !== 201) throw new Error(`POST /stores answered ${opened.statusCode}`);
    await call('PUT', '/api/billing/account', owner, person);
    asaas.calls.length = 0;
  });

  describe('who may post', () => {
    it("refuses a delivery without this deployment's token, and writes nothing and asks nothing", async () => {
      const { charge, reference } = await chosen();
      asaas.pay(charge.subscriptionId!);
      const body = paymentEvent('evt_1', 'PAYMENT_CONFIRMED', { id: charge.id, subscription: charge.subscriptionId, externalReference: reference });

      for (const token of [null, '', 'x'.repeat(44), `${TOKEN}x`, TOKEN.slice(0, -1), TOKEN.toLowerCase()]) {
        const response = await deliver(body, token);
        expect(response.statusCode).toBe(401);
        expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_WEBHOOK_TOKEN_INVALID');
        // The answer says nothing of the token it wanted.
        expect(response.payload).not.toContain(TOKEN);
      }
      expect(await eventRows()).toEqual([]);
      expect(asaas.calls).toEqual([]);
      expect((await rowOf()).status).toBe('TRIALING');
    });
  });

  describe('receiving', () => {
    it("makes a page active on a payment's event, by what the account says", async () => {
      const { charge, reference } = await chosen();
      asaas.pay(charge.subscriptionId!, 'RECEIVED', { billingType: 'PIX' });

      const response = await deliver(paymentEvent('evt_1', 'PAYMENT_RECEIVED', { id: charge.id, subscription: charge.subscriptionId, externalReference: reference, status: 'RECEIVED', value: 59.9 }));

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ result: 'RECORDED' });
      expect(asaas.calls).toEqual(['subscription', 'subscriptionCharges']);
      expect(await rowOf()).toMatchObject({ status: 'ACTIVE', paymentMethod: 'PIX', invoiceUrl: null });
      const [row] = await eventRows();
      expect(row).toMatchObject({ eventId: 'evt_1', event: 'PAYMENT_RECEIVED', subscriptionId: (await rowOf()).id, outcome: 'APPLIED', attempts: 1, lastError: null });
      expect(row!.processedAt).toBeInstanceOf(Date);
    });

    it('never takes the body for the fact: an event that says paid of a charge the account holds waiting changes nothing', async () => {
      const { charge, reference } = await chosen();

      const response = await deliver(paymentEvent('evt_forged', 'PAYMENT_RECEIVED', { id: charge.id, subscription: charge.subscriptionId, externalReference: reference, status: 'RECEIVED' }));

      expect(response.json()).toEqual({ result: 'RECORDED' });
      expect(await rowOf()).toMatchObject({ status: 'TRIALING', currentPeriodEndsAt: null, invoiceUrl: charge.invoiceUrl });
    });

    it('answers a second delivery of the same event with 200 and does nothing', async () => {
      const { charge, reference } = await chosen();
      asaas.pay(charge.subscriptionId!);
      const body = paymentEvent('evt_1', 'PAYMENT_CONFIRMED', { id: charge.id, subscription: charge.subscriptionId, externalReference: reference });
      await deliver(body);
      const written = await rowOf();
      const asked = asaas.calls.length;

      const again = await deliver(body);

      expect(again.statusCode).toBe(200);
      expect(again.json()).toEqual({ result: 'DUPLICATE' });
      expect(asaas.calls.length).toBe(asked);
      expect(await eventRows()).toHaveLength(1);
      expect(await rowOf()).toEqual(written);
    });

    it('takes nothing back for events that come late or out of order', async () => {
      const { charge, reference } = await chosen();
      asaas.pay(charge.subscriptionId!);
      await deliver(paymentEvent('evt_paid', 'PAYMENT_CONFIRMED', { id: charge.id, subscription: charge.subscriptionId, externalReference: reference }));
      const active = await rowOf();
      expect(active.status).toBe('ACTIVE');

      for (const [id, event, status] of [['evt_made', 'PAYMENT_CREATED', 'PENDING'], ['evt_late', 'PAYMENT_OVERDUE', 'OVERDUE'], ['evt_updated', 'PAYMENT_UPDATED', 'PENDING']] as const) {
        expect((await deliver(paymentEvent(id, event, { id: charge.id, subscription: charge.subscriptionId, externalReference: reference, status }))).json()).toEqual({ result: 'RECORDED' });
      }

      expect(await rowOf()).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: active.currentPeriodEndsAt });
    });

    it("knows the page by Asaas's id of its subscription when the event carries no reference — and a subscription's own event by its", async () => {
      const { charge, subscriptionId, reference } = await chosen();
      asaas.pay(subscriptionId);

      expect((await deliver(paymentEvent('evt_1', 'PAYMENT_CONFIRMED', { id: charge.id, subscription: subscriptionId }))).json()).toEqual({ result: 'RECORDED' });
      expect((await rowOf()).status).toBe('ACTIVE');

      await asaas.removeSubscription(subscriptionId);
      expect((await deliver(subscriptionEvent('evt_2', 'SUBSCRIPTION_DELETED', { id: subscriptionId, externalReference: reference, deleted: true, status: 'INACTIVE' }))).json()).toEqual({ result: 'RECORDED' });
      expect((await rowOf()).status).toBe('CANCELED');
    });

    it("works an event of a subscription the page no longer has by reading the one it has: nothing of the old one is applied", async () => {
      const { charge: old, reference } = await chosen();
      const changed = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'ANNUAL' });
      expect(changed.statusCode).toBe(200);
      // The old one's charge, removed with it, said paid in an event that arrives now.
      const response = await deliver(paymentEvent('evt_old', 'PAYMENT_CONFIRMED', { id: old.id, subscription: old.subscriptionId, externalReference: reference, status: 'CONFIRMED' }));

      expect(response.json()).toEqual({ result: 'RECORDED' });
      const row = await rowOf();
      expect(row.asaasSubscriptionId).not.toBe(old.subscriptionId);
      expect(row).toMatchObject({ status: 'TRIALING', cycle: 'ANNUAL', currentPeriodEndsAt: null });
      expect(asaas.calls.filter((made) => made === 'subscription')).toHaveLength(1);
    });
  });

  describe('what is not bee-link’s', () => {
    it("answers 200 and leaves alone an event of the account that is about no page — another product's charge, another reference, a page this deployment does not have", async () => {
      const { reference } = await chosen();

      const bodies = [
        paymentEvent('evt_other_product', 'PAYMENT_RECEIVED', { id: 'pay_other', externalReference: 'pedido-4711' }),
        paymentEvent('evt_no_reference', 'PAYMENT_RECEIVED', { id: 'pay_loose' }),
        paymentEvent('evt_other_row', 'PAYMENT_RECEIVED', { id: 'pay_x', externalReference: 'beelink-subscription-0199a0f1-0000-7000-8000-00000000dead' }),
        // bee-link's reference is its own, lower case: Asaas's search ignores case, and this does not.
        paymentEvent('evt_upper_case', 'PAYMENT_RECEIVED', { id: 'pay_y', externalReference: reference.toUpperCase() }),
        subscriptionEvent('evt_other_subscription', 'SUBSCRIPTION_DELETED', { id: 'sub_someone_else' }),
        { id: 'evt_access', event: 'ACCESS_TOKEN_DISABLED' },
        'not json at all',
      ];
      for (const body of bodies) {
        const response = await deliver(body);
        expect(response.statusCode).toBe(typeof body === 'string' ? 400 : 200);
        if (typeof body !== 'string') expect(response.json()).toEqual({ result: 'IGNORED' });
      }

      expect(asaas.calls).toEqual([]);
      const rows = await eventRows();
      expect(rows).toHaveLength(6);
      for (const row of rows) expect(row).toMatchObject({ subscriptionId: null, outcome: 'IGNORED', attempts: 0 });
    });

    it('keeps an event that came with no id by its bytes, so a second delivery is told apart', async () => {
      const { charge, reference } = await chosen();
      const body = JSON.stringify({ event: 'PAYMENT_CREATED', payment: { id: charge.id, externalReference: reference } });

      expect((await deliver(body)).json()).toEqual({ result: 'RECORDED' });
      expect((await deliver(body)).json()).toEqual({ result: 'DUPLICATE' });
      expect((await eventRows())[0]!.eventId).toMatch(/^sha256:[0-9a-f]{64}$/);
    });
  });

  describe('working what was written', () => {
    it('waits for a choice of a cycle that holds the page, and works the event once it let go', async () => {
      const { charge, reference } = await chosen();
      asaas.pay(charge.subscriptionId!);
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: new Date(Date.now() + 60_000) } });

      await deliver(paymentEvent('evt_1', 'PAYMENT_CONFIRMED', { id: charge.id, externalReference: reference }));

      expect((await rowOf()).status).toBe('TRIALING');
      const [waiting] = await eventRows();
      expect(waiting).toMatchObject({ processedAt: null, outcome: null, attempts: 1 });
      expect(waiting!.lastError).toMatch(/choice of a cycle/);
      expect(waiting!.nextAttemptAt.getTime()).toBeGreaterThan(Date.now() + 50_000);

      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: null } });
      await prisma.billingEvent.updateMany({ data: { nextAttemptAt: new Date(Date.now() - 1_000) } });
      events.dispatch();
      await events.settled();

      expect((await rowOf()).status).toBe('ACTIVE');
      expect((await eventRows())[0]).toMatchObject({ outcome: 'APPLIED', attempts: 2, lastError: null });
    });

    it('reads a page once for every event of it a sweep finds', async () => {
      const { charge, row } = await chosen();
      asaas.pay(charge.subscriptionId!);
      await prisma.billingEvent.createMany({ data: ['evt_a', 'evt_b', 'evt_c'].map((eventId) => ({ eventId, event: 'PAYMENT_UPDATED', subscriptionId: row.id })) });

      events.dispatch();
      await events.settled();

      expect(asaas.count('subscription')).toBe(1);
      expect((await eventRows()).map((row) => row.outcome)).toEqual(['APPLIED', 'APPLIED', 'APPLIED']);
      expect((await rowOf()).status).toBe('ACTIVE');
    });

    it('holds every event of the sweep until the time Asaas named when it asks to wait — the ones not worked without spending a try', async () => {
      const { id } = (await chosen()).row;
      await prisma.billingEvent.createMany({ data: [{ eventId: 'evt_a', event: 'PAYMENT_UPDATED', subscriptionId: id, createdAt: new Date(Date.now() - 2_000) }, { eventId: 'evt_b', event: 'PAYMENT_UPDATED', subscriptionId: id }] });
      const retryAt = new Date(Date.now() + 30 * 60_000);
      asaas.failing('subscription', new AsaasThrottled('Asaas failed (429)', retryAt));

      events.dispatch();
      await events.settled();

      // Whichever of the two the sweep came to first is the one that spent a try.
      const rows = (await eventRows()).sort((a, b) => b.attempts - a.attempts);
      expect(rows).toMatchObject([
        { processedAt: null, attempts: 1, nextAttemptAt: retryAt, lastError: 'Asaas failed (429)' },
        { processedAt: null, attempts: 0, nextAttemptAt: retryAt, lastError: null },
      ]);
      expect(asaas.count('subscription')).toBe(1);
    });

    it('gives an event up after its last try, which loses no payment: the routine reads the page anyway', async () => {
      const { id } = (await chosen()).row;
      await prisma.billingEvent.create({ data: { eventId: 'evt_a', event: 'PAYMENT_UPDATED', subscriptionId: id, attempts: 7 } });
      asaas.failing('subscription', new AsaasUnreachable('Asaas failed (503)'));

      events.dispatch();
      await events.settled();

      expect((await eventRows())[0]).toMatchObject({ outcome: 'GIVEN_UP', attempts: 8, lastError: 'Asaas failed (503)' });
      expect((await eventRows())[0]!.processedAt).toBeInstanceOf(Date);
      expect((await rowOf()).nextCheckAt).not.toBeNull();
    });

    it('lets go of the events done a month ago, and keeps the rest', async () => {
      const old = new Date(Date.now() - 31 * 86_400_000);
      await prisma.billingEvent.createMany({
        data: [
          { eventId: 'evt_old', event: 'PAYMENT_UPDATED', outcome: 'APPLIED', processedAt: old },
          { eventId: 'evt_recent', event: 'PAYMENT_UPDATED', outcome: 'IGNORED', processedAt: new Date() },
          { eventId: 'evt_waiting', event: 'PAYMENT_UPDATED' },
        ],
      });

      expect(await events.prune(new Date())).toBe(1);
      expect((await eventRows()).map((row) => row.eventId).sort()).toEqual(['evt_recent', 'evt_waiting']);
    });
  });
});
