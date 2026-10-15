// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PublicStore, Store, StoreSubscription, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { AsaasUnreachable } from '../src/shared/asaas/asaas-errors.js';
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
const dayOf = (instant: Date): string => new Date(instant.getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
const plusDays = (day: string, days: number): string => new Date(Date.parse(`${day}T00:00:00.000Z`) + days * DAY).toISOString().slice(0, 10);
/** The midnight in Brasília that closes a day. */
const closeOf = (day: string): Date => new Date(Date.parse(`${day}T03:00:00.000Z`) + DAY);
/** The same day a month later, or that month's last day where it lacks it: Asaas's rule, written out here again. */
function monthAfter(day: string): string {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const last = new Date(Date.UTC(year + Math.floor(month / 12), (month % 12) + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year + Math.floor(month / 12), month % 12, Math.min(date, last))).toISOString().slice(0, 10);
}

describe("a coupon of bee-link's: one free month for a page that never paid (BEELINK-224)", () => {
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

  /** Made as the command makes one: the code kept in upper case. Every code here says TESTE — none is a real one. */
  const makeCoupon = (code: string, data: { maxRedemptions?: number; expiresAt?: Date; disabledAt?: Date; redemptionCount?: number } = {}) => prisma.platformCoupon.create({ data: { code, ...data } });
  const redeem = (code: unknown, session: AuthSession | null = owner, slug = 'padaria') => call('POST', `/api/stores/${slug}/subscription/coupon`, session ?? undefined, { code });
  const read = async (slug = 'padaria'): Promise<StoreSubscription> => (await call('GET', `/api/stores/${slug}/subscription`, owner)).json<StoreSubscriptionAnswer>().subscription!;
  const rowOf = (slug = 'padaria') => prisma.storeSubscription.findFirstOrThrow({ where: { store: { slug } } });
  const setRow = (data: Parameters<PrismaService['storeSubscription']['updateMany']>[0]['data'], slug = 'padaria') => prisma.storeSubscription.updateMany({ where: { store: { slug } }, data });
  const countOf = async (code: string) => (await prisma.platformCoupon.findUniqueOrThrow({ where: { code } })).redemptionCount;
  /** A trial that ended `daysAgo` days ago. */
  const trialEnded = (daysAgo = 1) => ({ status: 'TRIAL_EXPIRED' as const, trialStartedAt: new Date(Date.now() - (daysAgo + 8) * DAY), trialEndsAt: new Date(Date.now() - daysAgo * DAY) });
  const expectRefusal = (response: { statusCode: number; json: <T>() => T }, statusCode: number, errorCode: string) => {
    expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([statusCode, errorCode]);
  };

  /**
   * A row lock this test holds until `release` is called — the coupon's or the page's — so that what
   * is started meanwhile reaches it and waits there, and two requests are at the same door at once.
   */
  function holdRowOf(lock: (tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0]) => Promise<unknown>) {
    let release!: () => void;
    const released = new Promise<void>((resolve) => (release = resolve));
    let taken!: () => void;
    const held = new Promise<void>((resolve) => (taken = resolve));
    const done = prisma.$transaction(
      async (tx) => {
        await lock(tx);
        taken();
        await released;
      },
      { timeout: 30_000 },
    );
    return { held, release: async () => (release(), await done) };
  }

  /** Until `count` queries of this database wait on a lock: the requests started are all at the door. */
  async function untilWaiting(count: number): Promise<void> {
    for (let tries = 0; tries < 400; tries += 1) {
      const [row] = await prisma.$queryRaw<{ waiting: bigint }[]>`SELECT count(*) AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'`;
      if (Number(row?.waiting ?? 0) >= count) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Never saw ${count} queries waiting on a lock`);
  }

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    asaas.reset();
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await openShop('padaria');
    asaas.calls.length = 0;
  });

  describe('used on a page that never paid', () => {
    it("gives a page in its trial the month after the trial — no day of it given up — and asks Asaas nothing", async () => {
      await makeCoupon('TESTE-MES', { maxRedemptions: 10 });
      const row = await rowOf();
      const firstFreeDay = dayOf(row.trialEndsAt);

      const response = await redeem('TESTE-MES');

      expect(response.statusCode).toBe(200);
      const answer = response.json<StoreSubscriptionAnswer>();
      expect(answer).toMatchObject({
        billingEnforced: true,
        subscription: {
          status: 'TRIALING',
          freePeriodEndsAt: closeOf(monthAfter(firstFreeDay)).toISOString(),
          freePeriodLastDay: monthAfter(firstFreeDay),
          lock: null,
        },
      });
      expect(answer.subscription!.freePeriodDaysLeft).toBeGreaterThan(28);
      expect(answer.subscription!.couponRedeemedAt).not.toBeNull();
      expect(asaas.calls).toEqual([]);

      // The page's standing is not moved: it is still in trial, and free until the month ends.
      expect(await rowOf()).toMatchObject({ status: 'TRIALING', freePeriodEndsAt: closeOf(monthAfter(firstFreeDay)) });
      expect(await countOf('TESTE-MES')).toBe(1);
      expect(await prisma.platformCouponRedemption.findMany()).toEqual([
        expect.objectContaining({ subscriptionId: row.id, freePeriodStartsAt: row.trialEndsAt, freePeriodEndsAt: closeOf(monthAfter(firstFreeDay)) }),
      ]);
      expect(await read()).toEqual(answer.subscription);
    });

    it('gives a page whose trial is over — locked — a month from today, and opens its panel and its shop window at once', async () => {
      await makeCoupon('TESTE-VOLTA');
      await setRow(trialEnded(3));
      expectRefusal(await call('GET', '/api/stores/padaria', owner), 403, 'PAGE_LOCKED');
      expect((await call('GET', '/api/stores/padaria/public')).json<PublicStore>().unavailable).toBe(true);

      // The coupon's route answers the locked page, as its subscription's do.
      const response = await redeem('TESTE-VOLTA');

      expect(response.statusCode).toBe(200);
      expect(response.json<StoreSubscriptionAnswer>().subscription).toMatchObject({ status: 'TRIAL_EXPIRED', freePeriodLastDay: monthAfter(today()), lock: null });
      expect((await call('GET', '/api/stores/padaria', owner)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria/public')).json<PublicStore>().unavailable).toBeUndefined();
      expect(asaas.calls).toEqual([]);
    });

    it('takes the code whatever its case and the spaces around it', async () => {
      await makeCoupon('TESTE-CAIXA');

      expect((await redeem('  teste-Caixa ')).statusCode).toBe(200);
      expect(await countOf('TESTE-CAIXA')).toBe(1);
    });

    it('adds the month after a free period still running — the one the pages that already existed are given — and not over it', async () => {
      await makeCoupon('TESTE-DEPOIS');
      const running = plusDays(today(), 10);
      await setRow({ ...trialEnded(30), freePeriodEndsAt: closeOf(running) });

      const response = await redeem('TESTE-DEPOIS');

      expect(response.json<StoreSubscriptionAnswer>().subscription).toMatchObject({ freePeriodLastDay: monthAfter(plusDays(running, 1)), lock: null });
    });

    it("is once in the page's life: the month over and the page locked again, no coupon gives another", async () => {
      await makeCoupon('TESTE-UM');
      await makeCoupon('TESTE-DOIS');
      await setRow(trialEnded(3));
      expect((await redeem('TESTE-UM')).statusCode).toBe(200);

      await setRow({ freePeriodEndsAt: new Date(Date.now() - 1_000) });
      expect(await read()).toMatchObject({ status: 'TRIAL_EXPIRED', lock: 'TRIAL_EXPIRED', freePeriodDaysLeft: null });

      expectRefusal(await redeem('TESTE-DOIS'), 409, 'BILLING_COUPON_ALREADY_USED');
      expect(await countOf('TESTE-DOIS')).toBe(0);
    });
  });

  describe('refused, with nothing written', () => {
    it('refuses a code no coupon has, and one no coupon could have, without reading a coupon', async () => {
      for (const code of ['TESTE-NADA', 'teste nada', '', 'a'.repeat(31)]) expectRefusal(await redeem(code), 409, 'BILLING_COUPON_NOT_FOUND');

      expect(await rowOf()).toMatchObject({ freePeriodEndsAt: null });
      expect(await prisma.platformCouponRedemption.count()).toBe(0);
    });

    it('refuses a coupon switched off, one past its last day, and one used up — each by its own code, and spends none', async () => {
      await makeCoupon('TESTE-DESLIGADO', { disabledAt: new Date(Date.now() - 60_000) });
      await makeCoupon('TESTE-VENCIDO', { expiresAt: new Date(Date.now() - 1) });
      await makeCoupon('TESTE-ESGOTADO', { maxRedemptions: 1, redemptionCount: 1 });

      expectRefusal(await redeem('TESTE-DESLIGADO'), 409, 'BILLING_COUPON_DISABLED');
      expectRefusal(await redeem('TESTE-VENCIDO'), 409, 'BILLING_COUPON_EXPIRED');
      expectRefusal(await redeem('TESTE-ESGOTADO'), 409, 'BILLING_COUPON_EXHAUSTED');

      expect([await countOf('TESTE-DESLIGADO'), await countOf('TESTE-VENCIDO'), await countOf('TESTE-ESGOTADO')]).toEqual([0, 0, 1]);
      expect(await rowOf()).toMatchObject({ freePeriodEndsAt: null });
    });

    it('refuses a second coupon on a page that used one — the same or another — and counts neither', async () => {
      await makeCoupon('TESTE-A');
      await makeCoupon('TESTE-B');
      expect((await redeem('TESTE-A')).statusCode).toBe(200);
      const given = (await rowOf()).freePeriodEndsAt;

      expectRefusal(await redeem('TESTE-A'), 409, 'BILLING_COUPON_ALREADY_USED');
      expectRefusal(await redeem('TESTE-B'), 409, 'BILLING_COUPON_ALREADY_USED');

      expect([await countOf('TESTE-A'), await countOf('TESTE-B')]).toEqual([1, 0]);
      expect((await rowOf()).freePeriodEndsAt).toEqual(given);
    });

    it.each([
      ['an exempt page', { status: 'EXEMPT' as const }, 'BILLING_PAGE_EXEMPT'],
      ['a page whose paid period runs', { status: 'ACTIVE' as const, currentPeriodEndsAt: new Date(Date.now() + 10 * DAY) }, 'BILLING_PAGE_ACTIVE'],
      ['a page past due', { status: 'ACTIVE' as const, currentPeriodEndsAt: new Date(Date.now() - 2 * DAY) }, 'BILLING_COUPON_PAGE_PAID'],
      ['a suspended page', { status: 'SUSPENDED' as const, currentPeriodEndsAt: new Date(Date.now() - 20 * DAY), graceEndsAt: new Date(Date.now() - 13 * DAY) }, 'BILLING_COUPON_PAGE_PAID'],
      ['a cancelled page still running on what it paid', { status: 'CANCELED' as const, currentPeriodEndsAt: new Date(Date.now() + 5 * DAY) }, 'BILLING_COUPON_PAGE_PAID'],
      ['a cancelled page with nothing left', { status: 'CANCELED' as const }, 'BILLING_COUPON_PAGE_PAID'],
    ])('refuses %s', async (_what, data, errorCode) => {
      await makeCoupon('TESTE-PAGINA');
      await setRow(data);

      expectRefusal(await redeem('TESTE-PAGINA'), 409, errorCode);
      expect(await countOf('TESTE-PAGINA')).toBe(0);
      expect(await rowOf()).toMatchObject({ freePeriodEndsAt: null });
    });

    it('refuses a page from before subscriptions: it has no row to give a month to', async () => {
      await makeCoupon('TESTE-ANTIGA');
      await prisma.storeSubscription.deleteMany();

      expectRefusal(await redeem('TESTE-ANTIGA'), 409, 'BILLING_SUBSCRIPTION_MISSING');
    });

    it("answers a stranger, a slug nobody holds and no session as every route of a page does", async () => {
      await makeCoupon('TESTE-ALHEIO');
      const stranger = await signUpAndSignIn(app, newEmail('estranha'));

      expectRefusal(await redeem('TESTE-ALHEIO', stranger), 403, 'STORE_FORBIDDEN');
      expectRefusal(await redeem('TESTE-ALHEIO', owner, 'nada'), 404, 'STORE_NOT_FOUND');
      expect((await redeem('TESTE-ALHEIO', null)).statusCode).toBe(401);
      expect(await countOf('TESTE-ALHEIO')).toBe(0);
    });

    it("refuses while a choice of a cycle holds the page's talk with Asaas", async () => {
      await makeCoupon('TESTE-OCUPADO');
      await setRow({ asaasSubscriptionClaimedUntil: new Date(Date.now() + 60_000) });

      expectRefusal(await redeem('TESTE-OCUPADO'), 409, 'BILLING_SUBSCRIPTION_BUSY');
      expect(await countOf('TESTE-OCUPADO')).toBe(0);
    });

    it('refuses a body with no code, or with anything beside it, as a body', async () => {
      expect((await call('POST', '/api/stores/padaria/subscription/coupon', owner, {})).statusCode).toBe(400);
      expect((await call('POST', '/api/stores/padaria/subscription/coupon', owner, { code: 'TESTE-X', freePeriodEndsAt: '2099-01-01' })).statusCode).toBe(400);
    });
  });

  describe('asked at the same time', () => {
    it('gives the last use of a coupon to one page of two asking at once, and refuses the other as used up', async () => {
      await makeCoupon('TESTE-ULTIMO', { maxRedemptions: 1 });
      await openShop('adega', owner, 'Adega');
      const coupon = holdRowOf((tx) => tx.$queryRaw`SELECT 1 FROM "platform_coupons" WHERE "code" = 'TESTE-ULTIMO' FOR UPDATE`);
      await coupon.held;

      const both = Promise.all([redeem('TESTE-ULTIMO', owner, 'padaria'), redeem('TESTE-ULTIMO', owner, 'adega')]);
      // Both vetted the coupon as it was — none used — and wait at its row to count themselves.
      await untilWaiting(2);
      await coupon.release();
      const answers = await both;

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)!.json<ApiErrorBody>().errorCode).toBe('BILLING_COUPON_EXHAUSTED');
      expect(await countOf('TESTE-ULTIMO')).toBe(1);
      expect(await prisma.platformCouponRedemption.count()).toBe(1);
      expect(await prisma.storeSubscription.count({ where: { freePeriodEndsAt: { not: null } } })).toBe(1);
    });

    it('gives a coupon of two uses to two pages of five asking at once', async () => {
      await makeCoupon('TESTE-DUAS', { maxRedemptions: 2 });
      const slugs = ['padaria', 'adega', 'banca', 'feira', 'horta'];
      for (const slug of slugs.slice(1)) await openShop(slug, owner, `Loja ${slug}`);
      const coupon = holdRowOf((tx) => tx.$queryRaw`SELECT 1 FROM "platform_coupons" WHERE "code" = 'TESTE-DUAS' FOR UPDATE`);
      await coupon.held;

      const all = Promise.all(slugs.map((slug) => redeem('TESTE-DUAS', owner, slug)));
      await untilWaiting(slugs.length);
      await coupon.release();
      const answers = await all;

      expect(answers.filter((answer) => answer.statusCode === 200)).toHaveLength(2);
      expect(answers.filter((answer) => answer.statusCode === 409).map((answer) => answer.json<ApiErrorBody>().errorCode)).toEqual(['BILLING_COUPON_EXHAUSTED', 'BILLING_COUPON_EXHAUSTED', 'BILLING_COUPON_EXHAUSTED']);
      expect(await countOf('TESTE-DUAS')).toBe(2);
      expect(await prisma.platformCouponRedemption.count()).toBe(2);
    });

    it('gives one page asking twice at once — with two coupons — one month, from one of them', async () => {
      await makeCoupon('TESTE-PRIMEIRO');
      await makeCoupon('TESTE-SEGUNDO');
      const { storeId } = await rowOf();
      const page = holdRowOf((tx) => tx.$queryRaw`SELECT 1 FROM "store_subscriptions" WHERE "storeId" = ${storeId}::uuid FOR UPDATE`);
      await page.held;

      const both = Promise.all([redeem('TESTE-PRIMEIRO'), redeem('TESTE-SEGUNDO')]);
      // Both found the page with no coupon used, and wait at its row.
      await untilWaiting(2);
      await page.release();
      const answers = await both;

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)!.json<ApiErrorBody>().errorCode).toBe('BILLING_COUPON_ALREADY_USED');
      expect((await countOf('TESTE-PRIMEIRO')) + (await countOf('TESTE-SEGUNDO'))).toBe(1);
      expect(await prisma.platformCouponRedemption.count()).toBe(1);
    });
  });

  describe('a page with a cycle chosen and not paid', () => {
    /** The page chose the monthly plan: a subscription stands at Asaas with its first charge waiting. */
    async function chooseMonthly(): Promise<string> {
      const saved = await call('PUT', '/api/billing/account', owner, person);
      if (saved.statusCode !== 200) throw new Error(`PUT /billing/account answered ${saved.statusCode}: ${saved.payload}`);
      const chosen = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' });
      if (chosen.statusCode !== 200) throw new Error(`PUT /subscription answered ${chosen.statusCode}: ${chosen.payload}`);
      const { asaasSubscriptionId } = await rowOf();
      asaas.calls.length = 0;
      return asaasSubscriptionId!;
    }

    it('takes that subscription out of Asaas first, and then gives the month: nothing stands at Asaas for the page', async () => {
      await makeCoupon('TESTE-FATURA');
      const made = await chooseMonthly();
      await setRow(trialEnded(2));

      const response = await redeem('TESTE-FATURA');

      expect(response.statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'subscriptionCharges', 'removeSubscription', 'subscriptionCharges']);
      expect(asaas.calls).not.toContain('createSubscription');
      expect(asaas.subscriptionsHeld.find((subscription) => subscription.id === made)).toMatchObject({ deleted: true });
      expect(asaas.standingSubscriptions).toEqual([]);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, planId: null, cycle: null, priceCents: null, firstDueDate: null, invoiceUrl: null, asaasSubscriptionClaimedUntil: null, nextCheckAt: null });
      expect(response.json<StoreSubscriptionAnswer>().subscription).toMatchObject({ invoiceUrl: null, cycle: null, freePeriodLastDay: monthAfter(today()), lock: null });
      expect(await countOf('TESTE-FATURA')).toBe(1);
    });

    it('removes nothing and gives nothing when that subscription was paid meanwhile: the payment is read instead', async () => {
      await makeCoupon('TESTE-PAGO');
      const made = await chooseMonthly();
      asaas.pay(made, 'RECEIVED');

      expectRefusal(await redeem('TESTE-PAGO'), 409, 'BILLING_SUBSCRIPTION_PAID');

      expect(asaas.calls).not.toContain('removeSubscription');
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([made]);
      expect(await countOf('TESTE-PAGO')).toBe(0);
      expect(await read()).toMatchObject({ status: 'ACTIVE', freePeriodEndsAt: null, couponRedeemedAt: null });
    });

    it("spends nothing when Asaas does not answer the removal, and the next try finishes it", async () => {
      await makeCoupon('TESTE-SILENCIO');
      const made = await chooseMonthly();
      asaas.failing('removeSubscription', new AsaasUnreachable('Asaas did not answer in time'));

      expectRefusal(await redeem('TESTE-SILENCIO'), 503, 'BILLING_UNREACHABLE');
      expect(await countOf('TESTE-SILENCIO')).toBe(0);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: made, asaasSubscriptionClaimedUntil: null, freePeriodEndsAt: null });

      expect((await redeem('TESTE-SILENCIO')).statusCode).toBe(200);
      expect(asaas.standingSubscriptions).toEqual([]);
      expect(await countOf('TESTE-SILENCIO')).toBe(1);
    });

    it('takes a coupon refused before anything is removed: the invoice the page has stays payable', async () => {
      await makeCoupon('TESTE-NAO', { disabledAt: new Date() });
      const made = await chooseMonthly();

      expectRefusal(await redeem('TESTE-NAO'), 409, 'BILLING_COUPON_DISABLED');

      expect(asaas.calls).toEqual([]);
      expect(asaas.standingSubscriptions.map((subscription) => subscription.id)).toEqual([made]);
      expect((await rowOf()).invoiceUrl).not.toBeNull();
    });

    it('forgets a subscription the row names that Asaas no longer holds, and gives the month', async () => {
      await makeCoupon('TESTE-SUMIU');
      await chooseMonthly();
      // Removed at Asaas's own panel: the customer, and its subscriptions with it.
      asaas.remove(asaas.standing[0]!.id);

      expect((await redeem('TESTE-SUMIU')).statusCode).toBe(200);
      expect(asaas.calls).toEqual(['subscriptions', 'subscription']);
      expect(await rowOf()).toMatchObject({ asaasSubscriptionId: null, freePeriodEndsAt: closeOf(monthAfter(dayOf((await rowOf()).trialEndsAt))) });
    });
  });
});
