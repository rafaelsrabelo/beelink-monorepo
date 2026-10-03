// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, DeliverySettings } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const near = { upToMeters: 3000, feeCents: 500, windowFromMinutes: 30, windowToMinutes: 50 };
const far = { upToMeters: 8000, feeCents: 900, windowFromMinutes: 40, windowToMinutes: 70 };
const rules = { pickupEnabled: false, ownDeliveryEnabled: true, bands: [near, far], freeAboveCents: 15000, carriersEnabled: true };

describe("a shop's delivery rules (BEELINK-175)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${session.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  const delivery = '/api/stores/lessari/delivery';

  it("starts from what the checkout offered before there were rules: pickup, a delivery with the fee agreed afterwards, no carrier", async () => {
    expect((await call('GET', delivery, owner)).json<DeliverySettings>()).toEqual({
      pickupEnabled: true,
      ownDeliveryEnabled: true,
      bands: [],
      radiusMeters: null,
      freeAboveCents: null,
      carriersEnabled: false,
      updatedAt: null,
    });
  });

  it('keeps what is saved, whole, and reads the radius from the last band', async () => {
    const saved = await call('PUT', delivery, owner, rules);

    expect(saved.statusCode).toBe(200);
    expect(saved.json<DeliverySettings>()).toMatchObject({ ...rules, radiusMeters: 8000 });
    expect((await call('GET', delivery, owner)).json<DeliverySettings>()).toMatchObject({ ...rules, radiusMeters: 8000 });
  });

  it('replaces the bands rather than adding to them, and takes none', async () => {
    await call('PUT', delivery, owner, rules);

    const one = await call('PUT', delivery, owner, { ...rules, bands: [{ ...near, upToMeters: 5000 }] });
    expect(one.json<DeliverySettings>()).toMatchObject({ bands: [{ ...near, upToMeters: 5000 }], radiusMeters: 5000 });

    const none = await call('PUT', delivery, owner, { ...rules, bands: [], freeAboveCents: null });
    expect(none.json<DeliverySettings>()).toMatchObject({ bands: [], radiusMeters: null, freeAboveCents: null });
    expect(await prisma.deliveryBand.count()).toBe(0);
  });

  it('takes every mode switched off — the checkout decides what such a shop offers', async () => {
    const off = await call('PUT', delivery, owner, { ...rules, pickupEnabled: false, ownDeliveryEnabled: false, carriersEnabled: false });
    expect(off.statusCode).toBe(200);
  });

  it.each([
    ['bands out of order', { ...rules, bands: [far, near] }],
    ['two bands of the same reach', { ...rules, bands: [near, { ...far, upToMeters: 3000 }] }],
    ['a window that ends before it starts', { ...rules, bands: [{ ...near, windowFromMinutes: 60, windowToMinutes: 30 }] }],
    ['a reach past 200 km', { ...rules, bands: [{ ...near, upToMeters: 200_001 }] }],
    ['a negative fee', { ...rules, bands: [{ ...near, feeCents: -1 }] }],
    ['eleven bands', { ...rules, bands: Array.from({ length: 11 }, (_, index) => ({ ...near, upToMeters: (index + 1) * 1000 })) }],
    ['free above nothing', { ...rules, freeAboveCents: 0 }],
    ['a mode left out', { pickupEnabled: true, ownDeliveryEnabled: true, bands: [], freeAboveCents: null }],
    ['a band that is not an object', { ...rules, bands: [3000] }],
  ])('refuses %s', async (_, body) => {
    const response = await call('PUT', delivery, owner, body);
    expect(response.json()).toMatchObject({ statusCode: 400, errorCode: 'DELIVERY_SETTINGS_INVALID' });
  });

  it("keeps another person's hands off them", async () => {
    expect((await call('GET', delivery, stranger)).json()).toMatchObject({ statusCode: 403, errorCode: 'STORE_FORBIDDEN' });
    expect((await call('PUT', delivery, stranger, rules)).json()).toMatchObject({ statusCode: 403, errorCode: 'STORE_FORBIDDEN' });
  });
});
