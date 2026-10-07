// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, Coupon, CustomerOffers, CustomerOrder, OrderQuote, Product, Promotion, StorefrontOffers } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/**
 * What a shop shows of its offers, unasked: the public headline for a first purchase, and a
 * shopper's own offers — the first-order benefit and the shown coupons their cart may take. Made as
 * the panel makes them, with nothing written for them but what a test says it writes.
 */
describe("a shop's offers in its window", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let bia: AuthSession;
  let whey: string;

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
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    whey = await variantOf(await made<Product>('products', { name: 'Whey', priceCents: 10000 }));
    bia = await shopperOf('Bia Cliente', '(11) 98888-7777');
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function made<T>(path: string, body: object, shop = 'lessari', by = owner): Promise<T> {
    const response = await call('POST', `/api/stores/${shop}/${path}`, by, body);
    if (response.statusCode !== 201) throw new Error(`POST ${path} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  async function variantOf(product: Product): Promise<string> {
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  /** A signed-in customer of a shop, with a phone. */
  async function shopperOf(name: string, phone: string, shop = 'lessari'): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${shop}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const session = (await call('POST', `/api/stores/${shop}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
    await call('PATCH', `/api/stores/${shop}/customer/me`, session, { phone });
    return session;
  }

  const couponBody = (body: object) => ({ code: 'CUPOM10', kind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body });
  const coupon = (body: object = {}) => made<Coupon>('coupons', couponBody(body));
  /** Switched on to be shown, which is what every list below reads. */
  const shown = (body: object = {}) => coupon({ shownInStore: true, ...body });
  const promotion = (body: object = {}) => made<Promotion>('promotions', { name: 'Primeira compra', scope: 'CART', discountKind: 'PERCENT', percentBps: 1500, startsAt: daysFromNow(-1), audience: 'FIRST_PURCHASE', ...body });

  const headline = async (shop = 'lessari') => {
    const response = await call('GET', `/api/stores/${shop}/offers`);
    if (response.statusCode !== 200) throw new Error(`GET offers answered ${response.statusCode}: ${response.payload}`);
    return { body: response.json<StorefrontOffers>(), raw: response.payload, changesAt: response.headers['x-prices-change-at'] ?? null };
  };

  /** One whey: 100,00 of products. */
  const CART = (quantity = 1) => [{ variantId: whey, quantity }];
  const offers = async (body: object = {}, session = bia, shop = 'lessari') => {
    const response = await call('POST', `/api/stores/${shop}/customer/offers`, session, body);
    if (response.statusCode !== 200) throw new Error(`POST customer/offers answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerOffers>();
  };
  const onCart = async (body: object = {}, session = bia) => (await offers({ items: CART(), fulfillment: 'PICKUP', ...body }, session)).coupons;
  const codesOnCart = async (body: object = {}, session = bia) => (await onCart(body, session)).map((offered) => offered.code);
  /** The checkout's quote, which is what takes or refuses a code. */
  const verdictOf = async (code: string, body: object = {}, session = bia) => {
    const response = await call('POST', '/api/stores/lessari/customer/orders/quote', session, { items: CART(), fulfillment: 'PICKUP', couponCode: code, ...body });
    return response.json<OrderQuote>().coupon;
  };
  const place = (body: object = {}, session = bia) => call('POST', '/api/stores/lessari/customer/orders', session, { items: CART(), fulfillment: 'PICKUP', paymentMethod: 'PIX', ...body });

  describe('the switch "Mostrar este cupom na loja"', () => {
    it('is off unless the form says so, is kept once on, and goes off on a save that leaves it out', async () => {
      const created = await coupon();
      expect(created.shownInStore).toBe(false);
      // The column's own default, for every coupon that existed before it.
      await prisma.$executeRaw`INSERT INTO "coupons" ("id", "storeId", "code", "kind", "percentBps", "startsAt", "updatedAt") SELECT gen_random_uuid(), "storeId", 'ANTIGO', 'PERCENT', 500, now(), now() FROM "coupons" LIMIT 1`;
      expect((await prisma.coupon.findFirstOrThrow({ where: { code: 'ANTIGO' } })).shownInStore).toBe(false);

      const on = await call('PUT', `/api/stores/lessari/coupons/${created.id}`, owner, couponBody({ shownInStore: true }));
      expect(on.json<Coupon>().shownInStore).toBe(true);
      expect((await call('GET', `/api/stores/lessari/coupons/${created.id}`, owner)).json<Coupon>().shownInStore).toBe(true);
      // Pausing is not a save of the form: the switch stays.
      expect((await call('PATCH', `/api/stores/lessari/coupons/${created.id}`, owner, { active: false })).json<Coupon>()).toMatchObject({ active: false, shownInStore: true });

      const off = await call('PUT', `/api/stores/lessari/coupons/${created.id}`, owner, couponBody({}));
      expect(off.json<Coupon>().shownInStore).toBe(false);
    });

    it('refuses what is not a yes or a no', async () => {
      expect((await call('POST', '/api/stores/lessari/coupons', owner, couponBody({ shownInStore: 'sim' }))).statusCode).toBe(400);
      expect((await call('POST', '/api/stores/lessari/coupons', owner, couponBody({ shownInStore: null }))).statusCode).toBe(400);
    });
  });

  describe('the headline anyone reads', () => {
    it('is nothing at a shop with nothing for a first purchase — a coupon for everyone and a hidden one are neither', async () => {
      await shown({ code: 'TODOS10' });
      await coupon({ code: 'OCULTO10', audience: 'FIRST_PURCHASE' });
      await promotion({ name: 'Para todos', audience: 'EVERYONE' });

      expect((await headline()).body).toEqual({ firstPurchase: null, popup: null });
    });

    it('says a first-purchase promotion by its kind and amount, and whether it is over the whole cart', async () => {
      const product = await made<Product>('products', { name: 'Creatina', priceCents: 5000 });
      await promotion({ name: 'Só a creatina', scope: 'PRODUCTS', productIds: [product.id], percentBps: 2000 });
      expect((await headline()).body.firstPurchase).toEqual({ source: 'PROMOTION', kind: 'PERCENT', percentBps: 2000, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: false });

      // One over the whole cart is the one said, though it is not the deepest: it is true of any cart.
      const ends = daysFromNow(10);
      await promotion({ discountKind: 'FIXED', percentBps: null, amountCents: 1500, endsAt: ends });
      expect((await headline()).body.firstPurchase).toEqual({ source: 'PROMOTION', kind: 'FIXED', percentBps: null, amountCents: 1500, minSubtotalCents: 0, endsAt: ends, wholeCart: true });
    });

    it('says a shown first-purchase coupon as a benefit, and never its code', async () => {
      await shown({ code: 'SEGREDO15', audience: 'FIRST_PURCHASE', percentBps: 1500, minSubtotalCents: 5000 });

      const { body, raw } = await headline();
      expect(body.firstPurchase).toEqual({ source: 'COUPON', kind: 'PERCENT', percentBps: 1500, amountCents: null, minSubtotalCents: 5000, endsAt: null, wholeCart: true });
      expect(raw).not.toContain('SEGREDO15');
      expect(Object.keys(body.firstPurchase!)).not.toContain('code');
    });

    it('says the promotion when there are both: it applies by itself', async () => {
      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' });
      await promotion();

      expect((await headline()).body.firstPurchase).toMatchObject({ source: 'PROMOTION', percentBps: 1500 });
    });

    it('drops a coupon that is paused, scheduled, ended or used up, and a promotion that is paused', async () => {
      const paused = await shown({ code: 'PAUSADO', audience: 'FIRST_PURCHASE' });
      await call('PATCH', `/api/stores/lessari/coupons/${paused.id}`, owner, { active: false });
      await shown({ code: 'FUTURO', audience: 'FIRST_PURCHASE', startsAt: daysFromNow(2) });
      await shown({ code: 'VENCIDO', audience: 'FIRST_PURCHASE', startsAt: daysFromNow(-5), endsAt: daysFromNow(-1) });
      const usedUp = await shown({ code: 'ESGOTADO', audience: 'FIRST_PURCHASE', maxUses: 1 });
      await prisma.coupon.update({ where: { id: usedUp.id }, data: { usedCount: 1 } });
      const stopped = await promotion();
      await call('PATCH', `/api/stores/lessari/promotions/${stopped.id}`, owner, { active: false });

      expect((await headline()).body).toEqual({ firstPurchase: null, popup: null });
    });

    it('carries the instant it next changes by itself: the soonest start or end ahead, of what is switched on and shown', async () => {
      expect((await headline()).changesAt).toBeNull();

      const ending = await shown({ code: 'ACABA', audience: 'FIRST_PURCHASE', endsAt: daysFromNow(3) });
      const starting = await promotion({ startsAt: daysFromNow(1) });
      // Neither of these is the headline's: one is hidden, the other for everyone.
      await coupon({ code: 'OCULTO', audience: 'FIRST_PURCHASE', endsAt: daysFromNow(0.5) });
      await promotion({ name: 'Todos', audience: 'EVERYONE', endsAt: daysFromNow(0.25) });
      expect((await headline()).changesAt).toBe(starting.startsAt);

      await call('PATCH', `/api/stores/lessari/promotions/${starting.id}`, owner, { active: false });
      expect((await headline()).changesAt).toBe(ending.endsAt);
    });

    it("is one shop's alone, and a 404 where there is no shop", async () => {
      const other = await signUpAndSignIn(app, newEmail('outra'));
      await call('POST', '/api/stores', other, shopBody('vizinha'));
      await made<Coupon>('coupons', couponBody({ code: 'VIZINHA10', audience: 'FIRST_PURCHASE', shownInStore: true }), 'vizinha', other);

      expect((await headline()).body).toEqual({ firstPurchase: null, popup: null });
      expect((await headline('vizinha')).body.firstPurchase).toMatchObject({ source: 'COUPON' });
      expect((await call('GET', '/api/stores/ninguem/offers')).statusCode).toBe(404);
    });
  });

  describe("a shopper's own offers", () => {
    it('are refused to anyone but a shopper of this shop', async () => {
      const other = await signUpAndSignIn(app, newEmail('outra'));
      await call('POST', '/api/stores', other, shopBody('vizinha'));
      const neighbour = await shopperOf('Bia Vizinha', '(11) 97777-0000', 'vizinha');

      for (const session of [undefined, owner, neighbour]) {
        const response = await call('POST', '/api/stores/lessari/customer/offers', session, {});
        expect([response.statusCode, response.json<{ errorCode: string }>().errorCode]).toEqual([401, 'AUTH_UNAUTHENTICATED']);
      }
    });

    it('show a customer who never ordered the shown first-purchase coupon, with its code', async () => {
      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE', minSubtotalCents: 5000 });

      expect(await offers()).toEqual({
        hasOrder: false,
        firstPurchase: { source: 'COUPON', code: 'PRIMEIRA10', kind: 'PERCENT', percentBps: 1000, amountCents: null, minSubtotalCents: 5000, endsAt: null },
        coupons: [],
      });
    });

    it('show the promotion where there is no coupon to show, and the coupon where there are both', async () => {
      await coupon({ code: 'OCULTO10', audience: 'FIRST_PURCHASE' });
      await promotion();
      expect((await offers()).firstPurchase).toEqual({ source: 'PROMOTION', kind: 'PERCENT', percentBps: 1500, amountCents: null, minSubtotalCents: 0, endsAt: null, wholeCart: true });

      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' });
      expect((await offers()).firstPurchase).toMatchObject({ source: 'COUPON', code: 'PRIMEIRA10' });
    });

    it('show nothing for a first order at a shop with nothing for one', async () => {
      await shown({ code: 'TODOS10' });
      await coupon({ code: 'OCULTO10', audience: 'FIRST_PURCHASE' });

      expect(await offers()).toEqual({ hasOrder: false, firstPurchase: null, coupons: [] });
    });

    it('show no first-order benefit once an order stands, and show it again once none does', async () => {
      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' });
      await promotion();
      expect((await place()).statusCode).toBe(201);

      expect(await offers({ items: CART(), fulfillment: 'PICKUP' })).toEqual({ hasOrder: true, firstPurchase: null, coupons: [] });
      expect(await verdictOf('PRIMEIRA10')).toMatchObject({ status: 'REFUSED', reason: 'NOT_FIRST_PURCHASE' });

      // A cancelled order does not count: the same rule a first purchase is priced with.
      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', bia)).statusCode).toBe(200);
      expect(await offers()).toMatchObject({ hasOrder: false, firstPurchase: { source: 'COUPON', code: 'PRIMEIRA10' } });
    });

    it('count an order the shop registered for them', async () => {
      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' });
      const sale = await call('POST', '/api/stores/lessari/orders', owner, { customer: { name: 'Bia', phone: '(11) 98888-7777' }, items: CART(), fulfillment: 'PICKUP', paymentMethod: 'PIX' });
      expect(sale.statusCode).toBe(201);

      expect(await offers()).toMatchObject({ hasOrder: true, firstPurchase: null });
    });

    it('show a first-purchase coupon again once the order that used it was cancelled: the use came back with it', async () => {
      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE', maxUsesPerCustomer: 1 });
      expect((await place({ couponCode: 'PRIMEIRA10' })).statusCode).toBe(201);
      expect(await offers()).toMatchObject({ hasOrder: true, firstPurchase: null });
      expect((await call('POST', '/api/stores/lessari/customer/orders/1/cancel', bia)).statusCode).toBe(200);

      // The cancelled order gave the use back, and no order stands: it is theirs again.
      expect((await offers()).firstPurchase).toMatchObject({ code: 'PRIMEIRA10' });
    });
  });

  describe('the coupons a cart may take', () => {
    it('are the shown ones, the newest first, each with what it gives — and none without a cart', async () => {
      await shown({ code: 'DEZ', percentBps: 1000 });
      await shown({ code: 'VINTE-REAIS', kind: 'FIXED', percentBps: null, amountCents: 2000, endsAt: daysFromNow(5) });

      const listed = await onCart();
      expect(listed).toEqual([
        { code: 'VINTE-REAIS', audience: 'EVERYONE', kind: 'FIXED', percentBps: null, amountCents: 2000, minSubtotalCents: 0, endsAt: expect.any(String), missingCents: 0 },
        { code: 'DEZ', audience: 'EVERYONE', kind: 'PERCENT', percentBps: 1000, amountCents: null, minSubtotalCents: 0, endsAt: null, missingCents: 0 },
      ]);
      expect((await offers()).coupons).toEqual([]);
      expect((await offers({ items: [] })).coupons).toEqual([]);
    });

    it('never include a coupon the shopkeeper did not switch on to be shown, whatever is sent', async () => {
      await coupon({ code: 'OCULTO10' });
      await coupon({ code: 'INFLUENCER', audience: 'FIRST_PURCHASE' });
      await shown({ code: 'VISIVEL' });

      for (const body of [{}, { fulfillment: 'DELIVERY' }, { items: CART(50) }]) {
        const answer = await offers({ items: CART(), fulfillment: 'PICKUP', ...body });
        expect(JSON.stringify(answer)).not.toMatch(/OCULTO10|INFLUENCER/);
        expect(answer.coupons.map((offered) => offered.code)).toEqual(['VISIVEL']);
      }
      // The hidden one still works for whoever was given it.
      expect(await verdictOf('OCULTO10')).toMatchObject({ status: 'APPLIED' });
    });

    it("never include another shop's coupons", async () => {
      const other = await signUpAndSignIn(app, newEmail('outra'));
      await call('POST', '/api/stores', other, shopBody('vizinha'));
      await made<Coupon>('coupons', couponBody({ code: 'VIZINHA10', shownInStore: true }), 'vizinha', other);
      await shown({ code: 'DAQUI' });

      expect(await codesOnCart()).toEqual(['DAQUI']);
    });

    it('leave out one that is paused, scheduled, ended or used up', async () => {
      const paused = await shown({ code: 'PAUSADO' });
      await call('PATCH', `/api/stores/lessari/coupons/${paused.id}`, owner, { active: false });
      await shown({ code: 'FUTURO', startsAt: daysFromNow(2) });
      await shown({ code: 'VENCIDO', startsAt: daysFromNow(-5), endsAt: daysFromNow(-1) });
      await shown({ code: 'ESGOTADO', maxUses: 1 });
      const caio = await shopperOf('Caio Cliente', '(11) 97777-6666');
      expect((await place({ couponCode: 'ESGOTADO' }, caio)).statusCode).toBe(201);
      await shown({ code: 'VALE' });

      expect(await codesOnCart()).toEqual(['VALE']);
      for (const [code, reason] of [['PAUSADO', 'INACTIVE'], ['FUTURO', 'INACTIVE'], ['VENCIDO', 'EXPIRED'], ['ESGOTADO', 'EXHAUSTED']] as const) {
        expect(await verdictOf(code)).toMatchObject({ status: 'REFUSED', reason });
      }
    });

    it("leave out one this customer used as often as one customer may, and keep it for another", async () => {
      await shown({ code: 'UMAVEZ', maxUsesPerCustomer: 1 });
      expect(await codesOnCart()).toEqual(['UMAVEZ']);
      expect((await place({ couponCode: 'UMAVEZ' })).json<CustomerOrder>()).toMatchObject({ coupon: { code: 'UMAVEZ' } });

      expect(await codesOnCart()).toEqual([]);
      expect(await verdictOf('UMAVEZ')).toMatchObject({ status: 'REFUSED', reason: 'CUSTOMER_LIMIT' });
      const caio = await shopperOf('Caio Cliente', '(11) 97777-6666');
      expect(await codesOnCart({}, caio)).toEqual(['UMAVEZ']);
    });

    it('leave a first-purchase one out for a customer with an order, and list it for one without', async () => {
      await shown({ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE' });
      expect(await onCart()).toMatchObject([{ code: 'PRIMEIRA10', audience: 'FIRST_PURCHASE', missingCents: 0 }]);

      expect((await place()).statusCode).toBe(201);
      expect(await codesOnCart()).toEqual([]);
    });

    it('say what is missing of one whose minimum the cart is below — after the promotions — and take it once the cart reaches it', async () => {
      await shown({ code: 'ACIMA150', minSubtotalCents: 15000 });
      // 10% off everything: two wheys are 200,00 on the shelf and 180,00 to a coupon.
      await promotion({ name: 'Semana', audience: 'EVERYONE', percentBps: 1000 });

      expect(await onCart()).toMatchObject([{ code: 'ACIMA150', minSubtotalCents: 15000, missingCents: 6000 }]);
      expect(await verdictOf('ACIMA150')).toMatchObject({ status: 'REFUSED', reason: 'BELOW_MINIMUM', minSubtotalCents: 15000 });

      expect(await onCart({ items: CART(2) })).toMatchObject([{ code: 'ACIMA150', missingCents: 0 }]);
      expect(await verdictOf('ACIMA150', { items: CART(2) })).toMatchObject({ status: 'APPLIED' });
    });

    it('leave a free delivery out of a cart that is picked up, and list it on one that is delivered', async () => {
      await shown({ code: 'FRETEGRATIS', kind: 'FREE_SHIPPING', percentBps: null });

      expect(await codesOnCart({ fulfillment: 'PICKUP' })).toEqual([]);
      expect(await verdictOf('FRETEGRATIS', { fulfillment: 'PICKUP' })).toMatchObject({ status: 'REFUSED', reason: 'NOT_APPLICABLE' });

      expect(await codesOnCart({ fulfillment: 'DELIVERY' })).toEqual(['FRETEGRATIS']);
      expect(await verdictOf('FRETEGRATIS', { fulfillment: 'DELIVERY' })).toMatchObject({ status: 'APPLIED' });
    });

    /**
     * The claim the list rests on, held against the door that takes a code: whatever it offers as
     * usable is applied there, and whatever it leaves out or marks as short is refused there.
     */
    it('agree with the quote about every shown coupon, on a pick-up and on a delivery', async () => {
      const all = [
        await shown({ code: 'A-DEZ' }),
        await shown({ code: 'B-FIXO', kind: 'FIXED', percentBps: null, amountCents: 500 }),
        await shown({ code: 'C-FRETE', kind: 'FREE_SHIPPING', percentBps: null }),
        await shown({ code: 'D-MINIMO', minSubtotalCents: 50000 }),
        await shown({ code: 'E-PRIMEIRA', audience: 'FIRST_PURCHASE' }),
        await shown({ code: 'F-FUTURO', startsAt: daysFromNow(1) }),
        await shown({ code: 'G-UMAVEZ', maxUsesPerCustomer: 1 }),
      ];
      expect((await place({ couponCode: 'G-UMAVEZ' })).statusCode).toBe(201);

      for (const fulfillment of ['PICKUP', 'DELIVERY'] as const) {
        const listed = await onCart({ fulfillment });
        const usable = listed.filter((offered) => offered.missingCents === 0).map((offered) => offered.code);

        for (const { code } of all) {
          const verdict = await verdictOf(code, { fulfillment });
          expect([fulfillment, code, verdict?.status]).toEqual([fulfillment, code, usable.includes(code) ? 'APPLIED' : 'REFUSED']);
        }
        expect(listed.filter((offered) => offered.missingCents > 0).map((offered) => offered.code)).toEqual(['D-MINIMO']);
      }
    });

    it('answer a cart that cannot be priced as the quote does', async () => {
      await shown({ code: 'VALE' });

      const response = await call('POST', '/api/stores/lessari/customer/offers', bia, { items: [{ variantId: '01a0d395-c1ab-7399-a472-000000000001', quantity: 1 }], fulfillment: 'PICKUP' });
      expect([response.statusCode, response.json<{ errorCode: string }>().errorCode]).toEqual([400, 'ORDER_VARIANT_INVALID']);
      expect((await call('POST', '/api/stores/lessari/customer/offers', bia, { items: CART(), couponCode: 'VALE' })).statusCode).toBe(400);
    });

    it('list ten at most, the newest', async () => {
      for (let index = 1; index <= 12; index += 1) await shown({ code: `CUPOM-${String(index).padStart(2, '0')}` });

      const codes = await codesOnCart();
      expect(codes).toHaveLength(10);
      expect([codes[0], codes[9]]).toEqual(['CUPOM-12', 'CUPOM-03']);
    });
  });
});
