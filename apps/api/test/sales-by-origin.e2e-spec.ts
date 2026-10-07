// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, SalesByOriginReport, SalesByOriginRow } from '@harness-monorepo/contracts';

// App
import { AsaasClient } from '../src/modules/integrations/asaas/asaas.client.js';
import { MetaConversionsClient } from '../src/modules/integrations/meta-pixel/meta-conversions.client.js';
import { OrderStatusMailer } from '../src/modules/orders/order-status-mailer.js';
import { AsaasEvents } from '../src/modules/payment-events/asaas-events.service.js';
import { OrderPaidMailer } from '../src/modules/payments/order-paid-mailer.js';
import { shopDayOf } from '../src/modules/reports/report-period.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { FakeMeta } from './support/fake-meta.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const PATH = '/api/stores/lessari/reports/sales-by-origin';
const DAY = 86_400_000;
/** The product of `openOnlineShop`. */
const PRICE = 5990;

const settled = { paymentMethod: 'MONEY', paymentChannel: 'OFFLINE' };
const facebook = { source: 'facebook', medium: 'cpc', campaign: 'Black Friday', arrivedAt: new Date(Date.now() - DAY).toISOString() };
const instagram = { source: 'instagram', medium: 'social', campaign: 'bio', arrivedAt: new Date(Date.now() - DAY).toISOString() };
/** The buyer's yes, with an ad's click kept: what makes `originMetaAd` true. */
const clicked = { fbclid: 'IwAR0abc-DEF_123', clickedAt: new Date(Date.now() - DAY).toISOString(), userAgent: 'Mozilla/5.0 (e2e)', pageUrl: 'https://beelink.biz/lessari/carrinho' };

const line = (row: Partial<SalesByOriginRow>): SalesByOriginRow => ({ kind: 'CAMPAIGN', source: null, medium: null, campaign: null, orders: 1, metaAdOrders: 0, revenueCents: PRICE, ...row });

