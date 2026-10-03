// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, IntegrationAuthorization, MelhorEnvioAccountOverview, MelhorEnvioSettings } from '@harness-monorepo/contracts';

// App
import { MelhorEnvioClient, MelhorEnvioUnreachable, type MelhorEnvioServiceInfo } from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const SERVICES: MelhorEnvioServiceInfo[] = [
  { id: 1, name: 'PAC', company: 'Correios' },
  { id: 2, name: 'SEDEX', company: 'Correios' },
  { id: 3, name: '.Package', company: 'Jadlog' },
];

/** Melhor Envio for the carrier settings: any code is good, and the wallet holds what `balance` says. */
class FakeMelhorEnvio {
  balance = 162490;
  down = false;
  readonly tokensSeen: string[] = [];

  authorizationUrl(_config: unknown, state: string): string {
    return `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`;
  }

  async exchange() {
    return { accessToken: 'access-1', refreshToken: 'refresh-1', expiresInSeconds: 30 * 24 * 60 * 60 };
  }

  async account() {
    return { id: 'me-1', name: 'Loja Lessari', email: null };
  }

  async balanceCents(_config: unknown, token: string): Promise<number> {
    this.tokensSeen.push(token);
    if (this.down) throw new MelhorEnvioUnreachable('down');
    return this.balance;
  }

  async services(): Promise<MelhorEnvioServiceInfo[]> {
    return SERVICES;
  }
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const parcel = { weightGrams: 500, lengthMm: 200, widthMm: 150, heightMm: 100 };

describe("a shop's carrier settings and its Melhor Envio wallet (BEELINK-183)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
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
    melhorEnvio.down = false;
    melhorEnvio.tokensSeen.length = 0;
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${session.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  async function connect() {
    const begun = await call('POST', '/api/stores/lessari/integrations/melhor-envio/authorize', owner);
    const state = new URL(begun.json<IntegrationAuthorization>().url).searchParams.get('state')!;
    expect((await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: 'c1', state })).statusCode).toBe(200);
  }

  const settings = '/api/stores/lessari/integrations/melhor-envio/settings';
  const account = '/api/stores/lessari/integrations/melhor-envio/account';

  it("reads the wallet and the services with the shop's own token", async () => {
    await connect();

    const response = await call('GET', account, owner);

    expect(response.statusCode).toBe(200);
    expect(response.json<MelhorEnvioAccountOverview>()).toEqual({ balanceCents: 162490, services: SERVICES });
    expect(melhorEnvio.tokensSeen).toEqual(['access-1']);
  });

  it('says there is no wallet to read before connecting, and that Melhor Envio did not answer when it did not', async () => {
    expect((await call('GET', account, owner)).json()).toMatchObject({ statusCode: 409, errorCode: 'INTEGRATION_NOT_CONNECTED' });

    await connect();
    melhorEnvio.down = true;
    expect((await call('GET', account, owner)).json()).toMatchObject({ statusCode: 502, errorCode: 'INTEGRATION_UNREACHABLE' });
  });

  it('starts from the defaults — every service, a day to post, no parcel — and keeps what is saved, whole', async () => {
    expect((await call('GET', settings, owner)).json<MelhorEnvioSettings>()).toEqual({ handlingDays: 1, serviceIds: null, defaultPackage: null, senderDocument: null, senderStateRegister: null, updatedAt: null });

    const saved = await call('PUT', settings, owner, { handlingDays: 2, serviceIds: [2, 1], defaultPackage: parcel });

    expect(saved.statusCode).toBe(200);
    expect(saved.json<MelhorEnvioSettings>()).toMatchObject({ handlingDays: 2, serviceIds: [1, 2], defaultPackage: parcel });
    expect((await call('GET', settings, owner)).json<MelhorEnvioSettings>()).toMatchObject({ handlingDays: 2, serviceIds: [1, 2], defaultPackage: parcel });

    // Offering no service and dropping the parcel are choices too.
    const none = await call('PUT', settings, owner, { handlingDays: 0, serviceIds: [], defaultPackage: null });
    expect(none.json<MelhorEnvioSettings>()).toMatchObject({ handlingDays: 0, serviceIds: [], defaultPackage: null });
  });

  it('keeps its choices across disconnecting and connecting again', async () => {
    await connect();
    await call('PUT', settings, owner, { handlingDays: 3, serviceIds: [3], defaultPackage: null });

    await app.inject({ method: 'DELETE', url: '/api/stores/lessari/integrations/melhor-envio', headers: { authorization: `Bearer ${owner.accessToken}` } });
    await connect();

    expect((await call('GET', settings, owner)).json<MelhorEnvioSettings>()).toMatchObject({ handlingDays: 3, serviceIds: [3] });
  });

  it.each([
    ['days past a month', { handlingDays: 31, serviceIds: [1], defaultPackage: null }],
    ['a service twice', { handlingDays: 1, serviceIds: [1, 1], defaultPackage: null }],
    ['half a parcel', { handlingDays: 1, serviceIds: [1], defaultPackage: { weightGrams: 500 } }],
    ['a parcel past the carriers', { handlingDays: 1, serviceIds: [1], defaultPackage: { ...parcel, weightGrams: 30_001 } }],
    ['the parcel left out', { handlingDays: 1, serviceIds: [1] }],
  ])('refuses %s, saying which settings', async (_, body) => {
    const response = await call('PUT', settings, owner, body);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ errorCode: 'MELHOR_ENVIO_SETTINGS_INVALID' });
  });

  it("keeps another shopkeeper out of the shop's settings and wallet", async () => {
    await connect();

    for (const [method, url] of [['GET', settings], ['PUT', settings], ['GET', account]] as const) {
      const response = await call(method, url, stranger, method === 'PUT' ? { handlingDays: 1, serviceIds: [], defaultPackage: null } : undefined);
      expect(response.statusCode).toBe(403);
    }
    expect(melhorEnvio.tokensSeen).toEqual([]);
  });
});
