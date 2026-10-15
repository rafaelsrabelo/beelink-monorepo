// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, Store, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { BillingRoutine } from '../src/modules/billing/billing-routine.js';
import { PageLocks } from '../src/modules/billing/page-locks.service.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported. The key
// is the fake's: pages lock where bee-link charges and a page can pay.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
/** Made up. The CPF is the textbook one. */
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };
const DAY = 86_400_000;

/** The day it is in Brasília, worked out here and not by the API's own functions. */
const today = (): string => new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
const plusDays = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
/** The midnight in Brasília that closes a day. */
const closeOf = (day: string): Date => new Date(Date.parse(`${day}T03:00:00.000Z`) + DAY);
/** The same day a month later, or that month's last day where it lacks it: Asaas's rule, written out here again. */
function monthAfter(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const last = new Date(Date.UTC(year + Math.floor(month / 12), (month % 12) + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year + Math.floor(month / 12), month % 12, Math.min(date, last))).toISOString().slice(0, 10);
}

describe('a page locked for want of payment (BEELINK-223)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let locks: PageLocks;
  let owner: AuthSession;
  const asaas = new FakePlatformAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(asaas));
    prisma = app.get(PrismaService);
    locks = app.get(PageLocks);
  });

  afterAll(async () => {
    await app.close();
  });

  /** `session` omitted is an anonymous caller. */
  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function openShop(slug: string, session: AuthSession = owner, name = 'Padaria da Lia'): Promise<Store> {
    const response = await call('POST', '/api/stores', session, { name, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  const read = async (slug = 'padaria') => (await call('GET', `/api/stores/${slug}/subscription`, owner)).json<StoreSubscriptionAnswer>().subscription!;
  const rowOf = (slug = 'padaria') => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug } } });
  const setRow = (data: Parameters<PrismaService['storeSubscription']['updateMany']>[0]['data'], slug = 'padaria') => prisma.storeSubscription.updateMany({ where: { store: { slug } }, data });
  /** A trial that ended `daysAgo` days ago. */
  const trialEnded = (daysAgo = 1) => ({ trialStartedAt: new Date(Date.now() - (daysAgo + 8) * DAY), trialEndsAt: new Date(Date.now() - daysAgo * DAY) });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await openShop('padaria');
    asaas.calls.length = 0;
  });

  describe("the page's subscription, read by its owner", () => {
    it('says a page in trial is open, and one whose trial ended is locked for it', async () => {
      expect(await read()).toMatchObject({ status: 'TRIALING', lock: null, graceEndsAt: null });

      await setRow(trialEnded());

      expect(await read()).toMatchObject({ status: 'TRIAL_EXPIRED', lock: 'TRIAL_EXPIRED' });
    });

    it('says a page past due is open through its grace, and when that ends; and suspended after it', async () => {
      const periodEnd = closeOf(plusDays(today(), -3));
      await setRow({ status: 'ACTIVE', currentPeriodEndsAt: periodEnd });

      expect(await read()).toMatchObject({ status: 'PAST_DUE', lock: null, graceEndsAt: new Date(periodEnd.getTime() + 7 * DAY).toISOString() });

      await setRow({ currentPeriodEndsAt: closeOf(plusDays(today(), -8)) });

      expect(await read()).toMatchObject({ status: 'SUSPENDED', lock: 'SUSPENDED' });
    });

    it('says a cancelled page is open while what it paid for runs, and locked after', async () => {
      await setRow({ status: 'CANCELED', currentPeriodEndsAt: closeOf(plusDays(today(), 3)) });
      expect(await read()).toMatchObject({ status: 'CANCELED', lock: null });

      await setRow({ currentPeriodEndsAt: closeOf(plusDays(today(), -1)) });
      expect(await read()).toMatchObject({ status: 'CANCELED', lock: 'CANCELED' });
    });

    it('never says an exempt page, or one in a free month, is locked', async () => {
      await setRow({ ...trialEnded(30), status: 'EXEMPT' });
      expect((await read()).lock).toBeNull();

      await setRow({ ...trialEnded(30), status: 'TRIAL_EXPIRED', freePeriodEndsAt: new Date(Date.now() + 10 * DAY) });
      expect(await read()).toMatchObject({ status: 'TRIAL_EXPIRED', lock: null });
    });
  });

  describe("the billing routine's clock", () => {
    it('writes a trial that ended expired, and leaves one in trial and an exempt one as they are', async () => {
      await openShop('adega', owner, 'Adega');
      await openShop('isenta', owner, 'Isenta');
      await setRow(trialEnded());
      await setRow({ ...trialEnded(), status: 'EXEMPT' }, 'isenta');

      const moves = await locks.settle(new Date());

      expect(moves).toMatchObject({ trialsExpired: 1 });
      expect((await rowOf()).status).toBe('TRIAL_EXPIRED');
      expect((await rowOf('adega')).status).toBe('TRIALING');
      expect((await rowOf('isenta')).status).toBe('EXEMPT');
    });

    it('writes a page whose period ran out past due with its grace — or suspended, its grace gone too', async () => {
      await openShop('adega', owner, 'Adega');
      const lapsed = closeOf(plusDays(today(), -2));
      const long = closeOf(plusDays(today(), -9));
      await setRow({ status: 'ACTIVE', currentPeriodEndsAt: lapsed });
      await setRow({ status: 'ACTIVE', currentPeriodEndsAt: long }, 'adega');

      const moves = await locks.settle(new Date());

      expect(moves).toMatchObject({ periodsLapsed: 2 });
      expect(await rowOf()).toMatchObject({ status: 'PAST_DUE', graceEndsAt: new Date(lapsed.getTime() + 7 * DAY) });
      expect(await rowOf('adega')).toMatchObject({ status: 'SUSPENDED', graceEndsAt: new Date(long.getTime() + 7 * DAY) });
    });

    it('writes the grace of a page found past due with no period to count from, from today, and keeps it', async () => {
      await setRow({ status: 'PAST_DUE', currentPeriodEndsAt: null, graceEndsAt: null });

      const first = await locks.settle(new Date());
      const written = (await rowOf()).graceEndsAt;
      const second = await locks.settle(new Date(Date.now() + 2 * DAY));

      expect(first).toMatchObject({ gracesWritten: 1 });
      expect(written).toEqual(new Date(closeOf(today()).getTime() + 7 * DAY));
      expect(second).toEqual({ trialsExpired: 0, periodsLapsed: 0, gracesWritten: 0, suspended: 0 });
      expect((await rowOf()).graceEndsAt).toEqual(written);
    });

    it('suspends a page whose grace ran out, and moves nothing a second time', async () => {
      await setRow({ status: 'PAST_DUE', currentPeriodEndsAt: closeOf(plusDays(today(), -10)), graceEndsAt: closeOf(plusDays(today(), -3)) });

      expect(await locks.settle(new Date())).toMatchObject({ suspended: 1 });
      expect((await rowOf()).status).toBe('SUSPENDED');
      expect(await locks.settle(new Date())).toEqual({ trialsExpired: 0, periodsLapsed: 0, gracesWritten: 0, suspended: 0 });
    });

    it('leaves a page paid through today as it is', async () => {
      await setRow({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(plusDays(today(), 10)) });

      expect(await locks.settle(new Date())).toEqual({ trialsExpired: 0, periodsLapsed: 0, gracesWritten: 0, suspended: 0 });
      expect((await rowOf()).status).toBe('ACTIVE');
    });

    it('runs in the routine’s own pass, before Asaas is read', async () => {
      await setRow(trialEnded());

      await app.get(BillingRoutine).pass(new Date());

      expect((await rowOf()).status).toBe('TRIAL_EXPIRED');
    });
  });

  describe('a payment', () => {
    beforeEach(async () => {
      const saved = await call('PUT', '/api/billing/account', owner, person);
      if (saved.statusCode !== 200) throw new Error(`PUT /billing/account answered ${saved.statusCode}: ${saved.payload}`);
    });

    /** A page that chose the monthly plan 45 days ago and paid its first charge; the second, due 15 days ago, was never paid. */
    async function suspendedAfterPaying() {
      const chosen = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' });
      if (chosen.statusCode !== 200) throw new Error(`PUT /subscription answered ${chosen.statusCode}: ${chosen.payload}`);
      const { asaasSubscriptionId } = await rowOf();
      const first = plusDays(today(), -45);
      asaas.charges[0]!.dueDate = first;
      asaas.pay(asaasSubscriptionId!, 'RECEIVED', { billingType: 'PIX' });
      const second = asaas.charge(asaasSubscriptionId!, monthAfter(first));
      await setRow({ firstDueDate: new Date(`${first}T00:00:00.000Z`), asaasCheckedAt: null });
      return { second };
    }

    it('read by the panel suspends a page whose grace ran out unpaid, and opens it the instant the renewal is paid', async () => {
      const { second } = await suspendedAfterPaying();

      const owing = await call('POST', '/api/stores/padaria/subscription/check', owner);
      expect(owing.json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'SUSPENDED', lock: 'SUSPENDED' });
      expect((await rowOf()).status).toBe('SUSPENDED');

      second.status = 'RECEIVED';
      await setRow({ asaasCheckedAt: new Date(Date.now() - 60_000) });
      const paid = await call('POST', '/api/stores/padaria/subscription/check', owner);

      expect(paid.json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'ACTIVE', lock: null, graceEndsAt: null });
      expect(await rowOf()).toMatchObject({ status: 'ACTIVE', graceEndsAt: null });
    });
  });
});
