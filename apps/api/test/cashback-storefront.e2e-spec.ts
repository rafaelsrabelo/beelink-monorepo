// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerOrder, Order, OrderQuote, Product, PublicProductDetail, PublicStore } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const RULES = { enabled: true, mode: 'STORE', rateBps: 500, expiresAfterDays: 30, minSubtotalCents: 15_000, maxRedeemBps: 10000 };

describe('what a shopper is told they would earn (BEELINK-243)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let whey: string;
  let wheyProduct: string;

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
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 10_000 })).json<Product>();
    wheyProduct = product.id;
    whey = (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const quote = (quantity: number) =>
    call('POST', '/api/stores/lessari/cart/quote', undefined, { items: [{ variantId: whey, quantity }], fulfillment: 'PICKUP' }).then((response) => response.json<OrderQuote>());
  const shopWindow = () => call('GET', '/api/stores/lessari/public').then((response) => response.json<PublicStore>());

  it("says nothing while the shop's cashback is off — never that nothing comes back", async () => {
    expect((await shopWindow()).cashback).toBeNull();
    expect((await quote(2)).cashback).toBeNull();

    expect((await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, enabled: false })).statusCode).toBe(200);
    expect((await shopWindow()).cashback).toBeNull();
  });

  it('tells the shop window the rate and the minimum, and never the rest of the rules', async () => {
    await call('PUT', '/api/stores/lessari/cashback', owner, RULES);

    expect((await shopWindow()).cashback).toEqual({ mode: 'STORE', rateBps: 500, minSubtotalCents: 15_000 });
  });

  it('quotes what the cart would earn, and below the minimum, what is missing', async () => {
    await call('PUT', '/api/stores/lessari/cashback', owner, RULES);

    expect((await quote(1)).cashback).toEqual({ status: 'BELOW_MINIMUM', missingCents: 5_000, rateBps: 500 });
    expect((await quote(2)).cashback).toEqual({ status: 'EARNS', earnedCents: 1_000, rateBps: 500 });
  });

  it('quotes on the price after the promotions, as the order is placed', async () => {
    await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, minSubtotalCents: 0 });
    await call('POST', '/api/stores/lessari/promotions', owner, { name: 'Semana', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: new Date(Date.now() - 86_400_000).toISOString() });

    expect((await quote(1)).cashback).toEqual({ status: 'EARNS', earnedCents: 450, rateBps: 500 });
  });

  /** BEELINK-313: the shop gives by product — the page reads the product's own rate, and the cart quotes line by line. */
  describe('by product', () => {
    const BY_PRODUCT = { ...RULES, mode: 'PRODUCT', minSubtotalCents: 0 };
    const page = () => call('GET', '/api/stores/lessari/catalog/whey').then((response) => response.json<PublicProductDetail>());

    it("tells the shop window the way it gives, and the product's page its own rate", async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, BY_PRODUCT);
      expect((await shopWindow()).cashback).toMatchObject({ mode: 'PRODUCT' });
      expect((await page()).cashbackRateBps).toBeNull();

      expect((await call('PUT', `/api/stores/lessari/products/${wheyProduct}`, owner, { cashbackRateBps: 1000 })).statusCode).toBe(200);
      expect((await page()).cashbackRateBps).toBe(1000);
    });

    it('quotes nothing for a product with no rate, and its own rate once it has one', async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, BY_PRODUCT);
      expect((await quote(1)).cashback).toBeNull();

      await call('PUT', `/api/stores/lessari/products/${wheyProduct}`, owner, { cashbackRateBps: 1000 });
      expect((await quote(1)).cashback).toEqual({ status: 'EARNS', earnedCents: 1_000, rateBps: 1000 });
    });

    it("keeps a product's rate unread while the shop gives one rate", async () => {
      await call('PUT', `/api/stores/lessari/products/${wheyProduct}`, owner, { cashbackRateBps: 1000 });
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, minSubtotalCents: 0 });

      expect((await quote(1)).cashback).toEqual({ status: 'EARNS', earnedCents: 500, rateBps: 500 });
    });
  });

  /** What the cart promised is what the order records: the same pricing, read the same way, at every door. */
  describe('the quote and the order agree', () => {
    async function shopperSession(): Promise<AuthSession> {
      const email = newEmail('cliente');
      await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
      await verifyEmailOf(app, email);
      return (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    }

    beforeEach(async () => {
      await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, minSubtotalCents: 0 });
    });

    it("at the customer's checkout, with a percentage coupon", async () => {
      await call('POST', '/api/stores/lessari/coupons', owner, { code: 'BEMVINDO10', kind: 'PERCENT', percentBps: 1000, startsAt: new Date(Date.now() - 86_400_000).toISOString() });
      const shopper = await shopperSession();
      const body = { items: [{ variantId: whey, quantity: 3 }], fulfillment: 'PICKUP', couponCode: 'bemvindo10' };

      const quoted = (await call('POST', '/api/stores/lessari/customer/orders/quote', shopper, body)).json<OrderQuote>();
      const placed = (await call('POST', '/api/stores/lessari/customer/orders', shopper, { ...body, paymentMethod: 'PIX' })).json<CustomerOrder>();

      // 300,00 less 10% = 270,00 × 5% = 13,50.
      expect(quoted.cashback).toEqual({ status: 'EARNS', earnedCents: 1_350, rateBps: 500 });
      expect(placed.cashback?.earnedCents).toBe(1_350);
    });

    it("at the panel's sale, with a discount by hand and a delivery that earns nothing", async () => {
      const sale = { customer: { name: 'Caio', phone: '(11) 97777-6666' }, items: [{ variantId: whey, quantity: 1 }], fulfillment: 'PICKUP', discountCents: 1_234 };

      const quoted = (await call('POST', '/api/stores/lessari/orders/quote', owner, sale)).json<OrderQuote>();
      const placed = (await call('POST', '/api/stores/lessari/orders', owner, { ...sale, paymentMethod: 'PIX' })).json<Order>();

      // 100,00 less 12,34 = 87,66 × 5% = 4,38, rounded down.
      expect(quoted.cashback).toEqual({ status: 'EARNS', earnedCents: 438, rateBps: 500 });
      expect(placed.cashback?.earnedCents).toBe(438);
    });
  });
});
