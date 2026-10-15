// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PageLockedDetails, ProductDetail, Store, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { BillingRoutine } from '../src/modules/billing/billing-routine.js';
import { PageLocks } from '../src/modules/billing/page-locks.service.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
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

  /** What a refusal said, as one value a test compares. */
  const refusal = (response: { statusCode: number; json: <T>() => T }) => [response.statusCode, response.json<ApiErrorBody>().errorCode, response.json<ApiErrorBody>().details];

  describe("the panel of a locked page, to its owner", () => {
    /** One route of each kind the panel reaches a page by: reads and writes, the shell's own among them. */
    const panelRoutes: [method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, payload?: object][] = [
      ['GET', '/api/stores/padaria'],
      ['PUT', '/api/stores/padaria/colors', { background: '#ffffff', primary: '#000000', header: '#ffffff', footer: '#000000' }],
      ['GET', '/api/stores/padaria/products'],
      ['POST', '/api/stores/padaria/products', { name: 'Pão', priceCents: 500 }],
      ['GET', '/api/stores/padaria/product-categories'],
      ['GET', '/api/stores/padaria/orders?status=RECEIVED&pageSize=5'],
      ['GET', '/api/stores/padaria/conversations?filter=UNREAD'],
      ['GET', '/api/stores/padaria/panel-counts'],
      ['POST', '/api/stores/padaria/realtime/ticket'],
      ['GET', '/api/stores/padaria/customers'],
      ['GET', '/api/stores/padaria/promotions'],
      ['GET', '/api/stores/padaria/coupons'],
      ['GET', '/api/stores/padaria/cashback'],
      ['GET', '/api/stores/padaria/delivery'],
      ['GET', '/api/stores/padaria/integrations/asaas'],
      ['GET', '/api/stores/padaria/custom-domain'],
      ['GET', '/api/stores/padaria/reviews'],
      ['GET', '/api/stores/padaria/leads'],
      ['GET', '/api/stores/padaria/pages'],
      ['GET', '/api/stores/padaria/reports/sales-by-origin'],
    ];

    it.each(panelRoutes)('refuses %s %s with PAGE_LOCKED and why, and writes nothing', async (method, url, payload) => {
      await setRow(trialEnded());
      const products = await prisma.product.count();

      const response = await call(method, url, owner, payload);

      expect(refusal(response)).toEqual([403, 'PAGE_LOCKED', { reason: 'TRIAL_EXPIRED' } satisfies PageLockedDetails]);
      expect(await prisma.product.count()).toBe(products);
    });

    it('answers its subscription, the plans, the billing account, the account and its pages as ever — and a new page is born open', async () => {
      await setRow(trialEnded());

      expect((await call('GET', '/api/stores/padaria/subscription', owner)).statusCode).toBe(200);
      expect((await call('POST', '/api/stores/padaria/subscription/check', owner)).statusCode).toBe(200);
      expect((await call('PUT', '/api/stores/padaria/subscription', owner, { cycle: 'MONTHLY' })).json<ApiErrorBody>().errorCode).toBe('BILLING_ACCOUNT_REQUIRED');
      expect((await call('GET', '/api/billing/plans')).statusCode).toBe(200);
      expect((await call('GET', '/api/billing/account', owner)).statusCode).toBe(200);
      expect((await call('GET', '/api/users/me', owner)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/mine', owner)).json<Store[]>().map((store) => store.slug)).toEqual(['padaria']);
      expect((await call('POST', '/api/stores', owner, { name: 'Adega', slug: 'adega', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } })).statusCode).toBe(201);
      expect((await call('GET', '/api/stores/adega/products', owner)).statusCode).toBe(200);
    });

    it("leaves the same owner's other page open: the plan, and the lock, are each page's", async () => {
      await openShop('adega', owner, 'Adega');
      await setRow(trialEnded());

      expect(refusal(await call('GET', '/api/stores/padaria/products', owner))[1]).toBe('PAGE_LOCKED');
      expect((await call('GET', '/api/stores/adega/products', owner)).statusCode).toBe(200);
    });

    it('tells nobody else a page is locked: a stranger, a page nobody holds and no session are answered as ever', async () => {
      await setRow(trialEnded());
      const stranger = await signUpAndSignIn(app, newEmail('estranha'));

      expect(refusal(await call('GET', '/api/stores/padaria/products', stranger)).slice(0, 2)).toEqual([403, 'STORE_FORBIDDEN']);
      expect(refusal(await call('GET', '/api/stores/nenhuma/products', owner)).slice(0, 2)).toEqual([404, 'STORE_NOT_FOUND']);
      expect(refusal(await call('GET', '/api/stores/padaria/products')).slice(0, 2)).toEqual([401, 'AUTH_UNAUTHENTICATED']);
    });

    it('is open through its grace, and locked for being suspended once it ran out', async () => {
      await setRow({ status: 'PAST_DUE', currentPeriodEndsAt: closeOf(plusDays(today(), -3)) });
      expect((await call('GET', '/api/stores/padaria/products', owner)).statusCode).toBe(200);

      await setRow({ currentPeriodEndsAt: closeOf(plusDays(today(), -8)) });
      expect(refusal(await call('GET', '/api/stores/padaria/products', owner))).toEqual([403, 'PAGE_LOCKED', { reason: 'SUSPENDED' }]);
    });

    it('is open while a cancelled page’s paid period runs, and locked once it is over', async () => {
      await setRow({ status: 'CANCELED', currentPeriodEndsAt: closeOf(plusDays(today(), 2)) });
      expect((await call('GET', '/api/stores/padaria/products', owner)).statusCode).toBe(200);

      await setRow({ currentPeriodEndsAt: closeOf(plusDays(today(), -1)) });
      expect(refusal(await call('GET', '/api/stores/padaria/products', owner))).toEqual([403, 'PAGE_LOCKED', { reason: 'CANCELED' }]);
    });

    it('opens on the very next request once the page is paid, with no routine to wait for', async () => {
      await setRow(trialEnded());
      expect(refusal(await call('GET', '/api/stores/padaria/products', owner))[1]).toBe('PAGE_LOCKED');

      await setRow({ status: 'ACTIVE', currentPeriodEndsAt: closeOf(plusDays(today(), 30)) });

      expect((await call('GET', '/api/stores/padaria/products', owner)).statusCode).toBe(200);
    });

    it('never locks an exempt page, nor one inside a free month', async () => {
      await setRow({ ...trialEnded(40), status: 'EXEMPT' });
      expect((await call('GET', '/api/stores/padaria/products', owner)).statusCode).toBe(200);

      await setRow({ ...trialEnded(40), status: 'TRIAL_EXPIRED', freePeriodEndsAt: new Date(Date.now() + DAY) });
      expect((await call('GET', '/api/stores/padaria/products', owner)).statusCode).toBe(200);

      await setRow({ freePeriodEndsAt: new Date(Date.now() - 1) });
      expect(refusal(await call('GET', '/api/stores/padaria/products', owner))[1]).toBe('PAGE_LOCKED');
    });

    it('never locks a page from before subscriptions existed', async () => {
      await prisma.storeSubscription.deleteMany({});

      expect((await call('GET', '/api/stores/padaria/products', owner)).statusCode).toBe(200);
    });
  });

  describe("the shop window of a locked page", () => {
    let shopper: AuthSession;
    let variantId: string;
    let ordered: number;

    beforeEach(async () => {
      variantId = (await call('POST', '/api/stores/padaria/products', owner, { name: 'Pão', priceCents: 500 })).json<ProductDetail>().variants[0]!.id;
      const email = newEmail('cliente');
      await call('POST', '/api/stores/padaria/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
      await verifyEmailOf(app, email);
      shopper = (await call('POST', '/api/stores/padaria/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
      await call('PATCH', '/api/stores/padaria/customer/me', shopper, { phone: '(11) 98888-7777' });
      const placed = await call('POST', '/api/stores/padaria/customer/orders', shopper, { items: [{ variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' });
      if (placed.statusCode !== 201) throw new Error(`POST customer/orders answered ${placed.statusCode}: ${placed.payload}`);
      ordered = placed.json<{ number: number }>().number;
    });

    /** What a visitor or a customer asks a shop window for, that sells. */
    const sellingRoutes = (): [method: 'GET' | 'POST' | 'PUT', url: string, session: 'visitor' | 'customer', payload?: object][] => [
      ['GET', '/api/stores/padaria/catalog', 'visitor'],
      ['GET', '/api/stores/padaria/catalog/pao', 'visitor'],
      ['GET', `/api/stores/padaria/cart?produto=${variantId}`, 'visitor'],
      ['POST', '/api/stores/padaria/cart/quote', 'visitor', { items: [{ variantId, quantity: 1 }] }],
      ['GET', '/api/stores/padaria/offers', 'visitor'],
      ['GET', '/api/stores/padaria/payment-options', 'visitor'],
      ['GET', '/api/stores/padaria/landings/promo', 'visitor'],
      ['POST', '/api/stores/padaria/shipping/quote', 'visitor', { zipCode: '01310-930', items: [{ variantId, quantity: 1 }] }],
      ['POST', '/api/stores/padaria/contact', 'visitor', { name: 'Ana', whatsapp: '(11) 98888-7777' }],
      ['POST', '/api/stores/padaria/funnel-events', 'visitor', { step: 'VISIT' }],
      ['POST', '/api/stores/padaria/customer/cart/quote', 'customer', { items: [{ variantId, quantity: 1 }] }],
      ['POST', '/api/stores/padaria/customer/offers', 'customer', { items: [{ variantId, quantity: 1 }] }],
      ['POST', '/api/stores/padaria/customer/orders/quote', 'customer', { items: [{ variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' }],
      ['POST', '/api/stores/padaria/customer/orders', 'customer', { items: [{ variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' }],
      ['GET', `/api/stores/padaria/customer/orders/${ordered}/reorder`, 'customer'],
      ['GET', '/api/stores/padaria/customer/favorites', 'customer'],
    ];

    it('refuses what sells with STORE_UNAVAILABLE, and never says why — a new order above all', async () => {
      await setRow(trialEnded());
      const orders = await prisma.order.count();

      for (const [method, url, who, payload] of sellingRoutes()) {
        const response = await call(method, url, who === 'customer' ? shopper : undefined, payload);
        expect([url, response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([url, 403, 'STORE_UNAVAILABLE']);
        expect(response.json<ApiErrorBody>().details).toBeUndefined();
        expect(response.payload).not.toMatch(/TRIAL_EXPIRED|SUSPENDED|CANCELED|trial|pay/i);
      }
      expect(await prisma.order.count()).toBe(orders);
    });

    it('keeps what a customer already has: the account, the orders, paying and talking about one, cancelling it', async () => {
      await setRow(trialEnded());

      expect((await call('GET', '/api/stores/padaria/customer/me', shopper)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria/customer/orders', shopper)).json<{ orders: unknown[] }>().orders).toHaveLength(1);
      expect((await call('GET', `/api/stores/padaria/customer/orders/${ordered}`, shopper)).statusCode).toBe(200);
      expect((await call('GET', `/api/stores/padaria/customer/orders/${ordered}/payment`, shopper)).statusCode).not.toBe(403);
      expect((await call('GET', `/api/stores/padaria/customer/orders/${ordered}/conversation`, shopper)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria/customer/addresses', shopper)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria/customer/cashback', shopper)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria/customer/reviews', shopper)).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria/customer/me/data', shopper)).statusCode).toBe(200);
      expect((await call('POST', '/api/stores/padaria/customer/refresh', undefined, { refreshToken: shopper.refreshToken })).statusCode).toBe(200);
      expect((await call('POST', `/api/stores/padaria/customer/orders/${ordered}/cancel`, shopper)).statusCode).toBe(200);
    });

    it('lets a customer sign in to reach their orders', async () => {
      await setRow(trialEnded());
      const email = newEmail('outra');
      const registered = await call('POST', '/api/stores/padaria/customer/register', undefined, { name: 'Cris Cliente', email, password: PASSWORD });

      expect(registered.statusCode).toBeLessThan(300);
      await verifyEmailOf(app, email);
      expect((await call('POST', '/api/stores/padaria/customer/login', undefined, { email, password: PASSWORD })).statusCode).toBe(200);
    });

    it("answers who the shop is and nothing it sells on the shop's public read, kept for a minute at most", async () => {
      await prisma.store.update({ where: { slug: 'padaria' }, data: { logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png' } });
      await setRow(trialEnded());
      const before = Date.now();

      const response = await call('GET', '/api/stores/padaria/public');

      expect(response.statusCode).toBe(200);
      expect(response.json<Store>()).toMatchObject({ slug: 'padaria', name: 'Padaria da Lia', logoUrl: 'https://res.cloudinary.com/demo/image/upload/logo.png', unavailable: true, sections: [], pages: [], cashback: null, metaPixelId: null, googleAnalyticsId: null });
      const keptUntil = Date.parse(String(response.headers['x-lock-changes-at']));
      expect(keptUntil).toBeGreaterThanOrEqual(before + 60_000);
      expect(keptUntil).toBeLessThanOrEqual(Date.now() + 60_000);
      expect(response.payload).not.toMatch(/TRIAL_EXPIRED|SUSPENDED|CANCELED/);
    });

    it("says on an open page's public read when it may lock, and nothing of being unavailable", async () => {
      const inTrial = await call('GET', '/api/stores/padaria/public');
      expect(inTrial.json<Record<string, unknown>>()).not.toHaveProperty('unavailable');
      expect(inTrial.headers['x-lock-changes-at']).toBe((await rowOf()).trialEndsAt.toISOString());

      const periodEnd = closeOf(plusDays(today(), -2));
      await setRow({ status: 'PAST_DUE', currentPeriodEndsAt: periodEnd });
      const inGrace = await call('GET', '/api/stores/padaria/public');
      expect(inGrace.json<Record<string, unknown>>()).not.toHaveProperty('unavailable');
      expect(inGrace.headers['x-lock-changes-at']).toBe(new Date(periodEnd.getTime() + 7 * DAY).toISOString());

      await setRow({ status: 'EXEMPT' });
      expect((await call('GET', '/api/stores/padaria/public')).headers['x-lock-changes-at']).toBeUndefined();
    });

    it('stays open through a page’s grace, a new order included', async () => {
      await setRow({ status: 'PAST_DUE', currentPeriodEndsAt: closeOf(plusDays(today(), -3)) });

      expect((await call('GET', '/api/stores/padaria/catalog')).statusCode).toBe(200);
      expect((await call('POST', '/api/stores/padaria/customer/orders', shopper, { items: [{ variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).statusCode).toBe(201);
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
