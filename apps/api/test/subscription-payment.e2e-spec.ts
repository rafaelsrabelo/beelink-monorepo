// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, BillingCycle, Store, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { BillingRoutine } from '../src/modules/billing/billing-routine.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { SubscriptionSync } from '../src/modules/billing/subscription-sync.service.js';
import { AsaasThrottled, AsaasUnreachable } from '../src/shared/asaas/asaas-errors.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
/** Made up. The CPF is the textbook one. */
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

/** The day it is in Brasília, worked out here and not by the API's own functions. */
const today = (): string => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
const plusDays = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
/** The same day `months` later, or that month's last day where it lacks it: Asaas's rule, written out here again. */
function monthsAfter(day: string, months: number): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const counted = month - 1 + months;
  const last = new Date(Date.UTC(year + Math.floor(counted / 12), (counted % 12) + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year + Math.floor(counted / 12), counted % 12, Math.min(date, last))).toISOString().slice(0, 10);
}
/** The midnight in Brasília that closes a day, as the wire writes it. */
const closeOf = (day: string): string => new Date(Date.parse(`${day}T03:00:00.000Z`) + 86_400_000).toISOString();
const MONTHS: Record<BillingCycle, number> = { MONTHLY: 1, SEMIANNUAL: 6, ANNUAL: 12 };

