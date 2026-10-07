// The limit is read when the controller module loads, so it has to be lowered before any import.
vi.hoisted(() => {
  process.env.FUNNEL_RATE_LIMIT_MAX = '60';
  process.env.FUNNEL_RATE_LIMIT_WINDOW = '1 minute';
});

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, CountedFunnelStep, SalesByOriginReport, StoreFunnelReport } from '@harness-monorepo/contracts';

// App
import { AsaasClient } from '../src/modules/integrations/asaas/asaas.client.js';
import { MetaConversionsClient } from '../src/modules/integrations/meta-pixel/meta-conversions.client.js';
import { OrderStatusMailer } from '../src/modules/orders/order-status-mailer.js';
import { AsaasEvents } from '../src/modules/payment-events/asaas-events.service.js';
import { OrderPaidMailer } from '../src/modules/payments/order-paid-mailer.js';
import { FunnelRetention } from '../src/modules/reports/funnel-retention.js';
import { FunnelService } from '../src/modules/reports/funnel.service.js';
import { shopDayOf } from '../src/modules/reports/report-period.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { FakeMeta } from './support/fake-meta.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const COUNT = '/api/stores/lessari/funnel-events';
const READ = '/api/stores/lessari/reports/funnel';
const DAY = 86_400_000;
const settled = { paymentMethod: 'MONEY', paymentChannel: 'OFFLINE' };

interface Row {
  slug: string;
  day: string;
  step: string;
  count: number;
}

