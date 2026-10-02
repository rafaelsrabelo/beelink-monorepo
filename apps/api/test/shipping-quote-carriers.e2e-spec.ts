// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, IntegrationAuthorization, ProductDetail, ShippingQuote } from '@harness-monorepo/contracts';

// App
import { MelhorEnvioClient, MelhorEnvioUnreachable, type MelhorEnvioQuoteRequest, type MelhorEnvioQuotedService } from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const SEDEX: MelhorEnvioQuotedService = { serviceId: 2, service: 'SEDEX', company: 'Correios', priceCents: 2745, daysFrom: 2, daysTo: 3 };
const PAC: MelhorEnvioQuotedService = { serviceId: 1, service: 'PAC', company: 'Correios', priceCents: 1820, daysFrom: 6, daysTo: 8 };

/** Melhor Envio for a quote: any code connects, and the carriers answer what `offers` says — or nothing at all while `down`. */
class FakeMelhorEnvio {
  offers: MelhorEnvioQuotedService[] = [SEDEX, PAC];
  down = false;
  readonly asked: { token: string; request: MelhorEnvioQuoteRequest }[] = [];

  authorizationUrl(_config: unknown, state: string): string {
    return `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`;
  }

  async exchange() {
    return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 30 * 24 * 60 * 60 };
  }

  async account() {
    return { id: 'me-1', name: 'Loja Lessari', email: null };
  }

  async quote(_config: unknown, token: string, request: MelhorEnvioQuoteRequest): Promise<MelhorEnvioQuotedService[]> {
    this.asked.push({ token, request });
    if (this.down) throw new MelhorEnvioUnreachable('down');
    return this.offers.filter((offer) => !request.serviceIds || request.serviceIds.includes(offer.serviceId));
  }
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const parcel = { weightGrams: 300, lengthMm: 255, widthMm: 200, heightMm: 40 };
/** Own delivery with the fee agreed afterwards, pickup, and carriers switched on. */
const rules = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [], freeAboveCents: null, carriersEnabled: true };
const carrier = (service: MelhorEnvioQuotedService, handlingDays: number) => ({
  kind: 'CARRIER',
  carrier: { serviceId: service.serviceId, service: service.service, company: service.company },
  feeCents: service.priceCents,
  window: { unit: 'BUSINESS_DAYS', from: service.daysFrom + handlingDays, to: service.daysTo + handlingDays },
  freeAbove: false,
});