describe("a page's payment, read at bee-link's own Asaas account (BEELINK-221)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let payments: SubscriptionSync;
  let owner: AuthSession;
  const asaas = new FakePlatformAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(asaas));
    prisma = app.get(PrismaService);
    payments = app.get(SubscriptionSync);
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** `session` omitted is an anonymous caller. */
  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function openShop(slug: string, session: AuthSession = owner, name = 'Padaria da Lia'): Promise<Store> {
    const response = await call('POST', '/api/stores', session, { name, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  /** The cycle chosen, and the subscription it made at Asaas. */
  async function choose(cycle: BillingCycle = 'MONTHLY', slug = 'padaria') {
    const response = await call('PUT', `/api/stores/${slug}/subscription`, owner, { cycle });
    if (response.statusCode !== 200) throw new Error(`PUT /subscription answered ${response.statusCode}: ${response.payload}`);
    const row = await rowOf(slug);
    asaas.calls.length = 0;
    return { row, subscriptionId: row.asaasSubscriptionId! };
  }

  const check = (slug = 'padaria', session: AuthSession | null = owner) => call('POST', `/api/stores/${slug}/subscription/check`, session ?? undefined);
  const read = async (slug = 'padaria') => (await call('GET', `/api/stores/${slug}/subscription`, owner)).json<StoreSubscriptionAnswer>().subscription!;
  const rowOf = (slug = 'padaria') => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug } } });
  /** What a page read a while ago looks like: the panel may ask Asaas again. */
  const letTheReadAge = () => prisma.storeSubscription.updateMany({ data: { asaasCheckedAt: new Date(Date.now() - 60_000) } });
  const expectRefusal = (response: { statusCode: number; json: <T>() => T }, statusCode: number, errorCode: string) => {
    expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([statusCode, errorCode]);
  };

  /** A page that chose the monthly plan 45 days ago and paid its first charge; Asaas has made the second, which waits. */
  async function paidAMonthAgo() {
    const { subscriptionId } = await choose('MONTHLY');
    const first = plusDays(today(), -45);
    asaas.charges[0]!.dueDate = first;
    asaas.pay(subscriptionId, 'RECEIVED', { billingType: 'PIX' });
    const second = asaas.charge(subscriptionId, monthsAfter(first, 1));
    await prisma.storeSubscription.updateMany({ data: { firstDueDate: new Date(`${first}T00:00:00.000Z`) } });
    return { subscriptionId, first, second };
  }

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await openShop('padaria');
    const saved = await call('PUT', '/api/billing/account', owner, person);
    if (saved.statusCode !== 200) throw new Error(`PUT /billing/account answered ${saved.statusCode}: ${saved.payload}`);
    asaas.calls.length = 0;
  });

  describe('the panel asking whether it was paid', () => {
    it.each<[BillingCycle]>([['MONTHLY'], ['SEMIANNUAL'], ['ANNUAL']])('makes a page in trial active once Asaas holds its first payment, %s, until the end of the next due day in Brasília', async (cycle) => {
      const { subscriptionId } = await choose(cycle);
      asaas.pay(subscriptionId, 'CONFIRMED', { billingType: 'PIX' });

      const response = await check();

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscription', 'subscriptionCharges']);
      const answer = response.json<StoreSubscriptionAnswer>();
      expect(answer.billingEnforced).toBe(true);
      expect(answer.subscription).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(monthsAfter(today(), MONTHS[cycle])), paymentMethod: 'PIX', invoiceUrl: null, card: null, cycle });
      expect(await read()).toEqual(answer.subscription);
    });

    it('makes a page whose trial ran out active the same way', async () => {
      await prisma.storeSubscription.updateMany({ data: { trialStartedAt: new Date(Date.now() - 10 * 86_400_000), trialEndsAt: new Date(Date.now() - 86_400_000) } });
      expect((await read()).status).toBe('TRIAL_EXPIRED');
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId, 'RECEIVED');

      expect((await check()).json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(monthsAfter(today(), 1)) });
    });

    it('changes nothing while the first charge waits: the page stays in trial, with the invoice to pay', async () => {
      const { row } = await choose('MONTHLY');

      const answer = (await check()).json<StoreSubscriptionAnswer>().subscription!;

      expect(answer).toMatchObject({ status: 'TRIALING', currentPeriodEndsAt: null, paymentMethod: null, invoiceUrl: row.invoiceUrl });
      expect((await rowOf()).asaasCheckedAt).toBeInstanceOf(Date);
    });

    it('asks Asaas once in ten seconds for a page, and answers what was read inside that', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      await check();
      asaas.pay(subscriptionId);

      const again = await check();

      expect(asaas.count('subscription')).toBe(1);
      expect(again.json<StoreSubscriptionAnswer>().subscription!.status).toBe('TRIALING');

      await letTheReadAge();
      expect((await check()).json<StoreSubscriptionAnswer>().subscription!.status).toBe('ACTIVE');
      expect(asaas.count('subscription')).toBe(2);
    });

    it('asks nothing for a page with no subscription at Asaas, and answers as the read does', async () => {
      const response = await check();

      expect(response.statusCode).toBe(200);
      expect(response.json<StoreSubscriptionAnswer>()).toEqual((await call('GET', '/api/stores/padaria/subscription', owner)).json());
      expect(asaas.calls).toEqual([]);
    });

    it("is the page's owner's alone", async () => {
      await choose('MONTHLY');
      const stranger = await signUpAndSignIn(app, newEmail('estranha'));

      expectRefusal(await check('padaria', stranger), 403, 'STORE_FORBIDDEN');
      expectRefusal(await check('nao-existe'), 404, 'STORE_NOT_FOUND');
      expect((await check('padaria', null)).statusCode).toBe(401);
      expect(asaas.calls).toEqual([]);
    });

    it.each([
      ['its own failure', new AsaasUnreachable('Asaas failed (503)')],
      ['a wait it asked for', new AsaasThrottled('Asaas failed (429)', new Date(Date.now() + 60_000))],
    ])('says Asaas did not answer, on %s, and leaves the page as it was', async (_what, failure) => {
      await choose('MONTHLY');
      const before = await rowOf();
      asaas.failing('subscriptionCharges', failure);

      expectRefusal(await check(), 503, 'BILLING_UNREACHABLE');
      expect(await rowOf()).toEqual(before);
    });
  });

  describe('a choice of a cycle that comes upon a payment', () => {
    it("reads it before refusing, so the page's subscription read next shows it paid — and the next choice is refused before Asaas", async () => {
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId, 'RECEIVED', { billingType: 'BOLETO' });

      expectRefusal(await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' }), 409, 'BILLING_SUBSCRIPTION_PAID');

      expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges', 'subscription', 'subscriptionCharges']);
      expect(await read()).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(monthsAfter(today(), 1)), paymentMethod: 'BOLETO' });
      expect((await rowOf()).asaasSubscriptionClaimedUntil).toBeNull();

      asaas.calls.length = 0;
      expectRefusal(await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'ANNUAL' }), 409, 'BILLING_PAGE_ACTIVE');
      expect(asaas.calls).toEqual([]);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
    });

    it('still says it was paid when the payment could not be read, and leaves the page as it was', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId);
      asaas.failing('subscription', new AsaasUnreachable('Asaas failed (503)'));

      expectRefusal(await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' }), 409, 'BILLING_SUBSCRIPTION_PAID');
      expect((await rowOf()).status).toBe('TRIALING');
    });
  });

  describe('the period a payment pays for', () => {
    it('ends with the next due day: past it, unpaid, the page is past due — with the invoice of the charge it owes', async () => {
      const { first, second } = await paidAMonthAgo();

      const answer = (await check()).json<StoreSubscriptionAnswer>().subscription!;

      expect(answer).toMatchObject({ status: 'PAST_DUE', currentPeriodEndsAt: closeOf(monthsAfter(first, 1)), invoiceUrl: second.invoiceUrl, paymentMethod: 'PIX' });
    });

    it('brings a page past due back to active once the charge it owes is paid', async () => {
      const { first, second } = await paidAMonthAgo();
      await check();
      second.status = 'CONFIRMED';
      await letTheReadAge();

      expect((await check()).json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(monthsAfter(first, 2)), invoiceUrl: null });
    });

    it('gives nothing more to a payment made days after its due day: the calendar is Asaas\'s', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      const due = plusDays(today(), -3);
      asaas.charges[0]!.dueDate = due;
      await prisma.storeSubscription.updateMany({ data: { firstDueDate: new Date(`${due}T00:00:00.000Z`) } });
      asaas.pay(subscriptionId, 'RECEIVED', { paymentDate: today() });

      expect((await check()).json<StoreSubscriptionAnswer>().subscription!.currentPeriodEndsAt).toBe(closeOf(monthsAfter(due, 1)));
    });

    it('leaves a suspended page to the lock that suspended it, until it pays', async () => {
      const { second } = await paidAMonthAgo();
      await prisma.storeSubscription.updateMany({ data: { status: 'SUSPENDED' } });

      expect((await check()).json<StoreSubscriptionAnswer>().subscription!.status).toBe('SUSPENDED');

      second.status = 'RECEIVED';
      await letTheReadAge();
      expect((await check()).json<StoreSubscriptionAnswer>().subscription!.status).toBe('ACTIVE');
    });

    it('keeps an exempt page exempt, whatever Asaas says', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      await prisma.storeSubscription.updateMany({ data: { status: 'EXEMPT' } });
      asaas.pay(subscriptionId);

      expect((await check()).json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'EXEMPT', currentPeriodEndsAt: closeOf(monthsAfter(today(), 1)) });
      expect((await rowOf()).nextCheckAt).toBeNull();
    });
  });

  describe('money given back, and a subscription removed', () => {
    it('cancels a page whose payment was given back, with no paid period left', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      const paid = asaas.pay(subscriptionId, 'CONFIRMED', { billingType: 'PIX' });
      expect((await check()).json<StoreSubscriptionAnswer>().subscription!.status).toBe('ACTIVE');

      asaas.refund(paid.id);
      await letTheReadAge();
      const answer = (await check()).json<StoreSubscriptionAnswer>().subscription!;

      expect(answer).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: null, invoiceUrl: null, paymentMethod: 'PIX' });
      // Asaas does not cancel what it gives back: nothing here removes it either.
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([subscriptionId]);
      expect(asaas.count('removeSubscription')).toBe(0);
    });

    it('cancels a page that paid once its subscription is removed at Asaas, with what it paid for running to its end', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId, 'RECEIVED');
      await check();

      await asaas.removeSubscription(subscriptionId);
      await letTheReadAge();
      const answer = (await check()).json<StoreSubscriptionAnswer>().subscription!;

      expect(answer).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: closeOf(monthsAfter(today(), 1)), invoiceUrl: null });
      expect((await rowOf()).nextCheckAt).toBeNull();
    });

    it("cancels every page of an account whose customer was removed at Asaas's own panel", async () => {
      await openShop('confeitaria', owner, 'Confeitaria da Lia');
      const padaria = await choose('MONTHLY', 'padaria');
      const confeitaria = await choose('ANNUAL', 'confeitaria');
      asaas.pay(padaria.subscriptionId);
      asaas.pay(confeitaria.subscriptionId);
      await check('padaria');
      await check('confeitaria');

      asaas.remove(asaas.standing[0]!.id);
      await letTheReadAge();

      expect((await check('padaria')).json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: closeOf(monthsAfter(today(), 1)) });
      expect((await check('confeitaria')).json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'CANCELED', currentPeriodEndsAt: closeOf(monthsAfter(today(), 12)) });
    });

    it('cancels nothing of a page that never paid: its trial goes on, the removed invoice is gone, and it may choose again', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      await asaas.removeSubscription(subscriptionId);

      expect((await check()).json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'TRIALING', invoiceUrl: null, currentPeriodEndsAt: null });

      expect((await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' })).statusCode).toBe(200);
      expect(asaas.standingSubscriptions).toHaveLength(1);
    });
  });

  describe('a change of cycle in course', () => {
    it("writes nothing of a subscription the page stopped naming while it was read: that payment is not the page's", async () => {
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId);
      // A choice finishes a change of cycle between the read and the write.
      asaas.before('subscriptionCharges', () => prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: 'sub_the_new_one' } }));

      expect(await payments.sync((await rowOf()).storeId)).toBe('STALE');

      expect(await rowOf()).toMatchObject({ status: 'TRIALING', asaasSubscriptionId: 'sub_the_new_one', currentPeriodEndsAt: null, asaasCheckedAt: null });
    });

    it('writes nothing while a choice holds the page, and writes once it let go', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId);
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: new Date(Date.now() + 60_000) } });
      const { storeId } = await rowOf();

      expect(await payments.sync(storeId)).toBe('BUSY');
      expect((await rowOf()).status).toBe('TRIALING');

      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: null } });
      expect(await payments.sync(storeId)).toBe('WRITTEN');
      expect((await rowOf()).status).toBe('ACTIVE');
    });

    it('never writes an older read over a newer one, whichever finishes last', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      const { storeId } = await rowOf();
      const listing = asaas.subscriptionCharges.bind(asaas);
      let release!: () => void;
      const held = new Promise<void>((go) => (release = go));
      // The first read lists the charges while the first one still waits, and is held before it writes.
      vi.spyOn(asaas, 'subscriptionCharges').mockImplementationOnce(async (id: string) => {
        const charges = await listing(id);
        await held;
        return charges;
      });

      const older = payments.sync(storeId);
      await vi.waitFor(() => expect(asaas.count('subscriptionCharges')).toBe(1));
      asaas.pay(subscriptionId);
      expect(await payments.sync(storeId)).toBe('WRITTEN');
      release();

      expect(await older).toBe('STALE');
      expect(await rowOf()).toMatchObject({ status: 'ACTIVE', invoiceUrl: null });
    });
  });

  describe('the routine', () => {
    it('finds a payment whose event was lost, at the turn the choice gave the page', async () => {
      const { subscriptionId, row } = await choose('MONTHLY');
      expect(row.nextCheckAt!.getTime()).toBeGreaterThan(Date.now() + 9 * 60_000);
      asaas.pay(subscriptionId);

      await app.get(BillingRoutine).pass(new Date(row.nextCheckAt!.getTime() + 1_000));

      expect((await rowOf()).status).toBe('ACTIVE');
      expect(asaas.calls).toEqual(['subscription', 'subscriptionCharges']);
    });

    it('leaves a page alone before its turn', async () => {
      await choose('MONTHLY');

      await app.get(BillingRoutine).pass(new Date());

      expect(asaas.calls).toEqual([]);
    });

    it('looks at an active page again at noon of the last day it covers', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      asaas.pay(subscriptionId);
      await check();

      expect((await rowOf()).nextCheckAt).toEqual(new Date(Date.parse(closeOf(monthsAfter(today(), 1))) - 12 * 3_600_000));
    });

    it('pushes a page’s turn before asking, so one Asaas does not answer for waits its turn again', async () => {
      const { row } = await choose('MONTHLY');
      const now = new Date(row.nextCheckAt!.getTime() + 1_000);
      asaas.failing('subscription', new AsaasUnreachable('Asaas failed (503)'));

      expect(await payments.checkDue(now)).toBe(1);
      expect((await rowOf()).nextCheckAt).toEqual(new Date(now.getTime() + 10 * 60_000));
      expect(await payments.checkDue(now)).toBe(0);
    });

    it('ends its pass when Asaas asks to wait: the next page is not asked', async () => {
      await openShop('confeitaria', owner, 'Confeitaria da Lia');
      await choose('MONTHLY', 'padaria');
      await choose('MONTHLY', 'confeitaria');
      const now = new Date(Date.now() + 11 * 60_000);
      asaas.failing('subscription', new AsaasThrottled('Asaas failed (429)', new Date(Date.now() + 60_000)));

      expect(await payments.checkDue(now)).toBe(1);
      expect(asaas.count('subscription')).toBe(1);
    });

    it('never looks at a page whose subscription is gone', async () => {
      const { subscriptionId } = await choose('MONTHLY');
      await asaas.removeSubscription(subscriptionId);
      await check();

      expect((await rowOf()).nextCheckAt).toBeNull();
    });
  });
});
