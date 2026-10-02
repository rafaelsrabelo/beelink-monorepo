// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, OrderQuote, Product, PublicStore } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const RULES = { enabled: true, rateBps: 500, expiresAfterDays: 30, minSubtotalCents: 15_000, maxRedeemBps: 10000 };

describe('what a shopper is told they would earn (BEELINK-243)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
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
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 10_000 })).json<Product>();
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

    await call('PUT', '/api/stores/lessari/cashback', owner, { ...RULES, enabled: false });
    expect((await shopWindow()).cashback).toBeNull();
  });

  it('tells the shop window the rate and the minimum, and never the rest of the rules', async () => {
    await call('PUT', '/api/stores/lessari/cashback', owner, RULES);

    expect((await shopWindow()).cashback).toEqual({ rateBps: 500, minSubtotalCents: 15_000 });
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
});
