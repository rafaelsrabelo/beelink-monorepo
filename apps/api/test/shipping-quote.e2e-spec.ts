// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, ProductDetail, ShippingQuote } from '@harness-monorepo/contracts';

// App
import { DestinationGeocoder, type Destination } from '../src/modules/delivery/destination-geocoder.js';
import type { GeoPoint } from '../src/modules/delivery/distance.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const SHOP: GeoPoint = { latitude: -23.5614, longitude: -46.6559 };

/** The map as the tests draw it: a CEP 2.6 km from the shop, one 10.8 km away, and one nobody can place. */
class FakeGeocoder {
  readonly asked: Destination[] = [];
  private readonly points: Record<string, GeoPoint> = {
    '01310930': { latitude: -23.5505, longitude: -46.6333 },
    '04001000': { latitude: -23.65, longitude: -46.7 },
  };

  async locate(destination: Destination): Promise<GeoPoint | null> {
    this.asked.push(destination);
    return this.points[destination.zipCode] ?? null;
  }
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const near = { upToMeters: 3000, feeCents: 500, windowFromMinutes: 30, windowToMinutes: 50 };
const town = { upToMeters: 8000, feeCents: 900, windowFromMinutes: 40, windowToMinutes: 70 };
const rules = { pickupEnabled: true, ownDeliveryEnabled: true, bands: [near, town], freeAboveCents: 15000, carriersEnabled: false };
const pickup = { kind: 'PICKUP', carrier: null, feeCents: 0, window: null, freeAbove: false };

describe('the delivery quote (BEELINK-176)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let geocoder: FakeGeocoder;
  let variantId: string;

  beforeAll(async () => {
    geocoder = new FakeGeocoder();
    app = await createTestApp((builder) => builder.overrideProvider(DestinationGeocoder).useValue(geocoder));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    geocoder.asked.length = 0;
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await prisma.store.update({ where: { slug: 'lessari' }, data: SHOP });
    variantId = (await addProduct({ name: 'Blusa', priceCents: 5000 })).variants[0]!.id;
  });

  function call(method: 'POST' | 'PUT', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await call('POST', '/api/stores/lessari/products', owner, body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  const quoteFor = (zipCode: string, quantity = 1, item = variantId) => call('POST', '/api/stores/lessari/shipping/quote', null, { destination: { zipCode, street: 'Rua Augusta', number: '1500' }, items: [{ variantId: item, quantity }] });
  const save = (body: object) => call('PUT', '/api/stores/lessari/delivery', owner, body);

  it("charges the band that reaches the address, with its window, and lists pickup after it", async () => {
    await save(rules);

    const response = await quoteFor('01310-930');

    expect(response.statusCode).toBe(200);
    expect(response.json<ShippingQuote>()).toEqual({
      options: [{ kind: 'OWN_DELIVERY', carrier: null, feeCents: 500, window: { unit: 'MINUTES', from: 30, to: 50 }, freeAbove: false }, pickup],
      ownDelivery: { status: 'QUOTED', distanceMeters: 2603 },
      carriers: { status: 'OFF' },
      productsCents: 5000,
    });
    expect(geocoder.asked).toEqual([{ zipCode: '01310930', street: 'Rua Augusta', number: '1500', neighborhood: null, city: null, state: null }]);
  });

  it('delivers free once the products reach the amount — measured after the promotions', async () => {
    await save(rules);
    expect((await quoteFor('01310930', 3)).json<ShippingQuote>().options[0]).toMatchObject({ feeCents: 0, freeAbove: true });

    const promotion = await call('POST', '/api/stores/lessari/promotions', owner, { name: 'Dez por cento', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: new Date(Date.now() - 86_400_000).toISOString() });
    expect(promotion.statusCode).toBe(201);

    const after = (await quoteFor('01310930', 3)).json<ShippingQuote>();
    expect(after.productsCents).toBe(13500);
    expect(after.options[0]).toMatchObject({ feeCents: 500, freeAbove: false });
  });

  it('leaves its own delivery out past the last band, saying how far, and still offers pickup', async () => {
    await save(rules);

    expect((await quoteFor('04001000')).json<ShippingQuote>()).toMatchObject({ options: [pickup], ownDelivery: { status: 'OUT_OF_RANGE', distanceMeters: 10828, radiusMeters: 8000 } });
  });

  it('agrees the fee later, never inventing one, for an address it cannot place', async () => {
    await save(rules);

    expect((await quoteFor('69900000')).json<ShippingQuote>()).toMatchObject({
      options: [{ kind: 'OWN_DELIVERY', feeCents: null, window: null, freeAbove: false }, pickup],
      ownDelivery: { status: 'AGREE_LATER', reason: 'ADDRESS_UNPLACED' },
    });
  });

  it("does not place the address on the map when nothing needs the distance: no bands, or the shop off the map", async () => {
    // The rules as they stand before the shop ever saves them: delivery with the fee agreed afterwards.
    expect((await quoteFor('01310930')).json<ShippingQuote>()).toMatchObject({ ownDelivery: { status: 'AGREE_LATER', reason: 'NO_BANDS' } });

    await save(rules);
    await prisma.store.update({ where: { slug: 'lessari' }, data: { latitude: null, longitude: null } });
    expect((await quoteFor('01310930')).json<ShippingQuote>()).toMatchObject({ ownDelivery: { status: 'AGREE_LATER', reason: 'SHOP_UNPLACED' } });

    expect(geocoder.asked).toEqual([]);
  });

  it('offers only what is switched on — nothing at all when every mode is off', async () => {
    await save({ ...rules, pickupEnabled: false });
    expect((await quoteFor('01310930')).json<ShippingQuote>().options.map((option) => option.kind)).toEqual(['OWN_DELIVERY']);

    await save({ ...rules, pickupEnabled: false, ownDeliveryEnabled: false });
    expect((await quoteFor('01310930')).json<ShippingQuote>()).toMatchObject({ options: [], ownDelivery: { status: 'OFF' } });
  });

  it.each([
    ['a CEP of seven digits', { zipCode: '0131093' }],
    ['a UF of three letters', { zipCode: '01310930', state: 'SPA' }],
    ['no destination at all', null],
  ])('refuses %s', async (_, destination) => {
    const response = await call('POST', '/api/stores/lessari/shipping/quote', null, { ...(destination ? { destination } : {}), items: [{ variantId, quantity: 1 }] });
    expect(response.json()).toMatchObject({ statusCode: 400, errorCode: 'SHIPPING_DESTINATION_INVALID' });
  });

  it("quotes a draft at the panel's door, which only the owner opens, and not at the shop window's", async () => {
    await save(rules);
    const draft = (await addProduct({ name: 'Rascunho', priceCents: 1000, status: 'DRAFT' })).variants[0]!.id;
    const body = { destination: { zipCode: '01310930' }, items: [{ variantId: draft, quantity: 1 }] };

    expect((await quoteFor('01310930', 1, draft)).json()).toMatchObject({ statusCode: 400, errorCode: 'ORDER_VARIANT_INVALID' });
    expect((await call('POST', '/api/stores/lessari/delivery/quote', owner, body)).json<ShippingQuote>()).toMatchObject({ ownDelivery: { status: 'QUOTED' }, productsCents: 1000 });
    expect((await call('POST', '/api/stores/lessari/delivery/quote', stranger, body)).json()).toMatchObject({ statusCode: 403, errorCode: 'STORE_FORBIDDEN' });
  });

  it('says there is no such shop', async () => {
    const response = await call('POST', '/api/stores/nenhuma/shipping/quote', null, { destination: { zipCode: '01310930' }, items: [{ variantId, quantity: 1 }] });
    expect(response.json()).toMatchObject({ statusCode: 404, errorCode: 'STORE_NOT_FOUND' });
  });
});
