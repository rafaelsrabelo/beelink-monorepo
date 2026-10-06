// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AsaasConnection, AuthSession } from '@harness-monorepo/contracts';

// App
import { AsaasClient, AsaasRefused, type AsaasAccountInfo, type AsaasWebhookRequest } from '../src/modules/integrations/asaas/asaas.client.js';
import type { AsaasConfig } from '../src/modules/integrations/asaas/asaas.config.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { AsaasWithoutCharges } from './support/asaas-stub.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';
const OTHER_KEY = '$aact_hmlg_111NjY2ZjZkZjU3MzM3YjQ4NDFiNTE3ZmI0MmQ2ZTA6OjAwMDAwMDAwMDAwMDAwMDAwMDA';

/** Asaas, as far as a connection can tell: two keys it knows, and every call it was asked. */
class FakeAsaas extends AsaasWithoutCharges {
  readonly calls: string[] = [];

  async account(_config: AsaasConfig, apiKey: string): Promise<AsaasAccountInfo> {
    this.calls.push('account');
    if (apiKey === KEY) return { name: 'Lessari', document: '11222333000181' };
    if (apiKey === OTHER_KEY) return { name: 'Maria Lessari', document: '12345678909' };
    throw new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida');
  }

  async createWebhook(_config: AsaasConfig, _apiKey: string, _webhook: AsaasWebhookRequest): Promise<string> {
    this.calls.push('createWebhook');
    return 'wh_1';
  }

  async deleteWebhook(): Promise<void> {
    this.calls.push('deleteWebhook');
  }
}

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shop's Asaas connection (BEELINK-202)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let asaas: FakeAsaas;

  beforeAll(async () => {
    asaas = new FakeAsaas();
    app = await createTestApp((builder) => builder.overrideProvider(AsaasClient).useValue(asaas));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    asaas.calls.length = 0;
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
  });

  function call(method: 'GET' | 'POST' | 'DELETE', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }
  const connect = (apiKey: string, session: AuthSession = owner) => call('POST', '/api/stores/lessari/integrations/asaas', session, { apiKey });
  const read = () => call('GET', '/api/stores/lessari/integrations/asaas', owner);
  const rows = () => prisma.storeIntegration.findMany({ where: { provider: 'ASAAS' } });

  it('says a shop is not connected, and that this deployment can connect it', async () => {
    const response = await read();

    expect(response.statusCode).toBe(200);
    expect(response.json<AsaasConnection>()).toEqual({ available: true, environment: 'SANDBOX', status: 'DISCONNECTED', account: null, webhook: null, approval: null, approvalCheckedAt: null, connectedAt: null });
  });

  it('connects with the pasted key, sealed, and answers whose account it is — never the key', async () => {
    const response = await connect(`  ${KEY}\n`);

    expect(response.statusCode).toBe(200);
    expect(response.json<AsaasConnection>()).toMatchObject({ status: 'CONNECTED', account: { name: 'Lessari', document: '**.222.333/0001-**' }, webhook: 'SKIPPED' });
    expect(response.payload).not.toContain('aact');
    // The test web is http://localhost: Asaas could not reach it, so nothing is registered there.
    expect(asaas.calls).toEqual(['account']);

    const [row] = await rows();
    expect(row!.secretSealed).toMatch(/^v1\./);
    expect(row!.secretSealed).not.toContain('aact');
    expect(row!.webhookTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await read()).json<AsaasConnection>()).toMatchObject({ status: 'CONNECTED', account: { name: 'Lessari' } });
    expect((await read()).payload).not.toContain('aact');
  });

  it('replaces the key on a second connect, keeping one connection with a new token', async () => {
    await connect(KEY);
    const [before] = await rows();

    const response = await connect(OTHER_KEY);

    expect(response.json<AsaasConnection>().account).toEqual({ name: 'Maria Lessari', document: '***.456.789-**' });
    const after = await rows();
    expect(after).toHaveLength(1);
    expect(after[0]!.webhookTokenHash).not.toBe(before!.webhookTokenHash);
    expect(after[0]!.secretSealed).not.toBe(before!.secretSealed);
  });

  it("refuses a key Asaas does not know, one from production, and a body that is no key — and keeps nothing", async () => {
    const unknown = await connect('$aact_hmlg_not-a-key-of-anyone-0000');
    expect([unknown.statusCode, unknown.json<{ errorCode: string }>().errorCode]).toEqual([400, 'INTEGRATION_KEY_INVALID']);

    const production = await connect('$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZm');
    expect([production.statusCode, production.json<{ errorCode: string }>().errorCode]).toEqual([400, 'INTEGRATION_KEY_WRONG_ENVIRONMENT']);

    // The last one is a key Asaas knows with a zero-width space copied along: no header could carry it.
    for (const payload of [{}, { apiKey: '' }, { apiKey: '$aact_hmlg_with a space inside it' }, { apiKey: 42 }, { apiKey: `${KEY}​` }]) {
      const response = await call('POST', '/api/stores/lessari/integrations/asaas', owner, payload);
      expect([response.statusCode, response.json<{ errorCode: string }>().errorCode]).toEqual([400, 'INTEGRATION_KEY_INVALID']);
    }

    expect(await rows()).toEqual([]);
    expect(asaas.calls).toEqual(['account']);
  });

  /** Connecting presents a credential: without a limit the route would test leaked keys against Asaas from bee-link's address. */
  it("counts a connect against the auth routes' limit per address, and a read against none", async () => {
    expect(Number((await connect(KEY)).headers['x-ratelimit-limit'])).toBe(1000);
    expect((await read()).headers['x-ratelimit-limit']).toBeUndefined();
  });

  it('disconnects: the key is deleted, and the shop reads disconnected again', async () => {
    await connect(KEY);

    expect((await call('DELETE', '/api/stores/lessari/integrations/asaas', owner)).statusCode).toBe(204);
    expect(await rows()).toEqual([]);
    expect((await read()).json<AsaasConnection>().status).toBe('DISCONNECTED');
    // Nothing was registered while the web was local, so nothing is removed from the account.
    expect(asaas.calls).toEqual(['account']);
  });

  it("is the owner's alone, and closed to anyone signed out", async () => {
    await connect(KEY);
    asaas.calls.length = 0;

    for (const [method, payload] of [['GET', undefined], ['POST', { apiKey: OTHER_KEY }], ['DELETE', undefined]] as const) {
      const response = await call(method, '/api/stores/lessari/integrations/asaas', stranger, payload);
      expect([response.statusCode, response.json<{ errorCode: string }>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await call(method, '/api/stores/lessari/integrations/asaas', null, payload)).statusCode).toBe(401);
    }

    expect(asaas.calls).toEqual([]);
    expect((await read()).json<AsaasConnection>().account?.name).toBe('Lessari');
  });
});
