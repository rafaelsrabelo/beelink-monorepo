// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, BillingCycle, Store, StoreSubscriptionAnswer, SubscriptionChoice } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../src/shared/asaas/asaas-errors.js';
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

/** The file `prisma db seed` runs on every deploy: the prices this suite expects are the ones it holds, read from the table. */
const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');

const ACCOUNT = '/api/billing/account';
/** Made up. The CPF is the textbook one. */
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

/** The day it is in Brasília, worked out here and not by the API's own function. */
const today = (): string => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);

describe("a page's subscription at bee-link's own Asaas account, by the cycle its shopkeeper chooses (BEELINK-292)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  const asaas = new FakePlatformAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(asaas));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
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

  /** `session` null is an anonymous caller. */
  const choose = (cycle: unknown = 'MONTHLY', session: AuthSession | null = owner, slug = 'padaria') => call('PUT', `/api/stores/${slug}/subscription`, session ?? undefined, { cycle });
  const rowOf = (slug = 'padaria') => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug } } });
  const referenceOf = async (slug = 'padaria') => `beelink-subscription-${(await rowOf(slug)).id}`;
  const accountOf = (session: AuthSession = owner) => prisma.billingAccount.findUniqueOrThrow({ where: { userId: session.user.id } });
  const priceOf = async (cycle: BillingCycle) => {
    const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink' } });
    return { MONTHLY: plan.monthlyPriceCents, SEMIANNUAL: plan.semiannualPriceCents, ANNUAL: plan.annualPriceCents }[cycle]!;
  };
  /** A claim or a hold that ran its time: what a request finds a while later. */
  const letTheClaimRunOut = () => prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: new Date(Date.now() - 1_000) } });
  /** What Asaas is asked for a page's monthly plan — as a request that died, or a hand at Asaas's panel, would have left it. */
  const requestOf = async (change: Partial<{ cycle: string; valueCents: number; customerId: string; firstDueDay: string; externalReference: string }> = {}) => ({
    customerId: (await accountOf()).asaasCustomerId!,
    valueCents: 5990,
    cycle: 'MONTHLY',
    firstDueDay: today(),
    description: 'Plano Beelink mensal — página "Padaria da Lia"',
    externalReference: await referenceOf(),
    ...change,
  });
  const expectRefusal = (response: { statusCode: number; json: <T>() => T }, statusCode: number, errorCode: string) => {
    expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([statusCode, errorCode]);
  };

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await openShop('padaria');
    // The account in good standing: its customer stands at Asaas, and the choice has nothing to ask about it.
    const saved = await call('PUT', ACCOUNT, owner, person);
    if (saved.statusCode !== 200) throw new Error(`PUT /billing/account answered ${saved.statusCode}: ${saved.payload}`);
    asaas.calls.length = 0;
  });

  describe('choosing a cycle', () => {
    it("makes the page's subscription at Asaas with no card — the account's customer, today's due day, the page's own reference — and answers the invoice of its first charge", async () => {
      const before = await rowOf();

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'createSubscription', 'subscriptionCharges']);
      expect(asaas.asked).toEqual([
        {
          customerId: (await accountOf()).asaasCustomerId,
          valueCents: 5990,
          cycle: 'MONTHLY',
          firstDueDay: today(),
          description: 'Plano Beelink mensal — página "Padaria da Lia"',
          externalReference: `beelink-subscription-${before.id}`,
        },
      ]);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      const [made] = asaas.standingSubscriptions;
      const [charge] = asaas.charges;

      const answer = response.json<SubscriptionChoice>();
      expect(answer.invoiceUrl).toBe(charge!.invoiceUrl);
      expect(answer.subscription).toMatchObject({ id: before.id, plan: { slug: 'beelink', name: 'Beelink' }, cycle: 'MONTHLY', priceCents: 5990, invoiceUrl: charge!.invoiceUrl });

      const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink' } });
      expect(await rowOf()).toMatchObject({
        asaasSubscriptionId: made!.id,
        planId: plan.id,
        cycle: 'MONTHLY',
        priceCents: 5990,
        firstDueDate: new Date(`${today()}T00:00:00.000Z`),
        invoiceUrl: charge!.invoiceUrl,
        asaasSubscriptionClaimedUntil: null,
      });
    });

    it.each([
      ['MONTHLY', 5990, 'MONTHLY', 'mensal'],
      ['SEMIANNUAL', 32340, 'SEMIANNUALLY', 'semestral'],
      ['ANNUAL', 57480, 'YEARLY', 'anual'],
    ] as const)("asks Asaas for %s at the plan's price for that cycle (%i cents), in Asaas's own word (%s)", async (cycle, cents, word, said) => {
      // The seed's own number, read back from the table: what is charged is what the table holds.
      expect(await priceOf(cycle)).toBe(cents);

      const response = await choose(cycle);

      expect(response.statusCode).toBe(200);
      expect(asaas.asked).toHaveLength(1);
      expect(asaas.asked[0]).toMatchObject({ valueCents: cents, cycle: word, description: `Plano Beelink ${said} — página "Padaria da Lia"` });
      expect(await rowOf()).toMatchObject({ cycle, priceCents: cents });
      expect(response.json<SubscriptionChoice>().subscription).toMatchObject({ cycle, priceCents: cents });
    });

    it('charges what the plan costs in the database at that moment — a price changed there is the price asked and the price kept', async () => {
      await prisma.plan.update({ where: { slug: 'beelink' }, data: { monthlyPriceCents: 6190, annualPriceCents: 61230 } });

      expect((await choose('ANNUAL')).statusCode).toBe(200);

      expect(asaas.asked[0]).toMatchObject({ valueCents: 61230, cycle: 'YEARLY' });
      expect(await rowOf()).toMatchObject({ cycle: 'ANNUAL', priceCents: 61230 });
    });

    it('does not move the page\'s status: in trial it stays in trial, and one whose trial ran out stays as it was written', async () => {
      expect((await choose('MONTHLY')).json<SubscriptionChoice>().subscription.status).toBe('TRIALING');
      expect((await rowOf()).status).toBe('TRIALING');

      const late = await signUpAndSignIn(app, newEmail('atrasada'));
      await openShop('atrasada', late);
      await call('PUT', ACCOUNT, late, { name: 'Lessari Moda LTDA', document: '11.222.333/0001-81' });
      await prisma.storeSubscription.updateMany({ where: { store: { slug: 'atrasada' } }, data: { trialStartedAt: new Date(Date.now() - 9 * 86_400_000), trialEndsAt: new Date(Date.now() - 86_400_000) } });
      const before = await rowOf('atrasada');

      const response = await choose('SEMIANNUAL', late, 'atrasada');

      expect(response.statusCode).toBe(200);
      // Read, a trial past its end is expired; written, the column is what it was. Nothing else of the page moved either.
      expect(response.json<SubscriptionChoice>().subscription.status).toBe('TRIAL_EXPIRED');
      expect(await rowOf('atrasada')).toMatchObject({
        status: 'TRIALING',
        trialEndsAt: before.trialEndsAt,
        currentPeriodEndsAt: null,
        paymentMethod: null,
        cardBrand: null,
        cardLast4: null,
        cycle: 'SEMIANNUAL',
      });
    });

    it("is the page's: an account's two pages have a subscription each, under references of their own, charged to the one customer", async () => {
      await openShop('confeitaria', owner, 'Confeitaria da Lia');

      const first = await choose('MONTHLY', owner, 'padaria');
      const second = await choose('ANNUAL', owner, 'confeitaria');

      expect([first.statusCode, second.statusCode]).toEqual([200, 200]);
      expect(asaas.standingSubscriptions).toHaveLength(2);
      expect(asaas.standingSubscriptions.map((subscription) => subscription.externalReference).sort()).toEqual([await referenceOf('padaria'), await referenceOf('confeitaria')].sort());
      expect(new Set(asaas.standingSubscriptions.map((subscription) => subscription.customerId))).toEqual(new Set([(await accountOf()).asaasCustomerId]));
      expect(first.json<SubscriptionChoice>().invoiceUrl).not.toBe(second.json<SubscriptionChoice>().invoiceUrl);
      expect(asaas.asked[1]).toMatchObject({ description: 'Plano Beelink anual — página "Confeitaria da Lia"' });
    });

    it("brings the invoice waiting to be paid where the page's subscription is read — to its owner, and with nothing of Asaas's ids", async () => {
      const { invoiceUrl } = (await choose('MONTHLY')).json<SubscriptionChoice>();
      const stranger = await signUpAndSignIn(app, newEmail('estranha'));

      const read = await call('GET', '/api/stores/padaria/subscription', owner);
      const theirs = await call('GET', '/api/stores/padaria/subscription', stranger);

      expect(read.statusCode).toBe(200);
      expect(read.json<StoreSubscriptionAnswer>()).toMatchObject({ billingEnforced: true, subscription: { status: 'TRIALING', cycle: 'MONTHLY', priceCents: 5990, invoiceUrl } });
      expect(read.payload).not.toMatch(/sub_|cus_|asaasSubscription|ClaimedUntil/);
      expectRefusal(theirs, 403, 'STORE_FORBIDDEN');
      expect(theirs.payload).not.toContain(invoiceUrl);
    });
  });

  describe('safe to repeat', () => {
    it('answers the same subscription and the same invoice to the same choice again, looked up at Asaas, and makes no other', async () => {
      const first = (await choose('MONTHLY')).json<SubscriptionChoice>();
      const kept = await rowOf();
      asaas.calls.length = 0;

      const again = await choose('MONTHLY');

      expect(again.statusCode).toBe(200);
      expect(again.json<SubscriptionChoice>().invoiceUrl).toBe(first.invoiceUrl);
      expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges']);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: kept.asaasSubscriptionId, cycle: 'MONTHLY', priceCents: 5990, firstDueDate: kept.firstDueDate, invoiceUrl: first.invoiceUrl, asaasSubscriptionClaimedUntil: null });
    });

    it('still answers the same invoice once its due day went by unpaid', async () => {
      const first = (await choose('MONTHLY')).json<SubscriptionChoice>();
      asaas.charges[0]!.status = 'OVERDUE';

      const again = await choose('MONTHLY');

      expect(again.statusCode).toBe(200);
      expect(again.json<SubscriptionChoice>().invoiceUrl).toBe(first.invoiceUrl);
      expect(asaas.count('createSubscription')).toBe(1);
    });

    it('replaces a subscription not yet paid when another cycle is chosen: the old one removed first, and exactly one left standing', async () => {
      const first = (await choose('MONTHLY')).json<SubscriptionChoice>();
      const old = (await rowOf()).asaasSubscriptionId;
      asaas.calls.length = 0;

      const response = await choose('ANNUAL');

      expect(response.statusCode).toBe(200);
      // Looked at, removed, looked at once more, and only then is another made.
      expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges', 'removeSubscription', 'subscriptionCharges', 'createSubscription', 'subscriptionCharges']);
      expect(asaas.subscriptionsHeld).toHaveLength(2);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ cycle: 'YEARLY', valueCents: 57480 });
      expect(asaas.standingSubscriptions[0]!.id).not.toBe(old);

      const answer = response.json<SubscriptionChoice>();
      expect(answer.invoiceUrl).not.toBe(first.invoiceUrl);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: asaas.standingSubscriptions[0]!.id, cycle: 'ANNUAL', priceCents: 57480, invoiceUrl: answer.invoiceUrl, asaasSubscriptionClaimedUntil: null });
    });

    it('replaces one made at a price the plan no longer has, though the cycle is the same: what is charged is the price of the day', async () => {
      await choose('MONTHLY');
      await prisma.plan.update({ where: { slug: 'beelink' }, data: { monthlyPriceCents: 6490 } });

      expect((await choose('MONTHLY')).statusCode).toBe(200);

      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ cycle: 'MONTHLY', valueCents: 6490 });
      expect(await rowOf()).toMatchObject({ priceCents: 6490, asaasSubscriptionId: asaas.standingSubscriptions[0]!.id });
    });

    it('replaces one of another cycle though the two cost the same: the amount alone does not make it the one chosen', async () => {
      await prisma.plan.update({ where: { slug: 'beelink' }, data: { annualPriceCents: 5990 } });
      await choose('MONTHLY');
      const monthly = (await rowOf()).asaasSubscriptionId;

      expect((await choose('ANNUAL')).statusCode).toBe(200);

      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ cycle: 'YEARLY', valueCents: 5990 });
      expect(asaas.standingSubscriptions[0]!.id).not.toBe(monthly);
      expect(await rowOf()).toMatchObject({ cycle: 'ANNUAL', priceCents: 5990 });
    });

    it.each([
      ['CONFIRMED', 'ACTIVE'],
      ['RECEIVED', 'ACTIVE'],
      ['RECEIVED_IN_CASH', 'ACTIVE'],
      ['REFUNDED', 'CANCELED'],
      ['AWAITING_RISK_ANALYSIS', 'TRIALING'],
      ['CHARGEBACK_REQUESTED', 'PAST_DUE'],
      ['A_WORD_ASAAS_ADDS_LATER', 'TRIALING'],
    ] as const)(
      'removes nothing and makes nothing once Asaas says the charge is %s — whichever cycle is chosen — and has the page read as it then stands, %s (BEELINK-221)',
      async (status, standing) => {
        await choose('MONTHLY');
        const before = await rowOf();
        asaas.pay(before.asaasSubscriptionId!, status);
        asaas.calls.length = 0;

        expectRefusal(await choose('ANNUAL'), 409, 'BILLING_SUBSCRIPTION_PAID');
        // The talk's own look, and then the read of the payment, with the claim let go: nothing asked of Asaas changes anything there.
        expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges', 'subscription', 'subscriptionCharges']);
        // What the row says of Asaas is as the choice left it; the read wrote where the page stands.
        expect(await rowOf()).toMatchObject({ status: standing, asaasSubscriptionId: before.asaasSubscriptionId, cycle: 'MONTHLY', priceCents: 5990, asaasSubscriptionClaimedUntil: null });

        // Chosen again: still refused — before Asaas is asked, for a page the payment made active.
        asaas.calls.length = 0;
        expectRefusal(await choose('MONTHLY'), 409, standing === 'ACTIVE' ? 'BILLING_PAGE_ACTIVE' : 'BILLING_SUBSCRIPTION_PAID');
        if (standing === 'ACTIVE') expect(asaas.calls).toEqual([]);
        expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([before.asaasSubscriptionId]);
        expect(asaas.subscriptionsHeld).toHaveLength(1);
      },
    );

    it('makes nothing over a charge paid while its subscription was being removed, and keeps the row naming it', async () => {
      await choose('MONTHLY');
      const before = await rowOf();
      // The shopkeeper pays at the invoice left open, between the look at the charges and the removal.
      asaas.before('removeSubscription', () => asaas.pay(before.asaasSubscriptionId!));

      const response = await choose('ANNUAL');

      expectRefusal(response, 409, 'BILLING_SUBSCRIPTION_PAID');
      expect(asaas.count('createSubscription')).toBe(1);
      expect(asaas.standingSubscriptions).toHaveLength(0);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: before.asaasSubscriptionId, cycle: 'MONTHLY', priceCents: 5990, asaasSubscriptionClaimedUntil: null });
      // Read as any payment is (BEELINK-221): paid, on a subscription no more — cancelled, with the month it paid for to run.
      const read = await rowOf();
      expect(read.status).toBe('CANCELED');
      expect(read.currentPeriodEndsAt!.getTime()).toBeGreaterThan(Date.now() + 27 * 86_400_000);
    });

    it('ends two choices at once with one subscription: the second is turned away while the first talks to Asaas, without waiting and without writing', async () => {
      let release!: () => void;
      const reached = new Promise<void>((arrived) => {
        asaas.before('subscriptions', () => {
          arrived();
          return new Promise<void>((free) => (release = free));
        });
      });

      const first = choose('MONTHLY');
      await reached;
      const held = await rowOf();
      // The first holds its claim, committed, and no lock: the second gets its answer at once.
      const second = await choose('ANNUAL');

      expectRefusal(second, 409, 'BILLING_SUBSCRIPTION_BUSY');
      expect(await rowOf()).toEqual(held);
      expect(held.asaasSubscriptionClaimedUntil!.getTime()).toBeGreaterThan(Date.now());

      asaas.before('subscriptions', null);
      release();
      expect((await first).statusCode).toBe(200);
      expect(asaas.count('createSubscription')).toBe(1);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
      expect(asaas.subscriptionsHeld[0]).toMatchObject({ cycle: 'MONTHLY' });
    });

    it('ends ten choices fired together with one subscription', async () => {
      const answers = await Promise.all(Array.from({ length: 10 }, () => choose('MONTHLY')));
      const codes = answers.map((response) => response.statusCode);

      // Whoever lost the race was turned away, or came after it was over and was handed the same invoice.
      expect(codes.filter((code) => code !== 200 && code !== 409)).toEqual([]);
      expect(codes).toContain(200);
      expect(asaas.count('createSubscription')).toBe(1);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
      expect(new Set(answers.filter((response) => response.statusCode === 200).map((response) => response.json<SubscriptionChoice>().invoiceUrl)).size).toBe(1);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: asaas.subscriptionsHeld[0]!.id, asaasSubscriptionClaimedUntil: null });
    });

    it('ends ten choices of different cycles fired together with one subscription standing', async () => {
      const cycles = ['MONTHLY', 'SEMIANNUAL', 'ANNUAL'];
      const answers = await Promise.all(Array.from({ length: 10 }, (_, index) => choose(cycles[index % 3])));

      expect(answers.map((response) => response.statusCode).filter((code) => code !== 200 && code !== 409)).toEqual([]);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: asaas.standingSubscriptions[0]!.id, asaasSubscriptionClaimedUntil: null });
    });

    it('does not know what came of a creation Asaas left unanswered: nobody creates again at once, and the next try searches by the reference and finds the one that was made', async () => {
      asaas.unansweredSubscriptions = 1;

      const silent = await choose('MONTHLY');

      expectRefusal(silent, 503, 'BILLING_UNREACHABLE');
      // Asaas made it; bee-link was never told.
      expect(asaas.standingSubscriptions).toHaveLength(1);
      const held = await rowOf();
      expect(held).toMatchObject({ asaasSubscriptionId: null, cycle: null, priceCents: null, invoiceUrl: null });
      expect(held.asaasSubscriptionClaimedUntil!.getTime()).toBeGreaterThan(Date.now() + 30_000);

      // At once: turned away, with Asaas not asked and nothing written.
      asaas.calls.length = 0;
      const early = await choose('MONTHLY');
      expectRefusal(early, 409, 'BILLING_SUBSCRIPTION_BUSY');
      expect(asaas.calls).toEqual([]);
      expect(await rowOf()).toEqual(held);

      // Once the hold ran out: searched first, found, taken — not made again.
      await letTheClaimRunOut();
      const later = await choose('MONTHLY');
      expect(later.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges']);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
      expect(later.json<SubscriptionChoice>().invoiceUrl).toBe(asaas.charges[0]!.invoiceUrl);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: asaas.subscriptionsHeld[0]!.id, cycle: 'MONTHLY', priceCents: 5990, asaasSubscriptionClaimedUntil: null });
    });

    it('removes the one a creation left unanswered did make, when the next try chooses another cycle — and still ends with one', async () => {
      asaas.unansweredSubscriptions = 1;
      await choose('MONTHLY');
      await letTheClaimRunOut();
      asaas.calls.length = 0;

      expect((await choose('SEMIANNUAL')).statusCode).toBe(200);

      expect(asaas.calls.slice(0, 3)).toEqual(['subscriptions', 'subscriptionCharges', 'removeSubscription']);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ cycle: 'SEMIANNUALLY', valueCents: 32340 });
    });

    it('creates on the next try when the creation left unanswered was never made', async () => {
      asaas.failing('createSubscription', new AsaasOutcomeUnknown('Asaas did not answer (TypeError, ECONNRESET)'));

      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNREACHABLE');
      expect(asaas.subscriptionsHeld).toHaveLength(0);

      await letTheClaimRunOut();
      asaas.calls.length = 0;
      expect((await choose('MONTHLY')).statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'createSubscription', 'subscriptionCharges']);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
    });

    /** The claim was committed, Asaas made the subscription, and the process ended before its id was written. */
    it('takes the subscription a request that died left at Asaas, once its claim ran out', async () => {
      const left = asaas.plantSubscription(await requestOf());
      await letTheClaimRunOut();

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges']);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
      expect(response.json<SubscriptionChoice>().invoiceUrl).toBe(asaas.charges[0]!.invoiceUrl);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: left.id, cycle: 'MONTHLY', priceCents: 5990, firstDueDate: new Date(`${today()}T00:00:00.000Z`), asaasSubscriptionClaimedUntil: null });
    });

    /** The old one was removed at Asaas, and the process ended before the row was told and the new one made. */
    it('makes one, and only one, after a request that died between removing the old subscription and making the new', async () => {
      await choose('MONTHLY');
      const old = (await rowOf()).asaasSubscriptionId!;
      await asaas.removeSubscription(old);
      asaas.calls.length = 0;

      const response = await choose('ANNUAL');

      expect(response.statusCode).toBe(200);
      // The one the row names is asked for by its id, since the search no longer brings it — and it is gone.
      expect(asaas.calls).toEqual(['subscriptions', 'subscription', 'createSubscription', 'subscriptionCharges']);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: asaas.standingSubscriptions[0]!.id, cycle: 'ANNUAL', priceCents: 57480 });
    });

    it('makes no other beside the one the row names when the search does not bring it: it is asked for by its id', async () => {
      const first = (await choose('MONTHLY')).json<SubscriptionChoice>();
      const known = (await rowOf()).asaasSubscriptionId!;
      asaas.unlisted.add(known);
      asaas.calls.length = 0;

      const again = await choose('MONTHLY');

      expect(again.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'subscription', 'subscriptionCharges']);
      expect(again.json<SubscriptionChoice>().invoiceUrl).toBe(first.invoiceUrl);
      expect(asaas.subscriptionsHeld).toHaveLength(1);

      // And it is the one removed when another cycle is chosen.
      expect((await choose('ANNUAL')).statusCode).toBe(200);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]!.id).not.toBe(known);
    });

    /** Whoever lost its claim — it ran out, and another request took the talk — neither creates nor writes. */
    it("does not create, and does not write, once its claim is another request's", async () => {
      const theirs = new Date(Date.now() + 50_000);
      asaas.before('subscriptions', async () => {
        await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: theirs } });
      });

      const response = await choose('MONTHLY');

      expectRefusal(response, 409, 'BILLING_SUBSCRIPTION_BUSY');
      expect(asaas.calls).toEqual(['subscriptions']);
      expect(asaas.subscriptionsHeld).toHaveLength(0);
      // The other request's claim stands as it wrote it.
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, cycle: null, asaasSubscriptionClaimedUntil: theirs });
    });

    it("does not write a subscription it found, nor remove one, once its claim is another request's", async () => {
      await choose('MONTHLY');
      const before = await rowOf();
      const theirs = new Date(Date.now() + 50_000);
      asaas.before('subscriptionCharges', async () => {
        await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: theirs } });
      });

      for (const cycle of ['MONTHLY', 'ANNUAL']) {
        asaas.calls.length = 0;
        expectRefusal(await choose(cycle), 409, 'BILLING_SUBSCRIPTION_BUSY');
        expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges']);
        await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionClaimedUntil: null } });
      }
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([before.asaasSubscriptionId]);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: before.asaasSubscriptionId, cycle: 'MONTHLY', invoiceUrl: before.invoiceUrl });
    });
  });

  describe("what stands at Asaas under the page's reference", () => {
    it('keeps the one the row names when two stand there, and removes the other', async () => {
      await choose('MONTHLY');
      const known = (await rowOf()).asaasSubscriptionId!;
      // A second one, the same in everything, made by hand under the same reference — and listed first.
      const stray = asaas.plantSubscription(await requestOf());
      asaas.subscriptionsHeld.reverse();

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(200);
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([known]);
      expect(asaas.subscriptionsHeld.find((subscription) => subscription.id === stray.id)).toMatchObject({ deleted: true });
      expect((await rowOf()).asaasSubscriptionId).toBe(known);
      expect(asaas.count('createSubscription')).toBe(1);
    });

    it('removes every one that is not what was chosen, and makes one', async () => {
      asaas.plantSubscription(await requestOf({ cycle: 'YEARLY', valueCents: 57480 }));
      asaas.plantSubscription(await requestOf({ cycle: 'SEMIANNUALLY', valueCents: 32340 }));

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(200);
      expect(asaas.count('removeSubscription')).toBe(2);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ cycle: 'MONTHLY', valueCents: 5990 });
      expect((await rowOf()).asaasSubscriptionId).toBe(asaas.standingSubscriptions[0]!.id);
    });

    it('removes nothing when one of two was paid, though the other was not', async () => {
      const paid = asaas.plantSubscription(await requestOf({ cycle: 'YEARLY', valueCents: 57480 }));
      asaas.plantSubscription(await requestOf());
      asaas.pay(paid.id, 'RECEIVED');

      expectRefusal(await choose('MONTHLY'), 409, 'BILLING_SUBSCRIPTION_PAID');
      expect(asaas.standingSubscriptions).toHaveLength(2);
      expect(asaas.count('removeSubscription')).toBe(0);
      expect(asaas.count('createSubscription')).toBe(0);
    });

    it("leaves alone a subscription of another reference, whoever's customer it is charged to", async () => {
      const foreign = asaas.plantSubscription(await requestOf({ cycle: 'YEARLY', externalReference: 'teste-s8-sub-amanha-ok' }));

      expect((await choose('MONTHLY')).statusCode).toBe(200);

      expect(asaas.count('removeSubscription')).toBe(0);
      expect(asaas.standingSubscriptions).toHaveLength(2);
      expect(asaas.subscriptionsHeld.find((subscription) => subscription.id === foreign.id)).toMatchObject({ deleted: false, status: 'ACTIVE' });
    });

    it('does not take for its own a subscription the row names that carries another reference: it is neither kept nor removed', async () => {
      const foreign = asaas.plantSubscription(await requestOf({ externalReference: 'another-product-subscription' }));
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: foreign.id } });

      expect((await choose('ANNUAL')).statusCode).toBe(200);

      expect(asaas.count('removeSubscription')).toBe(0);
      expect(asaas.subscriptionsHeld.find((subscription) => subscription.id === foreign.id)).toMatchObject({ deleted: false });
      expect((await rowOf()).asaasSubscriptionId).not.toBe(foreign.id);
    });

    it('replaces one that stands inactive, or under a customer that is no longer the account\'s', async () => {
      const inactive = asaas.plantSubscription(await requestOf());
      inactive.status = 'INACTIVE';
      const other = asaas.plant({ name: 'Outra', document: '52998224725', email: 'outra@exemplo.test', externalReference: 'beelink-account-outra' });
      asaas.plantSubscription(await requestOf({ customerId: other }));

      expect((await choose('MONTHLY')).statusCode).toBe(200);

      expect(asaas.count('removeSubscription')).toBe(2);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ status: 'ACTIVE', customerId: (await accountOf()).asaasCustomerId });
    });

    it('keeps the subscription and asks to be asked again while Asaas has made no charge for it yet — and answers its invoice once it has', async () => {
      asaas.chargeless = 1;

      const early = await choose('MONTHLY');

      expectRefusal(early, 503, 'BILLING_UNREACHABLE');
      const made = asaas.standingSubscriptions[0]!;
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: made.id, cycle: 'MONTHLY', priceCents: 5990, firstDueDate: new Date(`${today()}T00:00:00.000Z`), invoiceUrl: null, asaasSubscriptionClaimedUntil: null });

      // Still none: kept as it is, never removed for want of an invoice.
      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNREACHABLE');
      expect(asaas.count('removeSubscription')).toBe(0);

      const charge = asaas.charge(made.id, today());
      const later = await choose('MONTHLY');
      expect(later.statusCode).toBe(200);
      expect(later.json<SubscriptionChoice>().invoiceUrl).toBe(charge.invoiceUrl);
      expect(asaas.count('createSubscription')).toBe(1);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
    });

    it('reads the first due day off the earliest charge, not off the subscription, which tells only the one after', async () => {
      const left = asaas.plantSubscription(await requestOf({ firstDueDay: '2026-10-31' }));
      asaas.charge(left.id, '2026-11-30');
      asaas.charges.reverse();

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(200);
      expect(response.json<SubscriptionChoice>().invoiceUrl).toBe(asaas.charges.find((charge) => charge.dueDate === '2026-10-31')!.invoiceUrl);
      expect((await rowOf()).firstDueDate).toEqual(new Date('2026-10-31T00:00:00.000Z'));
    });
  });

  describe("the account's customer, made sure of first", () => {
    it('is told to Asaas before the subscription when the account\'s data never got there', async () => {
      const late = await signUpAndSignIn(app, newEmail('tardia'));
      await openShop('tardia', late);
      asaas.failing('customers', new AsaasUnreachable('Asaas failed (503)'));
      expect((await call('PUT', ACCOUNT, late, { name: 'Lessari Moda LTDA', document: '11.222.333/0001-81' })).statusCode).toBe(503);
      expect(await accountOf(late)).toMatchObject({ asaasCustomerId: null, asaasCustomerSyncedAt: null });
      asaas.calls.length = 0;

      const response = await choose('MONTHLY', late, 'tardia');

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['customers', 'createCustomer', 'subscriptions', 'createSubscription', 'subscriptionCharges']);
      const account = await accountOf(late);
      expect(account.asaasCustomerSyncedAt).toBeInstanceOf(Date);
      expect(asaas.asked[0]).toMatchObject({ customerId: account.asaasCustomerId });
      expect(asaas.standing.find((customer) => customer.id === account.asaasCustomerId)).toMatchObject({ name: 'Lessari Moda LTDA', document: '11222333000181', email: late.user.email });
    });

    it('makes no subscription while the customer cannot be made, and leaves the page free to choose again', async () => {
      const late = await signUpAndSignIn(app, newEmail('tardia'));
      await openShop('tardia', late);
      asaas.failing('customers', new AsaasUnreachable('Asaas failed (503)'));
      await call('PUT', ACCOUNT, late, { name: 'Lessari Moda LTDA', document: '11.222.333/0001-81' });
      asaas.failing('createCustomer', new AsaasRefused(400, 'invalid_object', 'O CPF/CNPJ informado é inválido.'));
      asaas.calls.length = 0;

      const response = await choose('MONTHLY', late, 'tardia');

      expectRefusal(response, 502, 'BILLING_CUSTOMER_REFUSED');
      expect(asaas.calls).toEqual(['customers', 'createCustomer']);
      expect(await rowOf('tardia')).toMatchObject({ asaasSubscriptionId: null, asaasSubscriptionClaimedUntil: null });

      expect((await choose('MONTHLY', late, 'tardia')).statusCode).toBe(200);
    });

    it("is turned away, with the page's claim let go, while another request tells the account's customer to Asaas", async () => {
      await prisma.billingAccount.updateMany({ data: { asaasCustomerSyncedAt: null, asaasCustomerClaimedUntil: new Date(Date.now() + 40_000) } });

      const response = await choose('MONTHLY');

      expectRefusal(response, 409, 'BILLING_ACCOUNT_BUSY');
      expect(asaas.calls).toEqual([]);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, asaasSubscriptionClaimedUntil: null });
    });

    /** A row in good standing does not notice its customer was removed at Asaas — the creation is what finds out. */
    it('makes another customer when Asaas refuses the one it had as removed, and tries the creation once more — once', async () => {
      const removed = (await accountOf()).asaasCustomerId!;
      asaas.remove(removed);

      const response = await choose('MONTHLY');

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'createSubscription', 'customers', 'createCustomer', 'createSubscription', 'subscriptionCharges']);
      const account = await accountOf();
      expect(account.asaasCustomerId).not.toBe(removed);
      expect(account.asaasCustomerSyncedAt).toBeInstanceOf(Date);
      expect(asaas.standing.map((customer) => customer.id)).toEqual([account.asaasCustomerId]);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ customerId: account.asaasCustomerId });
    });

    it('does not try again a creation Asaas refused for a reason that is not the customer: it stands as it stood, and nothing was made', async () => {
      const known = (await accountOf()).asaasCustomerId!;
      asaas.failing('createSubscription', new AsaasRefused(400, 'invalid_value', 'O campo value deve ser informado.'));

      const response = await choose('MONTHLY');

      expectRefusal(response, 502, 'BILLING_SUBSCRIPTION_REFUSED');
      expect(response.payload).not.toContain('value deve');
      expect(asaas.calls).toEqual(['subscriptions', 'createSubscription', 'customers']);
      expect(asaas.subscriptionsHeld).toHaveLength(0);
      expect(await accountOf()).toMatchObject({ asaasCustomerId: known, asaasCustomerClaimedUntil: null });
      expect((await accountOf()).asaasCustomerSyncedAt).toBeInstanceOf(Date);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, cycle: null, asaasSubscriptionClaimedUntil: null });

      // Nothing is held: the next choice asks again at once.
      expect((await choose('MONTHLY')).statusCode).toBe(200);
    });

    it('says the subscription was refused when the second creation is refused too', async () => {
      asaas.remove((await accountOf()).asaasCustomerId!);
      asaas.before('createCustomer', () => asaas.failing('createSubscription', new AsaasRefused(400, 'invalid_object', 'Não é possível criar uma cobrança para um cliente removido.')));

      const response = await choose('MONTHLY');

      expectRefusal(response, 502, 'BILLING_SUBSCRIPTION_REFUSED');
      expect(asaas.count('createSubscription')).toBe(2);
      expect(asaas.subscriptionsHeld).toHaveLength(0);
      expect((await rowOf()).asaasSubscriptionClaimedUntil).toBeNull();
    });
  });

  describe('refused before Asaas is asked anything', () => {
    /** The page's row and Asaas, as they were: a refusal writes nothing and asks nothing. */
    async function expectUntouched(before: Awaited<ReturnType<typeof rowOf>>) {
      expect(asaas.calls).toEqual([]);
      expect(asaas.subscriptionsHeld).toHaveLength(0);
      expect(await rowOf()).toEqual(before);
    }

    it('an account that never gave who is charged — with the code the panel asks for it on', async () => {
      await prisma.billingAccount.deleteMany();
      const before = await rowOf();

      expectRefusal(await choose('MONTHLY'), 409, 'BILLING_ACCOUNT_REQUIRED');
      await expectUntouched(before);
    });

    it('a page that is exempt', async () => {
      await prisma.storeSubscription.updateMany({ data: { status: 'EXEMPT' } });
      const before = await rowOf();

      expectRefusal(await choose('MONTHLY'), 409, 'BILLING_PAGE_EXEMPT');
      await expectUntouched(before);
    });

    it('a page that is active, with a period paid for still running', async () => {
      await prisma.storeSubscription.updateMany({ data: { status: 'ACTIVE', currentPeriodEndsAt: new Date(Date.now() + 86_400_000) } });
      const before = await rowOf();

      expectRefusal(await choose('ANNUAL'), 409, 'BILLING_PAGE_ACTIVE');
      await expectUntouched(before);
    });

    it('a page from before subscriptions existed, which has none to choose a cycle for', async () => {
      await prisma.storeSubscription.deleteMany();

      expectRefusal(await choose('MONTHLY'), 409, 'BILLING_SUBSCRIPTION_MISSING');
      expect(asaas.calls).toEqual([]);
      expect(await prisma.storeSubscription.count()).toBe(0);
    });

    it.each([
      ['switched off', () => prisma.plan.updateMany({ where: { slug: 'beelink' }, data: { active: false } }), 'MONTHLY'],
      ['not in the table', () => prisma.plan.deleteMany(), 'MONTHLY'],
      ['not sold in the cycle chosen', () => prisma.plan.updateMany({ where: { slug: 'beelink' }, data: { semiannualPriceCents: null } }), 'SEMIANNUAL'],
    ])('a plan that is %s', async (_what, arrange, cycle) => {
      await arrange();
      const before = await rowOf();

      expectRefusal(await choose(cycle), 409, 'BILLING_PLAN_UNAVAILABLE');
      await expectUntouched(before);
    });

    it.each([
      ['no cycle', {}],
      ['a cycle bee-link does not charge in', { cycle: 'WEEKLY' }],
      ["Asaas's word for one", { cycle: 'YEARLY' }],
      ['a cycle in lower case', { cycle: 'monthly' }],
      ['a cycle that is not text', { cycle: 12 }],
    ])('a body with %s', async (_what, payload) => {
      const before = await rowOf();

      const response = await call('PUT', '/api/stores/padaria/subscription', owner, payload);

      expectRefusal(response, 400, 'BILLING_CYCLE_INVALID');
      await expectUntouched(before);
    });

    it.each([
      ['a price', { priceCents: 1 }],
      ['a plan', { planId: '0199a0f1-0000-7000-8000-000000000001' }],
      ['a customer', { customerId: 'cus_000000000001' }],
      ['a way of paying', { billingType: 'CREDIT_CARD' }],
    ])('a body that names %s: none of it is the caller\'s to say', async (_what, extra) => {
      const before = await rowOf();

      const response = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY', ...extra });

      expect(response.statusCode).toBe(400);
      await expectUntouched(before);
    });

    it("anyone but the page's owner, and a page that does not exist", async () => {
      const stranger = await signUpAndSignIn(app, newEmail('estranha'));
      await call('PUT', ACCOUNT, stranger, { name: 'Lessari Moda LTDA', document: '11.222.333/0001-81' });
      asaas.calls.length = 0;
      const before = await rowOf();

      expectRefusal(await choose('MONTHLY', stranger), 403, 'STORE_FORBIDDEN');
      expectRefusal(await choose('MONTHLY', owner, 'nao-existe'), 404, 'STORE_NOT_FOUND');
      expectRefusal(await choose('MONTHLY', null), 401, 'AUTH_UNAUTHENTICATED');
      await expectUntouched(before);
    });

    it("a deployment with no key of bee-link's own Asaas account", async () => {
      asaas.configured = false;
      const before = await rowOf();

      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNAVAILABLE');
      await expectUntouched(before);
    });
  });

  describe('a page that is not in trial', () => {
    it('goes on to Asaas when it reads active with its paid period over, and is told there that it was paid', async () => {
      await choose('MONTHLY');
      const row = await rowOf();
      asaas.pay(row.asaasSubscriptionId!);
      await prisma.storeSubscription.updateMany({ data: { status: 'ACTIVE', currentPeriodEndsAt: new Date(Date.now() - 86_400_000) } });

      expectRefusal(await choose('ANNUAL'), 409, 'BILLING_SUBSCRIPTION_PAID');
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([row.asaasSubscriptionId]);
      expect((await rowOf()).status).toBe('ACTIVE');
    });

    it.each(['TRIAL_EXPIRED', 'PAST_DUE', 'SUSPENDED', 'CANCELED'] as const)('may choose a cycle while %s with nothing standing at Asaas, and stays %s', async (status) => {
      await prisma.storeSubscription.updateMany({ data: { status } });

      expect((await choose('MONTHLY')).statusCode).toBe(200);

      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect((await rowOf()).status).toBe(status);
    });
  });

  describe('when Asaas does not do what was asked', () => {
    it.each([
      ['its own failure', new AsaasUnreachable('Asaas failed (503)')],
      ['a silence', new AsaasUnreachable('Asaas did not answer (TimeoutError)')],
      ['a wait asked for', new AsaasThrottled('Asaas failed (429)', new Date(Date.now() + 120_000))],
    ])('says Asaas did not answer, on %s while it was searched — nothing was created, and the next choice asks again at once', async (_what, error) => {
      asaas.failing('subscriptions', error);

      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNREACHABLE');
      expect(asaas.calls).toEqual(['subscriptions']);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, asaasSubscriptionClaimedUntil: null });

      expect((await choose('MONTHLY')).statusCode).toBe(200);
      expect(asaas.subscriptionsHeld).toHaveLength(1);
    });

    /** A 403 with a page of HTML is what a provider answers a server it blocks: no word of it is about this page's choice. */
    it('does not say the subscription was refused for a search Asaas turned away: nothing was decided, and nothing was created', async () => {
      asaas.failing('subscriptions', new AsaasRefused(403, null, 'no reason given'));

      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNREACHABLE');
      expect(asaas.calls).toEqual(['subscriptions']);
      expect((await rowOf()).asaasSubscriptionClaimedUntil).toBeNull();
    });

    it('is not held back by a wait Asaas asked for on the creation: nothing was made, so there is nothing to wait for', async () => {
      asaas.failing('createSubscription', new AsaasThrottled('Asaas failed (429)', null));

      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNREACHABLE');
      expect((await rowOf()).asaasSubscriptionClaimedUntil).toBeNull();
      expect(asaas.subscriptionsHeld).toHaveLength(0);
    });

    it("says billing is unavailable when Asaas refuses bee-link's own key — on the search, and on the creation", async () => {
      asaas.failing('subscriptions', new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida'));
      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNAVAILABLE');

      asaas.failing('createSubscription', new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida'));
      asaas.calls.length = 0;
      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNAVAILABLE');
      // The key's refusal says nothing of the customer: it is not asked for anew.
      expect(asaas.calls).toEqual(['subscriptions', 'createSubscription']);
      expect((await rowOf()).asaasSubscriptionClaimedUntil).toBeNull();
    });

    it('makes no other while the old one could not be removed: it stands, the row names it, and the next choice finishes the change', async () => {
      await choose('MONTHLY');
      const before = await rowOf();
      asaas.failing('removeSubscription', new AsaasUnreachable('Asaas did not answer (TimeoutError)'));

      expectRefusal(await choose('ANNUAL'), 503, 'BILLING_UNREACHABLE');
      expect(asaas.count('createSubscription')).toBe(1);
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([before.asaasSubscriptionId]);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: before.asaasSubscriptionId, cycle: 'MONTHLY', invoiceUrl: before.invoiceUrl, asaasSubscriptionClaimedUntil: null });

      expect((await choose('ANNUAL')).statusCode).toBe(200);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(asaas.standingSubscriptions[0]).toMatchObject({ cycle: 'YEARLY' });
    });

    it('no longer shows the invoice of the subscription it removed when the new one could not be made: the row names nothing, and the next choice makes one', async () => {
      await choose('MONTHLY');
      asaas.failing('createSubscription', new AsaasThrottled('Asaas failed (429)', null));

      expectRefusal(await choose('ANNUAL'), 503, 'BILLING_UNREACHABLE');

      // The monthly one is gone from Asaas, and its invoice with it: what the row said of it would open nothing.
      expect(asaas.standingSubscriptions).toHaveLength(0);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, planId: null, cycle: null, priceCents: null, firstDueDate: null, invoiceUrl: null, asaasSubscriptionClaimedUntil: null });
      const read = (await call('GET', '/api/stores/padaria/subscription', owner)).json<StoreSubscriptionAnswer>();
      expect(read.subscription).toMatchObject({ status: 'TRIALING', plan: null, cycle: null, priceCents: null, invoiceUrl: null });

      expect((await choose('ANNUAL')).statusCode).toBe(200);
      expect(asaas.standingSubscriptions).toHaveLength(1);
      expect(await rowOf()).toMatchObject({ cycle: 'ANNUAL', priceCents: 57480 });
    });

    it('names the subscription it made on the row though its charge could not be read, and answers the invoice on the next choice without making another', async () => {
      asaas.before('createSubscription', () => asaas.failing('subscriptionCharges', new AsaasUnreachable('Asaas failed (502)')));

      expectRefusal(await choose('MONTHLY'), 503, 'BILLING_UNREACHABLE');
      const made = asaas.standingSubscriptions[0]!;
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: made.id, cycle: 'MONTHLY', priceCents: 5990, firstDueDate: new Date(`${today()}T00:00:00.000Z`), invoiceUrl: null, asaasSubscriptionClaimedUntil: null });

      asaas.before('createSubscription', null);
      const later = await choose('MONTHLY');
      expect(later.statusCode).toBe(200);
      expect(later.json<SubscriptionChoice>().invoiceUrl).toBe(asaas.charges[0]!.invoiceUrl);
      expect(asaas.count('createSubscription')).toBe(1);
    });
  });

  describe('a page that is deleted', () => {
    it('takes its subscription row with it', async () => {
      await choose('MONTHLY');

      await prisma.store.deleteMany();

      expect(await prisma.storeSubscription.count()).toBe(0);
    });
  });
});
