// Node
import { createHash } from 'node:crypto';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, MetaPixelConnection, MetaPixelTestEventResult } from '@harness-monorepo/contracts';

// App
import { AsaasClient } from '../src/modules/integrations/asaas/asaas.client.js';
import { MetaConversionsClient, MetaEventRefused, MetaPixelNotFound, MetaTokenRejected, MetaUnreachable } from '../src/modules/integrations/meta-pixel/meta-conversions.client.js';
import { MetaPurchases } from '../src/modules/integrations/meta-pixel/meta-purchases.service.js';
import { AsaasEvents } from '../src/modules/payment-events/asaas-events.service.js';
import { OrderPaidMailer } from '../src/modules/payments/order-paid-mailer.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakeAsaas } from './support/fake-asaas.js';
import { FakeMeta } from './support/fake-meta.js';
import { openOnlineShop, type OnlineShop } from './support/online-shop.js';
import { resetDatabase } from './support/reset-database.js';

const PIXEL = '1234567890123456';
const TOKEN = 'EAABe2e0conversions0token0000000000000000';
const OTHER_TOKEN = 'EAABe2e0another0token00000000000000000000';
const PATH = '/api/stores/lessari/integrations/meta-pixel';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** Nothing here reaches Meta: `FakeMeta` stands where the HTTP client would be. */
describe("a purchase is told to the shop's Meta Pixel from the server (BEELINK-274)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let purchases: MetaPurchases;
  let events: AsaasEvents;
  let shop: OnlineShop;
  const asaas = new FakeAsaas();
  const meta = new FakeMeta();

  const clickedAt = new Date(Date.now() - 2 * DAY).toISOString();
  const consent = { fbclid: 'IwAR0abc-DEF_123', clickedAt, fbp: 'fb.1.1759795200000.1234567890', userAgent: 'Mozilla/5.0 (e2e)', pageUrl: 'https://beelink.biz/lessari/carrinho' };
  const settled = { paymentMethod: 'MONEY', paymentChannel: 'OFFLINE' };

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas).overrideProvider(MetaConversionsClient).useValue(meta));
    prisma = app.get(PrismaService);
    purchases = app.get(MetaPurchases);
    events = app.get(AsaasEvents);
  });

  afterAll(async () => {
    await events.settled();
    await app.close();
  });

  beforeEach(async () => {
    await events.settled();
    await resetDatabase(prisma);
    asaas.reset();
    meta.reset();
    shop = await openOnlineShop(app, prisma, 'lessari');
    await shop.call('POST', PATH, shop.owner, { pixelId: PIXEL });
  });

  const saveToken = (accessToken = TOKEN, session = shop.owner) => shop.call('POST', `${PATH}/token`, session, { accessToken });
  const connection = async () => (await shop.call('GET', PATH, shop.owner)).json<MetaPixelConnection>();
  const owed = () => prisma.orderMetaPurchase.findMany({ orderBy: { createdAt: 'asc' } });
  const pixelRow = () => prisma.storeIntegration.findUniqueOrThrow({ where: { storeId_provider: { storeId: shop.storeId, provider: 'META_PIXEL' } } });
  /** Asaas tells of the order's charge, and whatever that led to is finished. */
  async function hear(id: string, number = 1) {
    expect((await shop.event({ id, event: 'PAYMENT_RECEIVED', payment: { id: asaas.payments[0]!.id, externalReference: await shop.orderId(number) } })).statusCode).toBe(200);
    await events.settled();
    // The customer's e-mail of the same payment, sent before the next test wipes its row.
    await app.get(OrderPaidMailer).flush();
  }

  describe('the token', () => {
    it('is sealed, said only as set, and never answered back', async () => {
      expect((await connection()).conversions).toEqual({ available: true, token: 'NONE', refusal: null, refusedAt: null });

      const saved = await saveToken(`  ${TOKEN}\n`);

      expect([saved.statusCode, saved.json<MetaPixelConnection>().conversions]).toEqual([200, { available: true, token: 'SET', refusal: null, refusedAt: null }]);
      expect(saved.payload).not.toContain(TOKEN);
      expect((await shop.call('GET', PATH, shop.owner)).payload).not.toContain(TOKEN);
      expect((await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).payload).not.toContain(TOKEN);
      const row = await pixelRow();
      expect(row.secretSealed).toMatch(/^v1\./);
      expect(row.secretSealed).not.toContain(TOKEN);
      // Saving asks Meta nothing.
      expect(meta.requests).toEqual([]);
    });

    it.each([['short'], ['with a space in the middle of it, like a sentence'], [''], [`${'a'.repeat(1001)}`], [1234567890]])('refuses %j as no token, and keeps nothing', async (accessToken) => {
      const response = await shop.call('POST', `${PATH}/token`, shop.owner, { accessToken });

      expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([400, 'META_PIXEL_TOKEN_INVALID']);
      expect((await pixelRow()).secretSealed).toBe('');
    });

    it('is the owner\'s alone to save, remove or try', async () => {
      for (const [method, url, payload] of [['POST', `${PATH}/token`, { accessToken: TOKEN }], ['DELETE', `${PATH}/token`, undefined], ['POST', `${PATH}/test-event`, { testEventCode: 'TEST123' }]] as const) {
        expect((await shop.call(method, url, undefined, payload)).statusCode).toBe(401);
        expect((await shop.call(method, url, shop.shopper, payload)).statusCode).toBe(401);
      }
      expect((await pixelRow()).secretSealed).toBe('');
    });

    it('needs a pixel saved first', async () => {
      await shop.call('DELETE', PATH, shop.owner);

      const response = await saveToken();

      expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([409, 'INTEGRATION_NOT_CONNECTED']);
    });

    it('goes when another pixel ID is saved, stays when the same one is, and goes alone when removed', async () => {
      await saveToken();

      expect((await shop.call('POST', PATH, shop.owner, { pixelId: PIXEL })).json<MetaPixelConnection>().conversions.token).toBe('SET');
      expect((await shop.call('POST', PATH, shop.owner, { pixelId: '9999999999999999' })).json<MetaPixelConnection>().conversions.token).toBe('NONE');
      expect((await pixelRow()).secretSealed).toBe('');

      await saveToken();
      expect((await shop.call('DELETE', `${PATH}/token`, shop.owner)).statusCode).toBe(204);
      expect(await connection()).toMatchObject({ status: 'CONNECTED', pixelId: '9999999999999999', conversions: { token: 'NONE' } });

      await saveToken();
      expect((await shop.call('DELETE', PATH, shop.owner)).statusCode).toBe(204);
      expect(await prisma.storeIntegration.count({ where: { storeId: shop.storeId, provider: 'META_PIXEL' } })).toBe(0);
    });
  });

  describe('what is owed, and when', () => {
    beforeEach(async () => {
      await saveToken();
    });

    it('owes an order settled with the shop at its placement, calls Meta in nobody\'s request, and tells it once', async () => {
      const order = await shop.place({ ...settled, marketingConsent: consent });

      // Owed by the transaction that placed it; Meta was not called by the request.
      expect(meta.requests).toEqual([]);
      const [row] = await owed();
      expect(row).toMatchObject({ orderId: order.id, storeId: shop.storeId, processedAt: null, outcome: null, attempts: 0 });
      expect(row!.countedAt.toISOString()).toBe(order.placedAt);

      expect(await purchases.flush()).toEqual({ claimed: 1, sent: 1 });

      expect(meta.requests).toHaveLength(1);
      expect(meta.requests[0]).toEqual({
        pixelId: PIXEL,
        accessToken: TOKEN,
        event: {
          event_name: 'Purchase',
          event_time: Math.floor(Date.parse(order.placedAt) / 1000),
          event_id: `purchase-${order.id}`,
          action_source: 'website',
          event_source_url: 'https://beelink.biz/lessari/carrinho',
          user_data: {
            em: [sha256(shop.shopper.user.email)],
            ph: [sha256('5511988887777')],
            fbc: `fb.1.${Date.parse(clickedAt)}.IwAR0abc-DEF_123`,
            fbp: 'fb.1.1759795200000.1234567890',
            client_user_agent: 'Mozilla/5.0 (e2e)',
          },
          custom_data: { value: 59.9, currency: 'BRL', content_ids: [order.items[0]!.productId], content_type: 'product', contents: [{ id: order.items[0]!.productId, quantity: 1, item_price: 59.9 }], num_items: 1 },
        },
      });
      expect((await owed())[0]).toMatchObject({ outcome: 'SENT', processedAt: expect.any(Date), lastError: null, attempts: 1 });

      // Nothing is left to claim: a second sweep, or another process's, sends nothing.
      expect(await purchases.flush(new Date(Date.now() + DAY))).toEqual({ claimed: 0, sent: 0 });
      expect(meta.requests).toHaveLength(1);
    });

    it('sends the least of an order that kept the yes and nothing else', async () => {
      await shop.place({ ...settled, marketingConsent: {} });

      await purchases.flush();

      expect(meta.requests[0]!.event.user_data).toEqual({ em: [sha256(shop.shopper.user.email)], ph: [sha256('5511988887777')] });
      // No page was kept: the shop's own public address stands in, as Meta requires one.
      expect(meta.requests[0]!.event.event_source_url).toBe('http://localhost:3000/lessari');
    });

    it('owes an order charged online only when its charge is paid — at that moment, and once however often it is heard', async () => {
      const order = await shop.place({ marketingConsent: consent });

      expect(await owed()).toEqual([]);
      expect(await purchases.flush()).toEqual({ claimed: 0, sent: 0 });

      asaas.pay(asaas.payments[0]!.id);
      await hear('evt_1');

      const paidAt = (await shop.rows())[0]!.paidAt!;
      expect(await owed()).toMatchObject([{ orderId: order.id, countedAt: paidAt, processedAt: null }]);
      // The webhook's request called Meta no more than the placement did.
      expect(meta.requests).toEqual([]);

      await hear('evt_1');
      await hear('evt_2');
      expect(await owed()).toHaveLength(1);

      await purchases.flush();
      await purchases.flush();
      expect(meta.requests).toHaveLength(1);
      expect(meta.requests[0]!.event).toMatchObject({ event_name: 'Purchase', event_id: `purchase-${order.id}`, event_time: Math.floor(paidAt.getTime() / 1000), custom_data: { value: 59.9 } });
    });

    it('owes nothing with no consent kept, placed or paid', async () => {
      await shop.place(settled);
      await shop.place();
      asaas.pay(asaas.payments[0]!.id);
      await hear('evt_1', 2);

      expect(await owed()).toEqual([]);
      await purchases.flush();
      expect(meta.requests).toEqual([]);
    });

    it('owes nothing for a sale the shopkeeper registered', async () => {
      const response = await shop.call('POST', '/api/stores/lessari/orders', shop.owner, { customer: { name: 'Caio Lima', phone: '(11) 97777-6666' }, items: [{ variantId: shop.variantId, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'MONEY' });

      expect(response.statusCode).toBe(201);
      expect(await owed()).toEqual([]);
    });

    it('owes nothing on a cancellation, and sends nothing of an order cancelled before it went', async () => {
      await shop.place({ ...settled, marketingConsent: consent });
      expect((await shop.cancel()).statusCode).toBeLessThan(300);

      expect(await owed()).toHaveLength(1);
      await purchases.flush();

      expect(meta.requests).toEqual([]);
      expect(await owed()).toMatchObject([{ outcome: 'SKIPPED', lastError: 'the order was cancelled' }]);
    });

    it('sends nothing once the buyer deleted their account: the consent went with it', async () => {
      await shop.place({ ...settled, marketingConsent: consent });
      expect((await shop.call('DELETE', '/api/stores/lessari/customer/me', shop.shopper, { password: PASSWORD })).statusCode).toBe(204);

      await purchases.flush();

      expect(meta.requests).toEqual([]);
      expect(await owed()).toMatchObject([{ outcome: 'SKIPPED', lastError: "the buyer's consent is gone" }]);
    });

    it('sends nothing for a shop with no token, and says why on the order', async () => {
      await shop.call('DELETE', `${PATH}/token`, shop.owner);
      await shop.place({ ...settled, marketingConsent: consent });

      await purchases.flush();

      expect(meta.requests).toEqual([]);
      expect(await owed()).toMatchObject([{ outcome: 'SKIPPED', lastError: 'the shop has no Conversions API token' }]);
    });
  });

  describe('a send that fails', () => {
    beforeEach(async () => {
      await saveToken();
      await shop.place({ ...settled, marketingConsent: consent });
    });

    it('never brought the order down, and is tried again, later each time', async () => {
      meta.failing = new MetaUnreachable('Meta failed (503)');
      const now = new Date();

      expect(await purchases.flush(now)).toEqual({ claimed: 1, sent: 0 });

      const [first] = await owed();
      expect(first).toMatchObject({ processedAt: null, outcome: null, attempts: 1, lastError: 'Meta failed (503)' });
      expect(first!.nextAttemptAt.getTime() - now.getTime()).toBe(MINUTE);
      // Not due yet: nothing is claimed, and Meta is not asked.
      expect(await purchases.flush(new Date(now.getTime() + 30_000))).toEqual({ claimed: 0, sent: 0 });

      const second = new Date(now.getTime() + 2 * MINUTE);
      await purchases.flush(second);
      expect((await owed())[0]!.nextAttemptAt.getTime() - second.getTime()).toBe(2 * MINUTE);

      meta.failing = null;
      expect(await purchases.flush(new Date(second.getTime() + 3 * MINUTE))).toEqual({ claimed: 1, sent: 1 });
      expect(meta.requests).toHaveLength(3);
      expect(await owed()).toMatchObject([{ outcome: 'SENT', attempts: 3, lastError: null }]);
      expect((await shop.panelOrder()).status).toBe('RECEIVED');
    });

    it('is given up once the event is past the seven days Meta takes, without asking Meta', async () => {
      meta.failing = new MetaUnreachable('Meta did not answer (TimeoutError)');
      await purchases.flush();
      expect(meta.requests).toHaveLength(1);

      await purchases.flush(new Date(Date.now() + 7 * DAY));

      expect(meta.requests).toHaveLength(1);
      expect(await owed()).toMatchObject([{ outcome: 'GIVEN_UP', processedAt: expect.any(Date), lastError: 'older than the seven days Meta takes an event within' }]);
    });

    it("is given up when Meta refuses the event itself, with Meta's words and never the token", async () => {
      meta.failNext(new MetaEventRefused('Meta refused (400, code 100): Invalid parameter'));

      await purchases.flush();

      const [row] = await owed();
      expect(row).toMatchObject({ outcome: 'GIVEN_UP', lastError: 'Meta refused (400, code 100): Invalid parameter' });
      expect(JSON.stringify(row)).not.toContain(TOKEN);
      expect(await purchases.flush(new Date(Date.now() + DAY))).toEqual({ claimed: 0, sent: 0 });
    });

    it.each([
      ['the token', new MetaTokenRejected('Meta refused (400, code 190): Error validating access token'), 'TOKEN_REJECTED'],
      ['the pixel under it', new MetaPixelNotFound('Meta refused (400, code 100, subcode 33): Unsupported post request'), 'PIXEL_NOT_FOUND'],
    ] as const)('stops the shop when Meta refuses %s, says so on the panel, and resumes with another token', async (_, failure, refusal) => {
      meta.failing = failure;
      const now = new Date();

      await purchases.flush(now);

      expect((await connection()).conversions).toEqual({ available: true, token: 'REJECTED', refusal, refusedAt: expect.any(String) });
      // The purchase waits without spending a try.
      expect(await owed()).toMatchObject([{ processedAt: null, attempts: 0, lastError: failure.message }]);

      // Another purchase of the shop, and hours of sweeps: Meta is not asked again with that token.
      await shop.place({ ...settled, marketingConsent: consent });
      await purchases.flush(new Date(now.getTime() + 2 * 60 * MINUTE));
      await purchases.flush(new Date(now.getTime() + 5 * 60 * MINUTE));
      expect(meta.requests).toHaveLength(1);
      expect((await owed()).map((row) => row.processedAt)).toEqual([null, null]);
      // The pixel in the browser goes on: the shop's public data still carries its ID.
      expect((await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<{ metaPixelId: string }>().metaPixelId).toBe(PIXEL);

      meta.failing = null;
      expect((await saveToken(OTHER_TOKEN)).json<MetaPixelConnection>().conversions).toEqual({ available: true, token: 'SET', refusal: null, refusedAt: null });

      // Due at once, not at the end of the hour they were waiting.
      expect(await purchases.flush()).toEqual({ claimed: 2, sent: 2 });
      expect(meta.taken.map((request) => request.accessToken)).toEqual([OTHER_TOKEN, OTHER_TOKEN]);
      expect((await owed()).map((row) => row.outcome)).toEqual(['SENT', 'SENT']);
    });

    it('gives a waiting purchase up at seven days all the same', async () => {
      meta.failing = new MetaTokenRejected('Meta refused (400, code 190): expired');
      await purchases.flush();

      await purchases.flush(new Date(Date.now() + 8 * DAY));

      expect(await owed()).toMatchObject([{ outcome: 'GIVEN_UP' }]);
      expect(meta.requests).toHaveLength(1);
    });
  });

  describe('the test event', () => {
    const test = (testEventCode: unknown = 'TEST12345') => shop.call('POST', `${PATH}/test-event`, shop.owner, { testEventCode });

    it('sends one synthetic event that is no purchase, with the code, and says Meta took it', async () => {
      await saveToken();

      const response = await test();

      expect([response.statusCode, response.json<MetaPixelTestEventResult>()]).toEqual([200, { outcome: 'ACCEPTED', detail: null }]);
      expect(meta.requests).toHaveLength(1);
      expect(meta.requests[0]).toMatchObject({ pixelId: PIXEL, accessToken: TOKEN, testEventCode: 'TEST12345', event: { event_name: 'BeeLinkTestEvent', action_source: 'website', event_source_url: 'http://localhost:3000/lessari' } });
      expect(meta.requests[0]!.event.custom_data).toBeUndefined();
      expect(Object.keys(meta.requests[0]!.event.user_data).sort()).toEqual(['client_user_agent', 'external_id']);
    });

    it.each([
      [new MetaTokenRejected('Meta refused (400, code 190): Error validating access token'), 'TOKEN_REJECTED', 'REJECTED'],
      [new MetaPixelNotFound('Meta refused (400, code 100, subcode 33): Unsupported post request'), 'PIXEL_NOT_FOUND', 'REJECTED'],
      [new MetaEventRefused('Meta refused (400, code 100): Invalid test event code'), 'EVENT_REFUSED', 'SET'],
      [new MetaUnreachable('Meta failed (503)'), 'UNREACHABLE', 'SET'],
    ] as const)("says Meta's answer in plain words: %s", async (failure, outcome, token) => {
      await saveToken();
      meta.failing = failure;

      const response = await test();

      expect([response.statusCode, response.json<MetaPixelTestEventResult>().outcome]).toEqual([200, outcome]);
      expect(response.payload).not.toContain(TOKEN);
      expect((await connection()).conversions.token).toBe(token);
    });

    it('lifts a refusal when Meta takes an event again, and the purchases that waited go', async () => {
      await saveToken();
      await shop.place({ ...settled, marketingConsent: consent });
      meta.failing = new MetaTokenRejected('Meta refused (400, code 190): expired');
      await purchases.flush();
      meta.failing = null;

      expect((await test()).json<MetaPixelTestEventResult>().outcome).toBe('ACCEPTED');

      expect((await connection()).conversions.token).toBe('SET');
      expect(await purchases.flush()).toEqual({ claimed: 1, sent: 1 });
    });

    it('refuses a code no code could be, and sends nothing with no token', async () => {
      const none = await test();
      expect([none.statusCode, none.json<ApiErrorBody>().errorCode]).toEqual([409, 'INTEGRATION_NOT_CONNECTED']);

      await saveToken();
      for (const code of ['', 'a b', 'x'.repeat(41), '<script>', 12]) {
        const response = await test(code);
        expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([400, 'META_PIXEL_TEST_CODE_INVALID']);
      }
      expect(meta.requests).toEqual([]);
    });
  });
});
