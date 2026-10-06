// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AsaasConnection, AuthSession, MetaPixelConnection, PublicStore } from '@harness-monorepo/contracts';

// App
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported. Melhor
// Envio's three go with the key — set without it, the API refuses to boot.
vi.hoisted(() => {
  for (const name of ['INTEGRATIONS_SECRET_KEY', 'MELHOR_ENVIO_CLIENT_ID', 'MELHOR_ENVIO_CLIENT_SECRET', 'MELHOR_ENVIO_REDIRECT_URI']) process.env[name] = '';
});

const PIXEL = '1234567890123456';
const PATH = '/api/stores/lessari/integrations/meta-pixel';

/** A pixel's ID is public: nothing of it is sealed, so a deployment that can seal nothing still keeps one. */
describe("a shop's Meta Pixel on a deployment with no INTEGRATIONS_SECRET_KEY (BEELINK-269)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', { name: 'lessari', slug: 'lessari', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
  });

  afterAll(async () => {
    await app.close();
  });

  function call(method: 'GET' | 'POST' | 'DELETE', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  it('saves, serves and removes the ID, where a sealed connection cannot be made', async () => {
    expect(env.INTEGRATIONS_SECRET_KEY).toBeUndefined();
    expect((await call('GET', '/api/stores/lessari/integrations/asaas')).json<AsaasConnection>().available).toBe(false);

    const saved = await call('POST', PATH, { pixelId: PIXEL });
    expect([saved.statusCode, saved.json<MetaPixelConnection>()]).toEqual([200, { status: 'CONNECTED', pixelId: PIXEL, connectedAt: expect.any(String) }]);
    expect((await call('GET', PATH)).json<MetaPixelConnection>().pixelId).toBe(PIXEL);
    expect((await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<PublicStore>().metaPixelId).toBe(PIXEL);

    expect((await call('DELETE', PATH)).statusCode).toBe(204);
    expect((await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<PublicStore>().metaPixelId).toBeNull();
  });
});
