// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, GoogleAnalyticsConnection, PublicStore, Store } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const ID = 'G-AB12CD34EF';
const OTHER_ID = 'G-ZZ99YY88XX';
const PIXEL = '1234567890123456';
const PATH = '/api/stores/lessari/integrations/google-analytics';
const NEIGHBOUR_PATH = '/api/stores/vizinha/integrations/google-analytics';
const DISCONNECTED = { status: 'DISCONNECTED', measurementId: null, connectedAt: null };

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shop's Google Analytics (BEELINK-301)", () => {
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
    await call('POST', '/api/stores', stranger, shopBody('vizinha'));
  });

  function call(method: 'GET' | 'POST' | 'DELETE', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }
  const save = (measurementId: unknown, session: AuthSession = owner) => call('POST', PATH, session, { measurementId });
  const read = () => call('GET', PATH, owner);
  const publicShop = async (slug = 'lessari') => (await call('GET', `/api/stores/${slug}/public`, null)).json<PublicStore>();
  const rows = () => prisma.storeIntegration.findMany({ where: { provider: 'GOOGLE_ANALYTICS' } });

  it('says a shop has no Google Analytics, to its owner and in its public data', async () => {
    const response = await read();

    expect(response.statusCode).toBe(200);
    expect(response.json<GoogleAnalyticsConnection>()).toEqual(DISCONNECTED);
    expect((await publicShop()).googleAnalyticsId).toBeNull();
  });

  it("saves the ID, answers it to the owner and carries it in the shop's public data — and in no other shop's", async () => {
    const response = await save(`  ${ID}\n`);

    expect(response.statusCode).toBe(200);
    expect(response.json<GoogleAnalyticsConnection>()).toEqual({ status: 'CONNECTED', measurementId: ID, connectedAt: expect.any(String) });
    expect((await read()).json<GoogleAnalyticsConnection>()).toEqual({ status: 'CONNECTED', measurementId: ID, connectedAt: expect.any(String) });
    expect((await publicShop()).googleAnalyticsId).toBe(ID);
    expect((await publicShop('vizinha')).googleAnalyticsId).toBeNull();
    // The owner's own read of the shop extends the public shape.
    expect((await call('GET', '/api/stores/lessari', owner)).json<Store>().googleAnalyticsId).toBe(ID);

    // The ID is public: nothing is sealed for it, in a row of the shop's own.
    const [row] = await rows();
    expect(row).toMatchObject({ measurementId: ID, status: 'CONNECTED', secretSealed: '', pixelId: null, accountId: null, webhookTokenHash: null });
  });

  it('replaces the ID on a second save, keeping one row', async () => {
    await save(ID);

    const response = await save(OTHER_ID);

    expect(response.json<GoogleAnalyticsConnection>()).toMatchObject({ status: 'CONNECTED', measurementId: OTHER_ID });
    expect(await rows()).toHaveLength(1);
    expect((await publicShop()).googleAnalyticsId).toBe(OTHER_ID);
  });

  it("removes it: the row is deleted, and the shop's public data carries no ID again", async () => {
    await save(ID);

    expect((await call('DELETE', PATH, owner)).statusCode).toBe(204);
    expect(await rows()).toEqual([]);
    expect((await read()).json<GoogleAnalyticsConnection>()).toEqual(DISCONNECTED);
    expect((await publicShop()).googleAnalyticsId).toBeNull();
    // Removing what is not there is not an error: the panel's button may be pressed twice.
    expect((await call('DELETE', PATH, owner)).statusCode).toBe(204);
  });

  it('refuses the ID of what is not a GA4 property — UA-, GTM-, AW- — saying what one is, and keeps what was saved', async () => {
    await save(ID);

    for (const measurementId of ['UA-12345678-1', 'GTM-AB12CD3', 'AW-1234567890']) {
      const response = await save(measurementId);
      const body = response.json<ApiErrorBody>();
      expect([response.statusCode, body.errorCode], measurementId).toEqual([400, 'GOOGLE_ANALYTICS_ID_INVALID']);
      const message = [body.message].flat().join(' ');
      for (const said of ['G-XXXXXXXXXX', 'UA-', 'GTM-', 'AW-']) expect(message, measurementId).toContain(said);
    }

    expect((await read()).json<GoogleAnalyticsConnection>().measurementId).toBe(ID);
    expect((await publicShop()).googleAnalyticsId).toBe(ID);
  });

  /** Shops share one domain: a script saved here would run on a neighbour's page. Only an ID is an ID. */
  it('refuses whatever else is not G- and 6 to 16 capitals or digits — a script above all — and keeps what was saved', async () => {
    await save(ID);

    const refused = [
      {},
      { measurementId: '' },
      { measurementId: 'G-' },
      { measurementId: 'G-ABC12' },
      { measurementId: 'G-ABCDEFGH123456789' },
      { measurementId: 1234567890 },
      { measurementId: 'AB12CD34EF' },
      { measurementId: 'g-ab12cd34ef' },
      { measurementId: 'G-AB12 CD34EF' },
      { measurementId: "G-AB12CD34EF');alert(1);//" },
      { measurementId: '<script async src="https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF"></script>' },
      { measurementId: `${ID}\n<script>alert(1)</script>` },
    ];
    for (const payload of refused) {
      const response = await call('POST', PATH, owner, payload);
      expect([response.statusCode, response.json<ApiErrorBody>().errorCode], JSON.stringify(payload)).toEqual([400, 'GOOGLE_ANALYTICS_ID_INVALID']);
    }
    // A script has no field to ride in beside the ID either.
    expect((await call('POST', PATH, owner, { measurementId: OTHER_ID, script: '<script></script>' })).statusCode).toBe(400);

    expect(await rows()).toHaveLength(1);
    expect((await publicShop()).googleAnalyticsId).toBe(ID);
  });

  it('is refused by the database too, whoever writes the row', async () => {
    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });

    for (const measurementId of ['<script>', 'UA-12345678-1', 'GTM-AB12CD3', 'G-ab12cd34ef', 'G-AB12', 'G-AB12CD34EF x']) {
      await expect(prisma.storeIntegration.create({ data: { storeId, provider: 'GOOGLE_ANALYTICS', measurementId } }), measurementId).rejects.toThrow(/store_integrations_measurement_id_check|check constraint/i);
    }
    expect(await rows()).toEqual([]);
  });

  it("is the owner's alone, and closed to anyone signed out", async () => {
    await save(ID);

    for (const [method, payload] of [['GET', undefined], ['POST', { measurementId: OTHER_ID }], ['DELETE', undefined]] as const) {
      const response = await call(method, PATH, stranger, payload);
      expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await call(method, PATH, null, payload)).statusCode).toBe(401);
    }

    expect((await read()).json<GoogleAnalyticsConnection>().measurementId).toBe(ID);
    expect((await publicShop()).googleAnalyticsId).toBe(ID);
  });

  it("keeps each shop's ID its own: a neighbour saving and removing hers changes nothing here", async () => {
    await save(ID);

    expect((await call('POST', NEIGHBOUR_PATH, stranger, { measurementId: OTHER_ID })).statusCode).toBe(200);
    expect((await call('GET', NEIGHBOUR_PATH, stranger)).json<GoogleAnalyticsConnection>().measurementId).toBe(OTHER_ID);
    expect([(await publicShop()).googleAnalyticsId, (await publicShop('vizinha')).googleAnalyticsId]).toEqual([ID, OTHER_ID]);

    expect((await call('DELETE', NEIGHBOUR_PATH, stranger)).statusCode).toBe(204);
    expect((await read()).json<GoogleAnalyticsConnection>().measurementId).toBe(ID);
    expect([(await publicShop()).googleAnalyticsId, (await publicShop('vizinha')).googleAnalyticsId]).toEqual([ID, null]);
  });

  it("lives beside the shop's Meta Pixel: each in its own row and its own public field, and removing one leaves the other", async () => {
    const pixelPath = '/api/stores/lessari/integrations/meta-pixel';
    await call('POST', pixelPath, owner, { pixelId: PIXEL });
    await save(ID);

    expect(await publicShop()).toMatchObject({ metaPixelId: PIXEL, googleAnalyticsId: ID });
    expect(await prisma.storeIntegration.findMany({ select: { provider: true, pixelId: true, measurementId: true }, orderBy: { provider: 'asc' } })).toEqual([
      { provider: 'META_PIXEL', pixelId: PIXEL, measurementId: null },
      { provider: 'GOOGLE_ANALYTICS', pixelId: null, measurementId: ID },
    ]);

    await call('DELETE', PATH, owner);
    expect(await publicShop()).toMatchObject({ metaPixelId: PIXEL, googleAnalyticsId: null });

    await save(ID);
    await call('DELETE', pixelPath, owner);
    expect(await publicShop()).toMatchObject({ metaPixelId: null, googleAnalyticsId: ID });
  });

  it("leaves the shop's sealed connections alone", async () => {
    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
    await prisma.storeIntegration.create({ data: { storeId, provider: 'ASAAS', secretSealed: 'v1.sealed', accountName: 'Lessari' } });

    await save(ID);
    await call('DELETE', PATH, owner);

    expect(await prisma.storeIntegration.findMany({ select: { provider: true, secretSealed: true } })).toEqual([{ provider: 'ASAAS', secretSealed: 'v1.sealed' }]);
  });
});
