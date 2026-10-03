// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, IntegrationAuthorization, Product, ProductPage } from '@harness-monorepo/contracts';

// App
import { MelhorEnvioClient } from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** Melhor Envio for a connection only: any code is good. */
const melhorEnvio = {
  authorizationUrl: (_config: unknown, state: string) => `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`,
  exchange: async () => ({ accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 30 * 24 * 60 * 60 }),
  account: async () => ({ id: 'me-1', name: 'Loja Lessari', email: null }),
};

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const parcel = { weightGrams: 500, lengthMm: 200, widthMm: 150, heightMm: 100 };

describe('the products a carrier cannot quote, in the panel (BEELINK-184)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let boxed: Product;
  let unweighed: Product;
  let unboxed: Product;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(MelhorEnvioClient).useValue(melhorEnvio));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', shopBody('lessari'));
    boxed = (await call('POST', '/api/stores/lessari/products', { name: 'Whey', priceCents: 10_000, ...parcel })).json<Product>();
    unweighed = (await call('POST', '/api/stores/lessari/products', { name: 'Camiseta', priceCents: 5_000 })).json<Product>();
    unboxed = (await call('POST', '/api/stores/lessari/products', { name: 'Caneca', priceCents: 3_000, weightGrams: 400 })).json<Product>();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  async function connect() {
    const begun = await call('POST', '/api/stores/lessari/integrations/melhor-envio/authorize');
    const state = new URL(begun.json<IntegrationAuthorization>().url).searchParams.get('state')!;
    expect((await call('POST', '/api/integrations/melhor-envio/callback', { code: 'c1', state })).statusCode).toBe(200);
  }

  const gaps = async () => (await call('GET', '/api/stores/lessari/products')).json<ProductPage>().carrierGaps;

  it('says nothing is missing while the shop ships by no carrier', async () => {
    expect(await gaps()).toBeNull();
  });

  it('marks, once connected, the unweighed product and the one with no size — the boxed one is fine', async () => {
    await connect();

    expect(await gaps()).toEqual({ [unweighed.id]: 'NO_WEIGHT', [unboxed.id]: 'NO_SIZE' });
  });

  it("stops marking a product with no size once the shop has a default parcel", async () => {
    await connect();
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', { handlingDays: 1, serviceIds: [], defaultPackage: parcel });

    expect(await gaps()).toEqual({ [unweighed.id]: 'NO_WEIGHT' });
  });

  /** The customer picks the variant in the cart: one with no weight cannot be quoted, whatever the others weigh. */
  it('marks a product whose other active variant has no weight, and leaves out a switched-off one', async () => {
    await connect();
    const lead = await prisma.productVariant.findFirstOrThrow({ where: { productId: boxed.id } });
    const other = await prisma.productVariant.create({ data: { productId: boxed.id, storeId: lead.storeId, priceCents: 12_000, position: 1, weightGrams: null, lengthMm: 200, widthMm: 150, heightMm: 100 } });
    expect((await gaps())?.[boxed.id]).toBe('NO_WEIGHT');

    await prisma.productVariant.update({ where: { id: other.id }, data: { isActive: false } });
    expect((await gaps())?.[boxed.id]).toBeUndefined();
  });
});