/** Nothing here reaches Asaas or Meta: fakes stand where their HTTP clients would be. */
describe("a shop's funnel (BEELINK-276)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: AsaasEvents;
  let funnel: FunnelService;
  let shop: OnlineShop;
  let address = 0;
  const asaas = new FakeAsaas();
  const today = shopDayOf(new Date());

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas).overrideProvider(MetaConversionsClient).useValue(new FakeMeta()));
    prisma = app.get(PrismaService);
    events = app.get(AsaasEvents);
    funnel = app.get(FunnelService);
  });

  afterAll(async () => {
    await events.settled();
    await app.close();
  });

  beforeEach(async () => {
    await events.settled();
    await app.get(OrderStatusMailer).flush();
    await app.get(OrderPaidMailer).flush();
    await resetDatabase(prisma);
    asaas.reset();
    shop = await openOnlineShop(app, prisma, 'lessari');
    // A fresh address per test: the limiter's bucket lives in the app, not in the database.
    address += 1;
  });

  /** A shop window's count: no token, a visitor's address for the limiter, and whatever headers a test adds. */
  const tell = (payload: unknown, path = COUNT, headers: Record<string, string> = {}) =>
    app.inject({ method: 'POST', url: path, headers: { 'x-forwarded-for': `203.0.113.${address}`, ...headers }, payload: payload as object });
  const count = async (step: CountedFunnelStep, times = 1) => {
    for (let at = 0; at < times; at += 1) expect((await tell({ step })).statusCode).toBe(204);
  };
  const rows = () =>
    prisma.$queryRaw<Row[]>`SELECT s."slug", to_char(d."day", 'YYYY-MM-DD') AS "day", d."step"::text AS "step", d."count" FROM "store_funnel_days" d JOIN "stores" s ON s."id" = d."storeId" ORDER BY s."slug", d."day", d."step"`;
  /** A day's counters written as they would have been then. */
  const counted = (day: string, step: CountedFunnelStep, n: number, storeId = shop.storeId) =>
    prisma.$executeRaw`INSERT INTO "store_funnel_days" ("storeId", "day", "step", "count") VALUES (${storeId}::uuid, ${day}::date, ${step}::"FunnelStep", ${n})`;
  const read = (query = '', session: AuthSession | null = shop.owner, path = READ) => shop.call('GET', `${path}${query}`, session ?? undefined);
  const report = async (query = '') => {
    const response = await read(query);
    expect(response.statusCode).toBe(200);
    return response.json<StoreFunnelReport>();
  };
  const stepsOf = (answer: StoreFunnelReport) => Object.fromEntries(answer.steps.map(({ step, count: n }) => [step, n]));
  const register = () => shop.call('POST', '/api/stores/lessari/orders', shop.owner, { customer: { name: 'Caio Lima', phone: '(11) 97777-6666' }, items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'MONEY' });
  const placedAt = (number: number, at: Date) => prisma.order.update({ where: { storeId_number: { storeId: shop.storeId, number } }, data: { placedAt: at } });
  const daysAgo = (days: number) => shopDayOf(new Date(Date.now() - days * DAY));

  describe('counting a step', () => {
    it('is open to anyone, and keeps one row per shop, day and step — a number and nothing of who', async () => {
      await count('PAGE_VIEW', 3);
      await count('PRODUCT_VIEW', 2);
      await count('ADD_TO_CART');
      await count('CHECKOUT_START');

      expect(await rows()).toEqual([
        { slug: 'lessari', day: today, step: 'PAGE_VIEW', count: 3 },
        { slug: 'lessari', day: today, step: 'PRODUCT_VIEW', count: 2 },
        { slug: 'lessari', day: today, step: 'ADD_TO_CART', count: 1 },
        { slug: 'lessari', day: today, step: 'CHECKOUT_START', count: 1 },
      ]);
    });

    it('has no column to hold a visitor in: the table is the shop, the day, the step and the count', async () => {
      const columns = await prisma.$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name = 'store_funnel_days' ORDER BY ordinal_position`;

      expect(columns.map((column) => column.column_name)).toEqual(['storeId', 'day', 'step', 'count']);
    });

    it('stores nothing of the request around the step: not its address, its browser or its cookies', async () => {
      const response = await tell({ step: 'PAGE_VIEW' }, COUNT, { 'user-agent': 'Mozilla/5.0 (visitor-browser)', cookie: 'bl_cart=abc; _fbp=fb.1.2.3', referer: 'https://beelink.biz/lessari/produto/haze' });
      expect(response.statusCode).toBe(204);
      expect(response.body).toBe('');

      const kept = JSON.stringify(await prisma.$queryRaw`SELECT * FROM "store_funnel_days"`);
      for (const trace of ['203.0.113', 'visitor-browser', 'bl_cart', 'fb.1.2.3', 'haze']) expect(kept).not.toContain(trace);
    });

    it.each([
      ['a step it does not know', { step: 'PURCHASE' }],
      ['a step in other words', { step: 'page_view' }],
      ['no step', {}],
      ['a step and anything else — a visitor id, a page', { step: 'PAGE_VIEW', visitorId: 'abc' }],
      ['a count of its own', { step: 'PAGE_VIEW', count: 500 }],
      ['a list of steps', { step: ['PAGE_VIEW', 'PRODUCT_VIEW'] }],
    ])('refuses %s, and counts nothing', async (_what, payload) => {
      expect((await tell(payload)).statusCode).toBe(400);
      expect(await rows()).toEqual([]);
    });

    it('counts nothing for a slug that is no shop, and answers as if it had', async () => {
      expect((await tell({ step: 'PAGE_VIEW' }, '/api/stores/nenhuma/funnel-events')).statusCode).toBe(204);

      expect(await rows()).toEqual([]);
    });

    it('counts nothing for a site that sells nothing', async () => {
      const owner = await signUpAndSignIn(app, newEmail('site'));
      const site = { name: 'Asfalto Norte', slug: 'asfalto-norte', type: 'INSTITUTIONAL', template: 'servicos-b2b', socialNetworks: {}, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
      expect((await shop.call('POST', '/api/stores', owner, site)).statusCode).toBe(201);

      expect((await tell({ step: 'PAGE_VIEW' }, '/api/stores/asfalto-norte/funnel-events')).statusCode).toBe(204);

      expect(await rows()).toEqual([]);
    });

    it('adds up counts that arrive at the same instant: none is lost to another', async () => {
      const answers = await Promise.all(Array.from({ length: 40 }, () => tell({ step: 'PAGE_VIEW' })));

      expect(answers.map((answer) => answer.statusCode)).toEqual(Array.from({ length: 40 }, () => 204));
      expect(await rows()).toEqual([{ slug: 'lessari', day: today, step: 'PAGE_VIEW', count: 40 }]);
    });

    it("counts on the day of the shop's clock, and each shop on its own row", async () => {
      await openOnlineShop(app, prisma, 'vizinha');
      // 23:30 in Brasília on 5 October is already the 6th in UTC.
      await funnel.count('lessari', 'PAGE_VIEW', new Date('2026-10-06T02:30:00.000Z'));
      await funnel.count('lessari', 'PAGE_VIEW', new Date('2026-10-06T03:00:00.000Z'));
      await funnel.count('vizinha', 'PAGE_VIEW', new Date('2026-10-06T03:00:00.000Z'));

      expect(await rows()).toEqual([
        { slug: 'lessari', day: '2026-10-05', step: 'PAGE_VIEW', count: 1 },
        { slug: 'lessari', day: '2026-10-06', step: 'PAGE_VIEW', count: 1 },
        { slug: 'vizinha', day: '2026-10-06', step: 'PAGE_VIEW', count: 1 },
      ]);
    });

    it('stops counting from one address past its limit, and goes on counting from another', async () => {
      const answers = [];
      for (let at = 0; at < 62; at += 1) answers.push((await tell({ step: 'PAGE_VIEW' })).statusCode);

      expect(answers.filter((status) => status === 204)).toHaveLength(60);
      expect(answers.slice(60)).toEqual([429, 429]);
      expect((await tell({ step: 'PAGE_VIEW' })).json<ApiErrorBody>().errorCode).toBe('RATE_LIMITED');

      address += 1;
      expect((await tell({ step: 'PAGE_VIEW' })).statusCode).toBe(204);
      expect((await rows())[0]!.count).toBe(61);
    });

    it('goes with the shop when the shop goes', async () => {
      await count('PAGE_VIEW');
      await prisma.store.delete({ where: { id: shop.storeId } });

      expect(await rows()).toEqual([]);
    });
  });

  describe('who may read it', () => {
    it("is the owner's alone: no token, a shopper's and another shopkeeper's are refused", async () => {
      const stranger = await signUpAndSignIn(app, newEmail('outra-dona'));

      expect((await read('', null)).statusCode).toBe(401);
      expect((await read('', shop.shopper)).statusCode).toBe(401);
      expect([(await read('', stranger)).statusCode, (await read('', stranger)).json<ApiErrorBody>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await read('', shop.owner, '/api/stores/nenhuma/reports/funnel')).json<ApiErrorBody>().errorCode).toBe('STORE_NOT_FOUND');
    });

    it("never reads another shop's counters or orders", async () => {
      const other = await openOnlineShop(app, prisma, 'vizinha');
      await counted(today, 'PAGE_VIEW', 500, other.storeId);
      await other.place(settled);
      await count('PAGE_VIEW', 2);

      expect(stepsOf(await report())).toEqual({ PAGE_VIEW: 2, PRODUCT_VIEW: 0, ADD_TO_CART: 0, CHECKOUT_START: 0, PURCHASE: 0 });
      expect(stepsOf((await other.call('GET', '/api/stores/vizinha/reports/funnel', other.owner)).json<StoreFunnelReport>())).toMatchObject({ PAGE_VIEW: 500, PURCHASE: 1 });
      expect((await other.call('GET', READ, other.owner)).statusCode).toBe(403);
    });
  });

  describe('the steps', () => {
    it('answers the five in order, the counted ones summed over the period, and how long they are kept', async () => {
      await counted(daysAgo(2), 'PAGE_VIEW', 100);
      await counted(daysAgo(1), 'PAGE_VIEW', 50);
      await counted(daysAgo(1), 'PRODUCT_VIEW', 40);
      await counted(daysAgo(1), 'ADD_TO_CART', 10);
      await count('PAGE_VIEW', 2);
      await count('CHECKOUT_START');
      await shop.place(settled);

      expect(await report()).toEqual({
        from: daysAgo(29),
        to: today,
        steps: [
          { step: 'PAGE_VIEW', count: 152 },
          { step: 'PRODUCT_VIEW', count: 40 },
          { step: 'ADD_TO_CART', count: 10 },
          { step: 'CHECKOUT_START', count: 1 },
          { step: 'PURCHASE', count: 1 },
        ],
        panelSales: 0,
        countingSince: daysAgo(2),
        retentionMonths: 13,
      });
    });

    it('answers a shop nothing was ever counted at with zeros and no first day — its orders are no funnel', async () => {
      await shop.place(settled);
      expect((await register()).statusCode).toBe(201);

      expect(await report()).toMatchObject({ steps: [0, 0, 0, 0, 0].map((n, at) => ({ step: ['PAGE_VIEW', 'PRODUCT_VIEW', 'ADD_TO_CART', 'CHECKOUT_START', 'PURCHASE'][at], count: n })), panelSales: 0, countingSince: null });
    });

    it('counts both days of the period whole, and nothing outside it', async () => {
      await counted('2026-08-31', 'PAGE_VIEW', 1);
      await counted('2026-09-01', 'PAGE_VIEW', 10);
      await counted('2026-09-30', 'PAGE_VIEW', 100);
      await counted('2026-10-01', 'PAGE_VIEW', 1000);

      const answer = await report('?from=2026-09-01&to=2026-09-30');

      expect(stepsOf(answer).PAGE_VIEW).toBe(110);
      // The first day counted is the shop's, whatever period is asked.
      expect(answer).toMatchObject({ from: '2026-09-01', to: '2026-09-30', countingSince: '2026-08-31' });
    });

    it.each(['?from=2026-10-01', '?from=2026-10-02&to=2026-10-01', '?from=2026-02-30&to=2026-03-01', '?from=2025-01-01&to=2026-01-02', '?from=ontem&to=hoje'])('refuses the period %s as every report does', async (query) => {
      const response = await read(query);

      expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([400, 'REPORT_PERIOD_INVALID']);
    });
  });

  describe('the purchase', () => {
    beforeEach(() => counted(daysAgo(10), 'PAGE_VIEW', 1));

    it("is the shop's orders, never a count: placed from the cart, by the rule the sales by origin read", async () => {
      await shop.place(settled);
      await shop.place(settled);
      await shop.place(settled);
      // Cancelled: no sale.
      expect((await shop.cancel(3)).statusCode).toBeLessThan(300);
      // Charged online and not paid: no sale yet.
      await shop.place({});

      const answer = await report();
      const origins = (await shop.call('GET', '/api/stores/lessari/reports/sales-by-origin', shop.owner)).json<SalesByOriginReport>();

      expect(stepsOf(answer).PURCHASE).toBe(2);
      expect(origins.totals.orders).toBe(2);
    });

    it('leaves a sale registered in the panel out of the funnel, and says how many there were', async () => {
      await shop.place(settled);
      expect((await register()).statusCode).toBe(201);
      expect((await register()).statusCode).toBe(201);

      const answer = await report();

      expect(stepsOf(answer).PURCHASE).toBe(1);
      expect(answer.panelSales).toBe(2);
      // Together they are what the other report calls the shop's sales.
      expect((await shop.call('GET', '/api/stores/lessari/reports/sales-by-origin', shop.owner)).json<SalesByOriginReport>().totals.orders).toBe(3);
    });

    it('counts an order on the day it was placed, inside the period', async () => {
      await shop.place(settled);
      await shop.place(settled);
      await placedAt(2, new Date(Date.now() - 5 * DAY));

      expect(stepsOf(await report(`?from=${daysAgo(6)}&to=${daysAgo(4)}`)).PURCHASE).toBe(1);
      expect(stepsOf(await report(`?from=${daysAgo(3)}&to=${today}`)).PURCHASE).toBe(1);
      expect(stepsOf(await report()).PURCHASE).toBe(2);
    });

    it('counts no order from before the first day anything was counted: there is no visit to set it against', async () => {
      await shop.place(settled);
      await shop.place(settled);
      expect((await register()).statusCode).toBe(201);
      // One order and the panel's sale from before the counting began, ten days ago.
      await placedAt(1, new Date(Date.now() - 20 * DAY));
      await placedAt(3, new Date(Date.now() - 20 * DAY));

      const answer = await report();

      expect(answer.countingSince).toBe(daysAgo(10));
      expect(stepsOf(answer).PURCHASE).toBe(1);
      expect(answer.panelSales).toBe(0);
      // A period that ends before the counting began holds no purchase at all.
      expect(stepsOf(await report(`?from=${daysAgo(25)}&to=${daysAgo(15)}`)).PURCHASE).toBe(0);
    });
  });

  describe('how long the counters are kept', () => {
    it('deletes the days older than thirteen months, and keeps the day thirteen months back', async () => {
      const now = new Date('2026-10-06T15:00:00.000Z');
      const other = await openOnlineShop(app, prisma, 'vizinha');
      await counted('2025-01-01', 'PAGE_VIEW', 3, other.storeId);
      await counted('2025-09-05', 'PAGE_VIEW', 7);
      await counted('2025-09-05', 'ADD_TO_CART', 1);
      await counted('2025-09-06', 'PAGE_VIEW', 8);
      await counted('2026-10-06', 'PAGE_VIEW', 9);

      expect(await app.get(FunnelRetention).prune(now)).toBe(3);

      expect((await rows()).map((row) => [row.day, row.step, row.count])).toEqual([
        ['2025-09-06', 'PAGE_VIEW', 8],
        ['2026-10-06', 'PAGE_VIEW', 9],
      ]);
    });

    it('works once per day in a process, however often the clock calls it', async () => {
      const retention = app.get(FunnelRetention);
      const now = new Date('2027-01-10T15:00:00.000Z');
      await counted('2025-01-01', 'PAGE_VIEW', 1);

      expect(await retention.pruneDue(now)).toBe(1);
      await counted('2025-01-02', 'PAGE_VIEW', 1);
      expect(await retention.pruneDue(new Date(now.getTime() + 60_000))).toBe(0);
      expect(await rows()).toHaveLength(1);

      // The next day it works again.
      expect(await retention.pruneDue(new Date(now.getTime() + DAY))).toBe(1);
    });
  });
});