/** Nothing here reaches Asaas or Meta: fakes stand where their HTTP clients would be. */
describe("a shop's sales by where their buyers came from (BEELINK-275)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let events: AsaasEvents;
  let shop: OnlineShop;
  const asaas = new FakeAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas).overrideProvider(MetaConversionsClient).useValue(new FakeMeta()));
    prisma = app.get(PrismaService);
    events = app.get(AsaasEvents);
  });

  afterAll(async () => {
    await events.settled();
    await app.close();
  });

  beforeEach(async () => {
    await events.settled();
    // The e-mails the last test's moves owe, sent before its rows are wiped from under them.
    await app.get(OrderStatusMailer).flush();
    await app.get(OrderPaidMailer).flush();
    await resetDatabase(prisma);
    asaas.reset();
    shop = await openOnlineShop(app, prisma, 'lessari');
  });

  /** `null` is nobody: no token at all. */
  const read = (query = '', session: AuthSession | null = shop.owner, path = PATH) => shop.call('GET', `${path}${query}`, session ?? undefined);
  const report = async (query = '') => {
    const response = await read(query);
    expect(response.statusCode).toBe(200);
    return response.json<SalesByOriginReport>();
  };
  /** A sale the shopkeeper registers in the panel. */
  const register = (quantity = 1) => shop.call('POST', '/api/stores/lessari/orders', shop.owner, { customer: { name: 'Caio Lima', phone: '(11) 97777-6666' }, items: [{ variantId: shop.variantId, quantity }], fulfillment: 'PICKUP', paymentMethod: 'MONEY' });
  const placedAt = (number: number, at: string) => prisma.order.update({ where: { storeId_number: { storeId: shop.storeId, number } }, data: { placedAt: new Date(at) } });
  /** Asaas tells the order's charge was received, and whatever that led to is finished. */
  async function pay(number: number) {
    const orderId = await shop.orderId(number);
    const chargeId = (await shop.rows()).find((row) => row.orderId === orderId)!.providerId!;
    asaas.pay(chargeId);
    expect((await shop.event({ id: `evt_${number}`, event: 'PAYMENT_RECEIVED', payment: { id: chargeId, externalReference: orderId } })).statusCode).toBe(200);
    await events.settled();
    await app.get(OrderPaidMailer).flush();
  }

  describe('who may read it', () => {
    it('is the owner\'s alone: no token, a shopper\'s and another shopkeeper\'s are refused', async () => {
      const stranger = await signUpAndSignIn(app, newEmail('outra-dona'));

      expect((await read('', null)).statusCode).toBe(401);
      expect((await read('', shop.shopper)).statusCode).toBe(401);
      expect([(await read('', stranger)).statusCode, (await read('', stranger)).json<ApiErrorBody>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await read('', shop.owner, '/api/stores/nenhuma/reports/sales-by-origin')).json<ApiErrorBody>().errorCode).toBe('STORE_NOT_FOUND');
    });

    it("never counts another shop's orders, whatever their campaign", async () => {
      const other = await openOnlineShop(app, prisma, 'vizinha');
      await other.place({ ...settled, origin: facebook, marketingConsent: clicked });
      await other.call('POST', '/api/stores/vizinha/orders', other.owner, { customer: { name: 'Caio Lima', phone: '(11) 97777-6666' }, items: [{ variantId: other.variantId, quantity: 3 }], fulfillment: 'PICKUP', paymentMethod: 'MONEY' });
      await shop.place({ ...settled, origin: instagram });

      expect((await report()).rows).toEqual([line({ source: 'instagram', medium: 'social', campaign: 'bio' })]);
      expect((await report()).totals).toEqual({ orders: 1, revenueCents: PRICE });
      // And the neighbour reads its own two, with the same path under its own slug.
      expect((await other.call('GET', '/api/stores/vizinha/reports/sales-by-origin', other.owner)).json<SalesByOriginReport>().totals).toEqual({ orders: 2, revenueCents: 4 * PRICE });
      expect((await other.call('GET', PATH, other.owner)).statusCode).toBe(403);
    });
  });

  describe('the lines', () => {
    it('groups by source, medium and campaign, counts the ad clicks kept, and adds up to the totals — highest revenue first', async () => {
      // facebook / cpc / Black Friday: three orders, four units, one with an ad's click kept.
      await shop.place({ ...settled, origin: facebook, marketingConsent: clicked });
      await shop.place({ ...settled, origin: facebook, items: [{ variantId: shop.variantId, quantity: 2 }] });
      // The yes without a click: consent stood, no ad brought them.
      await shop.place({ ...settled, origin: facebook, marketingConsent: { userAgent: 'Mozilla/5.0 (e2e)' } });
      await shop.place({ ...settled, origin: instagram });
      // An ad's link with no labels, and a yes: a campaign line made of the click alone.
      await shop.place({ ...settled, marketingConsent: clicked, items: [{ variantId: shop.variantId, quantity: 3 }] });
      // Nothing at all: a direct visit.
      await shop.place({ ...settled, items: [{ variantId: shop.variantId, quantity: 2 }] });
      await shop.place(settled);
      expect((await register(5)).statusCode).toBe(201);

      const answer = await report();

      expect(answer.rows).toEqual([
        line({ kind: 'PANEL', orders: 1, revenueCents: 5 * PRICE }),
        line({ source: 'facebook', medium: 'cpc', campaign: 'Black Friday', orders: 3, metaAdOrders: 1, revenueCents: 4 * PRICE }),
        // Equal revenue: the line with more orders first.
        line({ kind: 'DIRECT', orders: 2, revenueCents: 3 * PRICE }),
        line({ orders: 1, metaAdOrders: 1, revenueCents: 3 * PRICE }),
        line({ source: 'instagram', medium: 'social', campaign: 'bio' }),
      ]);
      expect(answer.totals).toEqual({ orders: 8, revenueCents: 16 * PRICE });
      expect(answer.totals.revenueCents).toBe(answer.rows.reduce((sum, row) => sum + row.revenueCents, 0));
    });

    it('keeps apart what differs in any of the three labels, a campaign by its case too, and never splits by content or term', async () => {
      await shop.place({ ...settled, origin: { ...facebook, content: 'video-1', term: 'whey' } });
      await shop.place({ ...settled, origin: { ...facebook, content: 'carrossel' } });
      await shop.place({ ...settled, origin: { ...facebook, campaign: 'black friday' } });
      await shop.place({ ...settled, origin: { ...facebook, medium: 'social' } });
      await shop.place({ ...settled, origin: { source: 'facebook', arrivedAt: facebook.arrivedAt } });
      // Written "FaceBook" in the link: the first half stores source and medium in lower case.
      await shop.place({ ...settled, origin: { ...facebook, source: 'FaceBook', medium: 'CPC' } });

      const lines = (await report()).rows.map((row) => [row.source, row.medium, row.campaign, row.orders]);

      expect(lines).toEqual([
        ['facebook', 'cpc', 'Black Friday', 3],
        ['facebook', 'cpc', 'black friday', 1],
        ['facebook', 'social', 'Black Friday', 1],
        ['facebook', null, null, 1],
      ]);
    });

    it('hands a label back as it was written, as text', async () => {
      const campaign = '<img src=x onerror=alert(1)>';
      await shop.place({ ...settled, origin: { ...facebook, campaign } });

      expect((await report()).rows[0]!.campaign).toBe(campaign);
    });

    it('answers an empty period with no line and zeros', async () => {
      expect(await report('?from=2026-01-01&to=2026-01-31')).toEqual({ from: '2026-01-01', to: '2026-01-31', rows: [], totals: { orders: 0, revenueCents: 0 } });
    });

    it('says nothing of a sale registered in the panel but that it is one, even were labels written on it', async () => {
      expect((await register()).statusCode).toBe(201);
      // No route writes these on a panel sale; by hand, to show the line does not read them.
      await prisma.order.updateMany({ where: { storeId: shop.storeId }, data: { utmSource: 'facebook', utmCampaign: 'x', originMetaAd: true } });

      expect((await report()).rows).toEqual([line({ kind: 'PANEL' })]);
    });
  });

  describe('which orders are sales', () => {
    it('leaves out a cancelled order, by the customer or by the shop', async () => {
      await shop.place({ ...settled, origin: facebook });
      await shop.place({ ...settled, origin: facebook });
      await shop.place({ ...settled, origin: instagram });
      expect((await shop.cancel(1)).statusCode).toBeLessThan(300);
      expect((await shop.call('PATCH', '/api/stores/lessari/orders/3/status', shop.owner, { status: 'CANCELLED' })).statusCode).toBe(200);

      const answer = await report();

      expect(answer.rows).toEqual([line({ source: 'facebook', medium: 'cpc', campaign: 'Black Friday' })]);
      expect(answer.totals).toEqual({ orders: 1, revenueCents: PRICE });
    });

    it('counts an order settled with the shop in every status but cancelled', async () => {
      await shop.place({ ...settled, origin: facebook });
      for (const status of ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'] as const) {
        expect((await shop.call('PATCH', '/api/stores/lessari/orders/1/status', shop.owner, { status })).statusCode).toBe(200);
        expect((await report()).totals.orders, status).toBe(1);
      }
    });

    it('counts an order charged online only once it is paid — on the day it was placed', async () => {
      await shop.place({ origin: facebook });

      expect((await report()).totals).toEqual({ orders: 0, revenueCents: 0 });

      await placedAt(1, new Date(Date.now() - 2 * DAY).toISOString());
      await pay(1);

      const day = shopDayOf(new Date(Date.now() - 2 * DAY));
      expect((await report(`?from=${day}&to=${day}`)).rows).toEqual([line({ source: 'facebook', medium: 'cpc', campaign: 'Black Friday' })]);
      const today = shopDayOf(new Date());
      expect((await report(`?from=${today}&to=${today}`)).totals.orders).toBe(0);
    });

    // The charge's status is set by hand below: a refund's own road is `order-refunds.e2e-spec.ts`'s.
    it.each([
      ['PENDING', 0],
      ['OVERDUE', 0],
      ['CONFIRMED', 1],
      ['RECEIVED', 1],
      ['PARTIALLY_REFUNDED', 1],
      ['REFUNDED', 0],
      ['CANCELLED', 0],
      ['FAILED', 0],
    ] as const)('reads a charge that is %s as %i sale, for the whole total', async (status, sales) => {
      await shop.place({ origin: facebook });
      await prisma.orderPayment.updateMany({ where: { storeId: shop.storeId }, data: { status } });

      expect((await report()).totals).toEqual({ orders: sales, revenueCents: sales * PRICE });
    });

    it('counts an order charged online with nothing to pay as it is placed, and one with no charge yet not at all', async () => {
      await shop.place({ origin: facebook });
      await shop.place({ origin: instagram });
      await prisma.orderPayment.deleteMany({ where: { storeId: shop.storeId } });
      // What a coupon or credit covering a closed total leaves: nothing to charge. Written by hand.
      await prisma.order.update({ where: { storeId_number: { storeId: shop.storeId, number: 1 } }, data: { totalCents: 0, cashbackUsedCents: PRICE } });

      expect((await report()).rows).toEqual([line({ source: 'facebook', medium: 'cpc', campaign: 'Black Friday', revenueCents: 0 })]);
    });
  });

  describe('the period', () => {
    it("counts both days whole on the shop's clock: midnight in Brasília is 03:00 UTC", async () => {
      for (let number = 1; number <= 4; number += 1) await shop.place({ ...settled, origin: facebook });
      await placedAt(1, '2026-09-30T02:59:59.999Z');
      await placedAt(2, '2026-09-30T03:00:00.000Z');
      await placedAt(3, '2026-10-01T02:59:59.999Z');
      await placedAt(4, '2026-10-01T03:00:00.000Z');

      expect(await report('?from=2026-09-30&to=2026-09-30')).toMatchObject({ from: '2026-09-30', to: '2026-09-30', totals: { orders: 2 } });
      expect((await report('?from=2026-09-29&to=2026-09-29')).totals.orders).toBe(1);
      expect((await report('?from=2026-10-01&to=2026-10-01')).totals.orders).toBe(1);
      expect((await report('?from=2026-09-29&to=2026-10-01')).totals.orders).toBe(4);
    });

    it('reads no period as the thirty days ending today, and says which it used', async () => {
      await shop.place({ ...settled, origin: facebook });
      await shop.place({ ...settled, origin: facebook });
      await shop.place({ ...settled, origin: facebook });
      await placedAt(2, new Date(Date.now() - 29 * DAY).toISOString());
      await placedAt(3, new Date(Date.now() - 30 * DAY).toISOString());

      const answer = await report();

      expect([answer.from, answer.to]).toEqual([shopDayOf(new Date(Date.now() - 29 * DAY)), shopDayOf(new Date())]);
      expect(answer.totals.orders).toBe(2);
    });

    it.each([
      ['?from=2026-10-01'],
      ['?to=2026-10-01'],
      ['?from=2026-10-02&to=2026-10-01'],
      ['?from=2026-02-30&to=2026-03-01'],
      ['?from=01/10/2026&to=02/10/2026'],
      ['?from=2026-10-01T00:00:00Z&to=2026-10-02'],
      ['?from=&to='],
      ['?from=ontem&to=hoje'],
      ['?from=2025-01-01&to=2026-01-02'],
      ["?from=2026-10-01'%20OR%201=1--&to=2026-10-02"],
    ])('refuses %s', async (query) => {
      const response = await read(query);

      expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([400, 'REPORT_PERIOD_INVALID']);
    });

    it('refuses a query it does not declare, and takes a whole leap year', async () => {
      expect((await read('?from=2026-10-01&to=2026-10-02&days=7')).statusCode).toBe(400);
      expect((await read('?from=2024-01-01&to=2024-12-31')).statusCode).toBe(200);
    });
  });
});
