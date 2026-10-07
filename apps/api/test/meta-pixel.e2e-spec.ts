// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, MetaPixelConnection, PublicStore, Store } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const PIXEL = '1234567890123456';
const OTHER_PIXEL = '987654321098765';
const PATH = '/api/stores/lessari/integrations/meta-pixel';
/** No Conversions API token saved (BEELINK-274), on a deployment that could keep one. */
const NO_TOKEN = { available: true, token: 'NONE', refusal: null, refusedAt: null };

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shop's Meta Pixel (BEELINK-269)", () => {
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
  const save = (pixelId: unknown, session: AuthSession = owner) => call('POST', PATH, session, { pixelId });
  const read = () => call('GET', PATH, owner);
  const publicShop = async (slug = 'lessari') => (await call('GET', `/api/stores/${slug}/public`, null)).json<PublicStore>();
  const rows = () => prisma.storeIntegration.findMany({ where: { provider: 'META_PIXEL' } });

  it('says a shop has no pixel, to its owner and in its public data', async () => {
    const response = await read();

    expect(response.statusCode).toBe(200);
    expect(response.json<MetaPixelConnection>()).toEqual({ status: 'DISCONNECTED', pixelId: null, connectedAt: null, conversions: NO_TOKEN });
    expect((await publicShop()).metaPixelId).toBeNull();
  });

  it("saves the ID, answers it to the owner and carries it in the shop's public data — and in no other shop's", async () => {
    const response = await save(`  ${PIXEL}\n`);

    expect(response.statusCode).toBe(200);
    expect(response.json<MetaPixelConnection>()).toEqual({ status: 'CONNECTED', pixelId: PIXEL, connectedAt: expect.any(String), conversions: NO_TOKEN });
    expect((await read()).json<MetaPixelConnection>()).toMatchObject({ status: 'CONNECTED', pixelId: PIXEL });
    expect((await publicShop()).metaPixelId).toBe(PIXEL);
    expect((await publicShop('vizinha')).metaPixelId).toBeNull();
    // The owner's own read of the shop extends the public shape.
    expect((await call('GET', '/api/stores/lessari', owner)).json<Store>().metaPixelId).toBe(PIXEL);

    // The ID is public: nothing is sealed for it, in a row of the shop's own.
    const [row] = await rows();
    expect(row).toMatchObject({ pixelId: PIXEL, status: 'CONNECTED', secretSealed: '', accountId: null, webhookTokenHash: null });
  });

  it('replaces the ID on a second save, keeping one row', async () => {
    await save(PIXEL);

    const response = await save(OTHER_PIXEL);

    expect(response.json<MetaPixelConnection>()).toMatchObject({ status: 'CONNECTED', pixelId: OTHER_PIXEL });
    expect(await rows()).toHaveLength(1);
    expect((await publicShop()).metaPixelId).toBe(OTHER_PIXEL);
  });

  it("removes it: the row is deleted, and the shop's public data carries no ID again", async () => {
    await save(PIXEL);

    expect((await call('DELETE', PATH, owner)).statusCode).toBe(204);
    expect(await rows()).toEqual([]);
    expect((await read()).json<MetaPixelConnection>()).toEqual({ status: 'DISCONNECTED', pixelId: null, connectedAt: null, conversions: NO_TOKEN });
    expect((await publicShop()).metaPixelId).toBeNull();
    // Removing what is not there is not an error: the panel's button may be pressed twice.
    expect((await call('DELETE', PATH, owner)).statusCode).toBe(204);
  });

  /** Shops share one domain: a script saved here would run on a neighbour's page. Only digits are an ID. */
  it('refuses whatever is not 10 to 20 digits — a script above all — and keeps what was saved', async () => {
    await save(PIXEL);

    const refused = [
      {},
      { pixelId: '' },
      { pixelId: '123456789' },
      { pixelId: '123456789012345678901' },
      { pixelId: 1234567890123456 },
      { pixelId: '1234 5678 9012 3456' },
      { pixelId: '12345678901234a' },
      { pixelId: "1234567890');alert(1);//" },
      { pixelId: '<script src="https://evil.test/x.js"></script>' },
      { pixelId: `${PIXEL}\n<script>alert(1)</script>` },
    ];
    for (const payload of refused) {
      const response = await call('POST', PATH, owner, payload);
      expect([response.statusCode, response.json<{ errorCode: string }>().errorCode], JSON.stringify(payload)).toEqual([400, 'META_PIXEL_ID_INVALID']);
    }
    // A script has no field to ride in beside the ID either.
    expect((await call('POST', PATH, owner, { pixelId: OTHER_PIXEL, script: '<script></script>' })).statusCode).toBe(400);

    expect(await rows()).toHaveLength(1);
    expect((await publicShop()).metaPixelId).toBe(PIXEL);
  });

  it('is refused by the database too, whoever writes the row', async () => {
    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });

    for (const pixelId of ['<script>', '12345', '1234567890123456x']) {
      await expect(prisma.storeIntegration.create({ data: { storeId, provider: 'META_PIXEL', pixelId } })).rejects.toThrow(/store_integrations_pixel_id_check|check constraint/i);
    }
    expect(await rows()).toEqual([]);
  });

  it("is the owner's alone, and closed to anyone signed out", async () => {
    await save(PIXEL);

    for (const [method, payload] of [['GET', undefined], ['POST', { pixelId: OTHER_PIXEL }], ['DELETE', undefined]] as const) {
      const response = await call(method, PATH, stranger, payload);
      expect([response.statusCode, response.json<{ errorCode: string }>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await call(method, PATH, null, payload)).statusCode).toBe(401);
    }

    expect((await read()).json<MetaPixelConnection>().pixelId).toBe(PIXEL);
    expect((await publicShop()).metaPixelId).toBe(PIXEL);
  });

  it("leaves the shop's other connections alone", async () => {
    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
    await prisma.storeIntegration.create({ data: { storeId, provider: 'ASAAS', secretSealed: 'v1.sealed', accountName: 'Lessari' } });

    await save(PIXEL);
    await call('DELETE', PATH, owner);

    expect(await prisma.storeIntegration.findMany({ select: { provider: true, secretSealed: true } })).toEqual([{ provider: 'ASAAS', secretSealed: 'v1.sealed' }]);
  });
});
