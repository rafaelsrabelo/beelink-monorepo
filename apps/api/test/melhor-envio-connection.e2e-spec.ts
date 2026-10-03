// Node
import { randomUUID } from 'node:crypto';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, IntegrationAuthorization, MelhorEnvioConnected, MelhorEnvioConnection } from '@harness-monorepo/contracts';

// App
import { MelhorEnvioClient, MelhorEnvioRefused, MelhorEnvioUnreachable, type MelhorEnvioTokens } from '../src/modules/integrations/melhor-envio/melhor-envio.client.js';
import { MelhorEnvioService } from '../src/modules/integrations/melhor-envio/melhor-envio.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const DAY = 24 * 60 * 60 * 1000;
const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

/**
 * Melhor Envio, as far as a connection can tell: a code is good once, and each refresh token is good
 * once — every trade hands out a new one, as Melhor Envio does. `down` stands for it not answering.
 */
class FakeMelhorEnvio {
  readonly exchanges: string[] = [];
  readonly refreshes: string[] = [];
  down = false;
  private readonly codes = new Set<string>();
  private readonly refreshTokens = new Set<string>();

  authorizationUrl(_config: unknown, state: string): string {
    return `https://sandbox.melhorenvio.test/oauth/authorize?state=${state}`;
  }

  /** The shopkeeper consenting on Melhor Envio's page. */
  grant(): string {
    const code = randomUUID();
    this.codes.add(code);
    return code;
  }

  async exchange(_config: unknown, code: string): Promise<MelhorEnvioTokens> {
    this.exchanges.push(code);
    if (this.down) throw new MelhorEnvioUnreachable('down');
    if (!this.codes.delete(code)) throw new MelhorEnvioRefused(400, 'invalid_grant');
    return this.issue();
  }

  async refresh(_config: unknown, refreshToken: string): Promise<MelhorEnvioTokens> {
    this.refreshes.push(refreshToken);
    // Slow enough that two renewals at once overlap, if nothing keeps them apart.
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (this.down) throw new MelhorEnvioUnreachable('down');
    if (!this.refreshTokens.delete(refreshToken)) throw new MelhorEnvioRefused(401, 'invalid_grant');
    return this.issue();
  }

  async account(): Promise<{ id: string; name: string; email: string | null }> {
    return { id: 'me-account-1', name: 'Loja Lessari', email: 'envios@lessari.test' };
  }

  private issue(): MelhorEnvioTokens {
    const refreshToken = `refresh-${randomUUID()}`;
    this.refreshTokens.add(refreshToken);
    return { accessToken: `access-${randomUUID()}`, refreshToken, expiresInSeconds: THIRTY_DAYS_S };
  }
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shop's Melhor Envio connection (BEELINK-182)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let service: MelhorEnvioService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let melhorEnvio: FakeMelhorEnvio;

