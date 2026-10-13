// Node
import { readFileSync } from 'node:fs';

// Nest
import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PlanCatalog, Store, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** The file `prisma db seed` runs on every deploy — the suite seeds with it, and with nothing of its own. */
const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
/** Brasília, a fixed -03:00. */
const OFFSET = 3 * HOUR;

/** The day it is in Brasília, worked out here and not by the API's own function. */
const brasiliaDay = (at: Date): string => new Date(at.getTime() - OFFSET).toISOString().slice(0, 10);

/** The midnight in Brasília that closes the seventh day after the day of `at` — again, apart from the API's arithmetic. */
function trialEndFor(at: Date): Date {
  const local = new Date(at.getTime() - OFFSET);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 8) + OFFSET);
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("what a page owes bee-link: the plans, and each page's subscription (BEELINK-219)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('estranha'));
  });

  /** `session` omitted is an anonymous caller. */
  function call(method: 'GET' | 'POST', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function openShop(slug: string, session: AuthSession = owner): Promise<Store> {
    const response = await call('POST', '/api/stores', session, shopBody(slug));
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  const seedPlans = () => prisma.$executeRawUnsafe(PLANS_SEED);
  const readPlans = async () => (await call('GET', '/api/billing/plans')).json<PlanCatalog>();
  const readSubscription = async (slug: string, session: AuthSession = owner) => (await call('GET', `/api/stores/${slug}/subscription`, session)).json<StoreSubscriptionAnswer>();
  const rowOf = async (slug: string) => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug } } });

  describe('the plans', () => {
    it('are listed to anyone, each with what its cycles cost, from the very file a deploy seeds with', async () => {
      await seedPlans();

      const response = await call('GET', '/api/billing/plans');

      expect(response.statusCode).toBe(200);
      expect(response.json<PlanCatalog>()).toEqual({
        trialDays: 7,
        plans: [
          {
            id: expect.any(String),
            slug: 'beelink',
            name: 'Beelink',
            cycles: [
              { cycle: 'MONTHLY', months: 1, priceCents: 5990 },
              { cycle: 'SEMIANNUAL', months: 6, priceCents: 32340 },
              { cycle: 'ANNUAL', months: 12, priceCents: 57480 },
            ],
          },
        ],
      });
    });

    it('keep the one with Beelia registered and switched off: in the table, not in the list', async () => {
      await seedPlans();

      const beelia = await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink-beelia' } });

      expect(beelia).toMatchObject({ name: 'Beelink + Beelia', active: false, monthlyPriceCents: 8990, semiannualPriceCents: null, annualPriceCents: null });
      expect((await readPlans()).plans.map((plan) => plan.slug)).toEqual(['beelink']);
    });

    it('are seeded once however many times the seed runs: the same two rows, not a line of them touched', async () => {
      await seedPlans();
      const first = await prisma.plan.findMany({ orderBy: { slug: 'asc' } });

      await seedPlans();
      await seedPlans();

      expect(first).toHaveLength(2);
      expect(await prisma.plan.findMany({ orderBy: { slug: 'asc' } })).toEqual(first);
    });

    it('are the seed’s to say: a price and a switch changed by hand are put back, and the row keeps its id', async () => {
      await seedPlans();
      const before = await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink' } });
      await prisma.plan.update({ where: { slug: 'beelink' }, data: { monthlyPriceCents: 1, active: false } });

      await seedPlans();

      expect(await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink' } })).toMatchObject({ id: before.id, monthlyPriceCents: 5990, active: true });
    });

    it('list a plan once it is switched on, cheapest by the month first, with only the cycles it is sold in', async () => {
      await seedPlans();
      await prisma.plan.update({ where: { slug: 'beelink-beelia' }, data: { active: true } });

      const { plans } = await readPlans();

      expect(plans.map((plan) => plan.slug)).toEqual(['beelink', 'beelink-beelia']);
      expect(plans[1]?.cycles).toEqual([{ cycle: 'MONTHLY', months: 1, priceCents: 8990 }]);
    });

    it('answer an empty list, not an error, where no plan was seeded', async () => {
      const response = await call('GET', '/api/billing/plans');

      expect(response.statusCode).toBe(200);
      expect(response.json<PlanCatalog>()).toEqual({ trialDays: 7, plans: [] });
    });
  });

  describe('a new page', () => {
    it('is born in trial, with its end written: the midnight in Brasília closing the seventh day after it was created', async () => {
      await openShop('padaria');

      const store = await prisma.store.findUniqueOrThrow({ where: { slug: 'padaria' } });
      const row = await rowOf('padaria');
      const answer = await readSubscription('padaria');
      const trialEndsAt = trialEndFor(store.createdAt);

      expect(row).toMatchObject({ storeId: store.id, status: 'TRIALING', trialStartedAt: store.createdAt, trialEndsAt });
      // Seven whole days at the least, and what was left of the day it was created on.
      expect(trialEndsAt.getTime() - store.createdAt.getTime()).toBeGreaterThanOrEqual(7 * DAY);
      expect(trialEndsAt.getTime() - store.createdAt.getTime()).toBeLessThanOrEqual(8 * DAY);

      expect(answer).toEqual({
        billingEnforced: false,
        subscription: {
          id: row.id,
          status: 'TRIALING',
          trialStartedAt: store.createdAt.toISOString(),
          trialEndsAt: trialEndsAt.toISOString(),
          trialLastDay: brasiliaDay(new Date(trialEndsAt.getTime() - 1)),
          // Seven on the day it was created; one less had this test run across Brasília's midnight.
          trialDaysLeft: brasiliaDay(new Date()) === brasiliaDay(store.createdAt) ? 7 : 6,
          plan: null,
          cycle: null,
          priceCents: null,
          currentPeriodEndsAt: null,
          cancelRequestedAt: null,
          freePeriodEndsAt: null,
          paymentMethod: null,
          invoiceUrl: null,
          card: null,
        },
      });
    });

    it('has a subscription of its own: two pages of one account, two trials', async () => {
      await openShop('padaria');
      await openShop('adega');

      const [padaria, adega] = [await rowOf('padaria'), await rowOf('adega')];

      expect(await prisma.storeSubscription.count()).toBe(2);
      expect(padaria.id).not.toBe(adega.id);
      expect((await readSubscription('padaria')).subscription?.id).toBe(padaria.id);
      expect((await readSubscription('adega')).subscription?.id).toBe(adega.id);
      // The account is charged as one customer, and nothing made that customer yet.
      expect(await prisma.billingAccount.count()).toBe(0);
    });

    it('answers what it answered before plans existed: nothing of a plan travels with the page', async () => {
      const created = await openShop('padaria');
      const read = (await call('GET', '/api/stores/padaria', owner)).json<Store>();
      const mine = (await call('GET', '/api/stores/mine', owner)).json<Store[]>();

      for (const store of [created, read, mine[0]]) {
        expect(JSON.stringify(store)).not.toMatch(/subscription|trial|billing/i);
      }
      expect(Object.keys(created).sort()).toEqual(Object.keys(read).sort());
    });
  });

  describe('a page’s subscription, read', () => {
    beforeEach(async () => {
      await openShop('padaria');
    });

    it('answers its owner alone: a stranger as on every panel route, and nobody without a session', async () => {
      const mine = await call('GET', '/api/stores/padaria/subscription', owner);
      const theirs = await call('GET', '/api/stores/padaria/subscription', stranger);
      const anonymous = await call('GET', '/api/stores/padaria/subscription');
      const nowhere = await call('GET', '/api/stores/nenhuma/subscription', owner);

      expect(mine.statusCode).toBe(200);
      expect([theirs.statusCode, theirs.json<ApiErrorBody>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect([anonymous.statusCode, anonymous.json<ApiErrorBody>().errorCode]).toEqual([401, 'AUTH_UNAUTHENTICATED']);
      expect([nowhere.statusCode, nowhere.json<ApiErrorBody>().errorCode]).toEqual([404, 'STORE_NOT_FOUND']);
      // What a stranger is answered names nothing of the subscription.
      expect(theirs.payload).not.toMatch(/TRIALING|trial/);
    });

    it('answers a page from before subscriptions existed with none, and not with an error', async () => {
      await prisma.storeSubscription.deleteMany({});

      const response = await call('GET', '/api/stores/padaria/subscription', owner);

      expect(response.statusCode).toBe(200);
      expect(response.json<StoreSubscriptionAnswer>()).toEqual({ billingEnforced: false, subscription: null });
    });

    it('reads a trial past its end as expired, and writes nothing to say so', async () => {
      const ended = new Date(Date.now() - 1000);
      await prisma.storeSubscription.updateMany({ data: { trialStartedAt: new Date(ended.getTime() - 8 * DAY), trialEndsAt: ended } });
      const before = await rowOf('padaria');

      const { subscription } = await readSubscription('padaria');

      expect(subscription).toMatchObject({ status: 'TRIAL_EXPIRED', trialDaysLeft: 0, trialEndsAt: ended.toISOString(), trialLastDay: brasiliaDay(new Date(ended.getTime() - 1)) });
      expect(await rowOf('padaria')).toEqual(before);
      expect(before.status).toBe('TRIALING');
    });

    it('reads the last day of a trial as still in trial, with no day left', async () => {
      const now = new Date();
      const tonight = new Date(trialEndFor(now).getTime() - 7 * DAY);
      await prisma.storeSubscription.updateMany({ data: { trialStartedAt: new Date(tonight.getTime() - 8 * DAY), trialEndsAt: tonight } });

      const { subscription } = await readSubscription('padaria');

      expect(subscription).toMatchObject({ status: 'TRIALING', trialDaysLeft: 0, trialLastDay: brasiliaDay(now) });
    });

    it('leaves a page bee-link exempted as it is, whatever its trial says', async () => {
      await prisma.storeSubscription.updateMany({ data: { status: 'EXEMPT', trialStartedAt: new Date(Date.now() - 30 * DAY), trialEndsAt: new Date(Date.now() - 22 * DAY) } });

      expect((await readSubscription('padaria')).subscription).toMatchObject({ status: 'EXEMPT', trialDaysLeft: 0 });
    });

    // Nothing writes these columns yet: this is the row as the tickets that talk to Asaas will leave it.
    it('reads the plan, the cycle, the period and what is kept of a card — and never an id of Asaas’s', async () => {
      await seedPlans();
      const plan = await prisma.plan.findUniqueOrThrow({ where: { slug: 'beelink' } });
      await prisma.billingAccount.create({ data: { userId: owner.user.id, asaasCustomerId: 'cus_e2e000000000001' } });
      await prisma.storeSubscription.updateMany({
        data: {
          status: 'ACTIVE',
          planId: plan.id,
          cycle: 'SEMIANNUAL',
          priceCents: 32340,
          currentPeriodEndsAt: new Date('2027-04-14T03:00:00.000Z'),
          cancelRequestedAt: new Date('2026-11-02T15:00:00.000Z'),
          freePeriodEndsAt: new Date('2026-11-14T03:00:00.000Z'),
          asaasSubscriptionId: 'sub_e2e000000000001',
          firstDueDate: new Date('2026-10-13T00:00:00.000Z'),
          paymentMethod: 'CREDIT_CARD',
          invoiceUrl: 'https://sandbox.asaas.com/i/e2e000000000001',
          cardBrand: 'MASTERCARD',
          cardLast4: '8829',
        },
      });

      const response = await call('GET', '/api/stores/padaria/subscription', owner);

      expect(response.json<StoreSubscriptionAnswer>().subscription).toMatchObject({
        status: 'ACTIVE',
        plan: { id: plan.id, slug: 'beelink', name: 'Beelink' },
        cycle: 'SEMIANNUAL',
        priceCents: 32340,
        currentPeriodEndsAt: '2027-04-14T03:00:00.000Z',
        cancelRequestedAt: '2026-11-02T15:00:00.000Z',
        freePeriodEndsAt: '2026-11-14T03:00:00.000Z',
        paymentMethod: 'CREDIT_CARD',
        invoiceUrl: 'https://sandbox.asaas.com/i/e2e000000000001',
        card: { brand: 'MASTERCARD', last4: '8829' },
      });
      expect(response.payload).not.toMatch(/sub_e2e|cus_e2e|firstDueDate|asaas(Subscription|Customer)Id/);
      // A day goes to the column and comes back the same day: no hour of Brasília's moves it.
      expect((await rowOf('padaria')).firstDueDate?.toISOString()).toBe('2026-10-13T00:00:00.000Z');
    });
  });

  describe('a page and its subscription, written together or not at all', () => {
    /**
     * Makes Postgres refuse every insert into `table` for the page at `slug`, for as long as `run`
     * takes: a real failure, inside the transaction that creates the page. It names one slug, so a
     * run killed before the `finally` leaves a trigger no other page ever meets.
     */
    async function refusingInsertsInto(table: 'store_page_versions' | 'store_subscriptions', slug: string, run: () => Promise<void>): Promise<void> {
      const name = `billing_e2e_refuse_${table}`;
      await prisma.$executeRawUnsafe(
        `CREATE OR REPLACE FUNCTION ${name}() RETURNS trigger LANGUAGE plpgsql AS $fn$ BEGIN IF EXISTS (SELECT 1 FROM "stores" WHERE "id" = NEW."storeId" AND "slug" = '${slug}') THEN RAISE EXCEPTION 'billing e2e: refused on purpose'; END IF; RETURN NEW; END $fn$`,
      );
      await prisma.$executeRawUnsafe(`CREATE OR REPLACE TRIGGER ${name} BEFORE INSERT ON "${table}" FOR EACH ROW EXECUTE FUNCTION ${name}()`);
      // The 500 this provokes is logged, as any is: kept out of the run's output, and counted below.
      const logged = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
      try {
        await run();
        expect(logged).toHaveBeenCalledTimes(1);
      } finally {
        logged.mockRestore();
        await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${name} ON "${table}"`);
        await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${name}()`);
      }
    }

    // The page's first version is the last thing its creation writes, after the subscription.
    it('leaves no subscription behind when the page’s creation fails after writing it', async () => {
      await refusingInsertsInto('store_page_versions', 'padaria', async () => {
        const failed = await call('POST', '/api/stores', owner, shopBody('padaria'));

        expect(failed.statusCode).toBe(500);
        expect(await prisma.storeSubscription.count()).toBe(0);
        expect(await prisma.store.count()).toBe(0);
        expect(await prisma.storePage.count()).toBe(0);

        // The refusal was that page's alone: another one is created meanwhile, with its trial.
        await openShop('adega');
        expect(await prisma.storeSubscription.count()).toBe(1);
      });

      // Nothing of the failed attempt holds the slug: the same page is created afterwards.
      await openShop('padaria');
      expect((await readSubscription('padaria')).subscription?.status).toBe('TRIALING');
      expect(await prisma.storeSubscription.count()).toBe(2);
    });

    it('creates no page whose subscription could not be written', async () => {
      await refusingInsertsInto('store_subscriptions', 'padaria', async () => {
        const failed = await call('POST', '/api/stores', owner, shopBody('padaria'));

        expect(failed.statusCode).toBe(500);
        expect(await prisma.store.count()).toBe(0);
        expect(await prisma.storeSubscription.count()).toBe(0);
        expect((await call('GET', '/api/stores/padaria/public')).statusCode).toBe(404);
      });

      await openShop('padaria');
      expect(await prisma.storeSubscription.count()).toBe(1);
    });

    it('is deleted with its page', async () => {
      await openShop('padaria');
      await openShop('adega');

      await prisma.store.delete({ where: { slug: 'padaria' } });

      expect(await prisma.storeSubscription.findMany({ select: { store: { select: { slug: true } } } })).toEqual([{ store: { slug: 'adega' } }]);
    });
  });
});