describe('the carriers in the shipping quote (BEELINK-185)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let blouse: string;
  const melhorEnvio = new FakeMelhorEnvio();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(MelhorEnvioClient).useValue(melhorEnvio));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    melhorEnvio.offers = [SEDEX, PAC];
    melhorEnvio.down = false;
    melhorEnvio.asked.length = 0;
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', shopBody('lessari'));
    blouse = await variantOf({ name: 'Blusa', priceCents: 5990, ...parcel });
  });

  function call(method: 'POST' | 'PUT', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  async function variantOf(product: object): Promise<string> {
    const response = await call('POST', '/api/stores/lessari/products', product);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>().variants[0]!.id;
  }

  async function connect() {
    const begun = await call('POST', '/api/stores/lessari/integrations/melhor-envio/authorize');
    const state = new URL(begun.json<IntegrationAuthorization>().url).searchParams.get('state')!;
    expect((await call('POST', '/api/integrations/melhor-envio/callback', { code: 'c1', state })).statusCode).toBe(200);
  }

  /** A shop that sells by carrier: connected, and switched on in its delivery rules. */
  async function shipping() {
    await connect();
    await call('PUT', '/api/stores/lessari/delivery', rules);
  }

  async function quote(items: { variantId: string; quantity: number }[] = [{ variantId: blouse, quantity: 2 }]): Promise<ShippingQuote> {
    const response = await app.inject({ method: 'POST', url: '/api/stores/lessari/shipping/quote', payload: { destination: { zipCode: '30140-071' }, items } });
    expect(response.statusCode).toBe(200);
    return response.json<ShippingQuote>();
  }

  it("lists the carriers between the shop's own delivery and pickup, the cheapest first, a day to post added", async () => {
    await shipping();

    const answer = await quote();

    expect(answer.carriers).toEqual({ status: 'QUOTED' });
    expect(answer.options).toEqual([
      { kind: 'OWN_DELIVERY', carrier: null, feeCents: null, window: null, freeAbove: false },
      carrier(PAC, 1),
      carrier(SEDEX, 1),
      { kind: 'PICKUP', carrier: null, feeCents: 0, window: null, freeAbove: false },
    ]);
  });

  it("asks Melhor Envio with the shop's token, from its CEP, the products in centimetres, kilograms and reais", async () => {
    await shipping();

    await quote();

    expect(melhorEnvio.asked).toEqual([
      {
        token: 'access-1',
        request: { fromZipCode: '01310930', toZipCode: '30140071', serviceIds: null, products: [{ id: blouse, lengthCm: 26, widthCm: 20, heightCm: 4, weightKg: 0.3, insuranceReais: 59.9, quantity: 2 }] },
      },
    ]);
  });

  it('asks only about the services the shop chose, adds the days it takes to post, and insures what the customer pays', async () => {
    await shipping();
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', { handlingDays: 3, serviceIds: [2], defaultPackage: null });
    await call('POST', '/api/stores/lessari/promotions', { name: 'Dez por cento', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: new Date(Date.now() - 86_400_000).toISOString() });

    const answer = await quote();

    expect(answer.options.filter((option) => option.kind === 'CARRIER')).toEqual([carrier(SEDEX, 3)]);
    expect(melhorEnvio.asked[0]?.request).toMatchObject({ serviceIds: [2], products: [{ insuranceReais: 53.91 }] });
  });

  it('lists no carrier, and asks Melhor Envio nothing, for a shop that does not sell by carrier', async () => {
    // Connected, and the switch never turned on.
    await connect();
    expect((await quote()).carriers).toEqual({ status: 'OFF' });

    // Switched on, and no service chosen.
    await call('PUT', '/api/stores/lessari/delivery', rules);
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', { handlingDays: 1, serviceIds: [], defaultPackage: null });
    expect((await quote()).carriers).toEqual({ status: 'OFF' });

    // Switched on, and no account connected.
    await app.inject({ method: 'DELETE', url: '/api/stores/lessari/integrations/melhor-envio', headers: { authorization: `Bearer ${owner.accessToken}` } });
    expect(await quote()).toMatchObject({ carriers: { status: 'OFF' }, options: [{ kind: 'OWN_DELIVERY' }, { kind: 'PICKUP' }] });

    expect(melhorEnvio.asked).toEqual([]);
  });

  it('says what keeps the carriers from quoting a cart, by the rule the product list reads', async () => {
    await shipping();
    const unweighed = await variantOf({ name: 'Camiseta', priceCents: 5000 });
    const unboxed = await variantOf({ name: 'Caneca', priceCents: 3000, weightGrams: 400 });

    expect((await quote([{ variantId: blouse, quantity: 1 }, { variantId: unweighed, quantity: 1 }])).carriers).toEqual({ status: 'NOT_QUOTABLE', reason: 'NO_WEIGHT' });
    expect((await quote([{ variantId: unboxed, quantity: 1 }])).carriers).toEqual({ status: 'NOT_QUOTABLE', reason: 'NO_SIZE' });
    expect(melhorEnvio.asked).toEqual([]);

    // With a default parcel, the product with no size is quoted in it.
    await call('PUT', '/api/stores/lessari/integrations/melhor-envio/settings', { handlingDays: 1, serviceIds: [1, 2], defaultPackage: { weightGrams: 500, lengthMm: 300, widthMm: 200, heightMm: 100 } });
    expect((await quote([{ variantId: unboxed, quantity: 1 }])).carriers).toEqual({ status: 'QUOTED' });
    expect(melhorEnvio.asked[0]?.request.products).toEqual([{ id: unboxed, lengthCm: 30, widthCm: 20, heightCm: 10, weightKg: 0.4, insuranceReais: 30, quantity: 1 }]);
  });

  it('has nowhere to post from while the shop has no CEP', async () => {
    await shipping();
    await prisma.store.update({ where: { slug: 'lessari' }, data: { addressZipCode: null } });

    expect((await quote()).carriers).toEqual({ status: 'NOT_QUOTABLE', reason: 'NO_ORIGIN' });
  });

  it("answers with the shop's own options alone when Melhor Envio is down or stopped accepting the connection — never a failed quote", async () => {
    await shipping();
    melhorEnvio.down = true;
    expect(await quote()).toMatchObject({ carriers: { status: 'UNAVAILABLE' }, options: [{ kind: 'OWN_DELIVERY' }, { kind: 'PICKUP' }] });

    melhorEnvio.down = false;
    melhorEnvio.asked.length = 0;
    await prisma.storeIntegration.updateMany({ data: { status: 'NEEDS_RECONNECT' } });
    expect((await quote()).carriers).toEqual({ status: 'UNAVAILABLE' });
    expect(melhorEnvio.asked).toEqual([]);
  });

  it('remembers the answer for the same cart and address, and asks again once the cart changes or after a failure', async () => {
    await shipping();

    await quote();
    await quote();
    expect(melhorEnvio.asked).toHaveLength(1);

    await quote([{ variantId: blouse, quantity: 3 }]);
    expect(melhorEnvio.asked).toHaveLength(2);

    melhorEnvio.down = true;
    await quote([{ variantId: blouse, quantity: 4 }]);
    melhorEnvio.down = false;
    expect((await quote([{ variantId: blouse, quantity: 4 }])).carriers).toEqual({ status: 'QUOTED' });
    expect(melhorEnvio.asked).toHaveLength(4);
  });

  it('lists none when no service of the shop reaches the address, and still says it quoted', async () => {
    await shipping();
    melhorEnvio.offers = [];

    expect(await quote()).toMatchObject({ carriers: { status: 'QUOTED' }, options: [{ kind: 'OWN_DELIVERY' }, { kind: 'PICKUP' }] });
  });
});