  beforeAll(async () => {
    melhorEnvio = new FakeMelhorEnvio();
    app = await createTestApp((builder) => builder.overrideProvider(MelhorEnvioClient).useValue(melhorEnvio));
    prisma = app.get(PrismaService);
    service = app.get(MelhorEnvioService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    melhorEnvio.down = false;
    melhorEnvio.exchanges.length = 0;
    melhorEnvio.refreshes.length = 0;
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    await call('POST', '/api/stores', stranger, shopBody('outra-loja'));
  });

  function call(method: 'GET' | 'POST' | 'DELETE', url: string, session: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${session.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  async function begin(session = owner, slug = 'lessari'): Promise<string> {
    const response = await call('POST', `/api/stores/${slug}/integrations/melhor-envio/authorize`, session);
    expect(response.statusCode).toBe(200);
    return new URL(response.json<IntegrationAuthorization>().url).searchParams.get('state')!;
  }

  async function connect(): Promise<MelhorEnvioConnected> {
    const response = await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: melhorEnvio.grant(), state: await begin() });
    expect(response.statusCode).toBe(200);
    return response.json<MelhorEnvioConnected>();
  }

  const storeIdOf = async (slug: string) => (await prisma.store.findUniqueOrThrow({ where: { slug } })).id;
  const rowOf = async () => prisma.storeIntegration.findUniqueOrThrow({ where: { storeId_provider: { storeId: await storeIdOf('lessari'), provider: 'MELHOR_ENVIO' } } });
  /** Moves the connection's clock: its access ends `days` from now. */
  const expiresIn = async (days: number) => prisma.storeIntegration.updateMany({ data: { accessExpiresAt: new Date(Date.now() + days * DAY) } });

  it('says a shop is not connected, and that this deployment can connect it', async () => {
    const response = await call('GET', '/api/stores/lessari/integrations/melhor-envio', owner);

    expect(response.statusCode).toBe(200);
    expect(response.json<MelhorEnvioConnection>()).toEqual({ available: true, environment: 'SANDBOX', status: 'DISCONNECTED', account: null, connectedAt: null, accessExpiresAt: null });
  });

  it('connects the account the shopkeeper authorized, sealing the tokens, and says whose it is', async () => {
    const { storeSlug, connection } = await connect();

    expect(storeSlug).toBe('lessari');
    expect(connection).toMatchObject({ status: 'CONNECTED', account: { name: 'Loja Lessari', email: 'envios@lessari.test' } });
    expect(new Date(connection.accessExpiresAt!).getTime()).toBeGreaterThan(Date.now() + 29 * DAY);

    const row = await rowOf();
    expect(row.secretSealed).toMatch(/^v1\./);
    expect(row.secretSealed).not.toMatch(/access-|refresh-/);
    expect(await prisma.integrationOAuthState.count()).toBe(0);
    expect((await call('GET', '/api/stores/lessari/integrations/melhor-envio', owner)).json<MelhorEnvioConnection>().status).toBe('CONNECTED');
  });

  it('refuses a state used once already, unknown, or past its ten minutes — and asks Melhor Envio nothing', async () => {
    const state = await begin();
    expect((await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: melhorEnvio.grant(), state })).statusCode).toBe(200);
    melhorEnvio.exchanges.length = 0;

    const late = await begin();
    await prisma.integrationOAuthState.update({ where: { state: late }, data: { expiresAt: new Date(Date.now() - 1000) } });

    for (const reused of [state, 'never-issued', late]) {
      const response = await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: melhorEnvio.grant(), state: reused });
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errorCode: 'INTEGRATION_STATE_INVALID' });
    }
    expect(melhorEnvio.exchanges).toEqual([]);
  });

  /** A stranger luring the owner through their own flow would have the shop connected to the stranger's account. */
  it("refuses a state begun by someone else, whoever's browser brings it back", async () => {
    const theirs = await begin(stranger, 'outra-loja');

    const response = await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: melhorEnvio.grant(), state: theirs });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ errorCode: 'INTEGRATION_STATE_INVALID' });
    expect(melhorEnvio.exchanges).toEqual([]);
    expect(await prisma.storeIntegration.count()).toBe(0);
  });

  it('says which shop a refused code was for, so the browser goes back to its panel', async () => {
    const response = await call('POST', '/api/integrations/melhor-envio/callback', owner, { code: 'not-granted', state: await begin() });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ errorCode: 'INTEGRATION_EXCHANGE_FAILED', details: { storeSlug: 'lessari' } });
    expect(await prisma.storeIntegration.count()).toBe(0);
  });

  it("keeps another shopkeeper out of the shop's connection", async () => {
    await connect();

    for (const [method, url] of [['GET', ''], ['POST', '/authorize'], ['DELETE', '']] as const) {
      const response = await call(method, `/api/stores/lessari/integrations/melhor-envio${url}`, stranger);
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ errorCode: 'STORE_FORBIDDEN' });
    }
    expect(await prisma.storeIntegration.count()).toBe(1);
  });

  it('disconnects: the tokens go with the row', async () => {
    await connect();

    expect((await call('DELETE', '/api/stores/lessari/integrations/melhor-envio', owner)).statusCode).toBe(204);
    expect(await prisma.storeIntegration.count()).toBe(0);
    expect((await call('GET', '/api/stores/lessari/integrations/melhor-envio', owner)).json<MelhorEnvioConnection>().status).toBe('DISCONNECTED');
  });

  describe('the access token the shipping tickets ask for', () => {
    it('hands the one in hand while it has days left, renewing nothing', async () => {
      await connect();

      expect(await service.accessTokenFor(await storeIdOf('lessari'))).toMatch(/^access-/);
      expect(melhorEnvio.refreshes).toEqual([]);
    });

    it('renews one close to its end first, keeping the new refresh token for the next time', async () => {
      await connect();
      const before = (await rowOf()).secretSealed;
      await expiresIn(2);

      const token = await service.accessTokenFor(await storeIdOf('lessari'));

      expect(melhorEnvio.refreshes).toHaveLength(1);
      expect(token).toMatch(/^access-/);
      const row = await rowOf();
      expect(row.secretSealed).not.toBe(before);
      expect(row.accessExpiresAt!.getTime()).toBeGreaterThan(Date.now() + 29 * DAY);

      // The next renewal spends the refresh token the last one gave: the old one would be refused.
      await expiresIn(2);
      await service.accessTokenFor(await storeIdOf('lessari'));
      expect((await rowOf()).status).toBe('CONNECTED');
    });

    it('renews once when two ask at the same time: the second waits, and takes the token the first got', async () => {
      await connect();
      await expiresIn(2);
      const storeId = await storeIdOf('lessari');

      const [one, two] = await Promise.all([service.accessTokenFor(storeId), service.accessTokenFor(storeId)]);

      expect(melhorEnvio.refreshes).toHaveLength(1);
      expect(one).toBe(two);
      expect((await rowOf()).status).toBe('CONNECTED');
    });

    it('marks the connection for reconnecting when Melhor Envio refuses the renewal, and says so from then on', async () => {
      await connect();
      await expiresIn(2);
      // Revoked at Melhor Envio: the refresh token it gave is no longer good.
      (melhorEnvio as unknown as { refreshTokens: Set<string> }).refreshTokens.clear();
      const storeId = await storeIdOf('lessari');

      await expect(service.accessTokenFor(storeId)).rejects.toMatchObject({ response: { errorCode: 'INTEGRATION_NEEDS_RECONNECT' } });

      expect((await rowOf()).status).toBe('NEEDS_RECONNECT');
      expect((await call('GET', '/api/stores/lessari/integrations/melhor-envio', owner)).json<MelhorEnvioConnection>().status).toBe('NEEDS_RECONNECT');
      melhorEnvio.refreshes.length = 0;
      await expect(service.accessTokenFor(storeId)).rejects.toMatchObject({ response: { errorCode: 'INTEGRATION_NEEDS_RECONNECT' } });
      expect(melhorEnvio.refreshes).toEqual([]);
    });

    it('keeps using a token still good when Melhor Envio does not answer the renewal, and tries again later', async () => {
      await connect();
      await expiresIn(2);
      melhorEnvio.down = true;

      expect(await service.accessTokenFor(await storeIdOf('lessari'))).toMatch(/^access-/);
      const row = await rowOf();
      expect(row.status).toBe('CONNECTED');
      expect(row.lastError).toBe('down');
    });

    it('refuses a shop that never connected', async () => {
      await expect(service.accessTokenFor(await storeIdOf('lessari'))).rejects.toMatchObject({ response: { errorCode: 'INTEGRATION_NOT_CONNECTED' } });
    });
  });

  describe('the routine that keeps connections alive', () => {
    it('renews the connections ending within the week, and leaves the others', async () => {
      await connect();
      const now = new Date();

      expect(await service.renewDue(now)).toBe(0);
      await expiresIn(6);
      expect(await service.renewDue(now)).toBe(1);
      expect(melhorEnvio.refreshes).toHaveLength(1);
    });

    it('marks for reconnecting a connection whose refresh token ran out, without asking Melhor Envio', async () => {
      await connect();
      await prisma.storeIntegration.updateMany({ data: { accessExpiresAt: new Date(Date.now() - DAY), refreshExpiresAt: new Date(Date.now() - 1000) } });

      expect(await service.renewDue(new Date())).toBe(0);
      expect(melhorEnvio.refreshes).toEqual([]);
      expect((await rowOf()).status).toBe('NEEDS_RECONNECT');
    });
  });
});
