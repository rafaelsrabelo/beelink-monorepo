// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AsaasConnection, AsaasSettings, AuthSession } from '@harness-monorepo/contracts';

// App
import { AsaasClient, type AsaasAccountInfo } from '../src/modules/integrations/asaas/asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** Not keys of anyone: the fake Asaas below takes whatever it is handed. */
const KEY = '$aact_hmlg_e2e-settings-first-key-000000000000';
const OTHER_KEY = '$aact_hmlg_e2e-settings-second-key-00000000000';

/** Asaas, as far as these settings can tell: any key is good, and it is asked nothing about them. */
class FakeAsaas extends AsaasClient {
  readonly calls: string[] = [];

  async account(): Promise<AsaasAccountInfo> {
    this.calls.push('account');
    return { name: 'Lessari', document: '11222333000181' };
  }

  async createWebhook(): Promise<string> {
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

const DEFAULT_CHOICES = { pix: true, card: true, maxInstallments: 1, offline: true };
const CHOICES = { pix: true, card: true, maxInstallments: 6, offline: false };

describe('how a shop is paid through Asaas (BEELINK-203)', () => {
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

  function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const connection = '/api/stores/lessari/integrations/asaas';
  const settings = `${connection}/settings`;
  const read = async () => (await call('GET', settings, owner)).json<AsaasSettings>();
  const save = (body: object, session: AuthSession | null = owner) => call('PUT', settings, session, body);

  /** An instalment's fee is the shop's, so a shop that never chose offers the card in full only. */
  it('starts from the defaults, for a shop that never connected: Pix and card in full, and paying on delivery', async () => {
    const response = await call('GET', settings, owner);

    expect(response.statusCode).toBe(200);
    expect(response.json<AsaasSettings>()).toEqual({ ...DEFAULT_CHOICES, updatedAt: null });
    expect(await prisma.asaasSettings.count()).toBe(0);
  });

  it('saves the choices whole and reads them again, with no connection at all', async () => {
    const saved = await save(CHOICES);

    expect(saved.statusCode).toBe(200);
    expect(saved.json<AsaasSettings>()).toMatchObject(CHOICES);
    expect(Date.parse(saved.json<AsaasSettings>().updatedAt ?? '')).not.toBeNaN();
    expect(await read()).toEqual(saved.json<AsaasSettings>());

    // Saved again, it is the same row: one per shop.
    expect((await save({ ...CHOICES, maxInstallments: 12, pix: false })).json<AsaasSettings>()).toMatchObject({ pix: false, maxInstallments: 12 });
    expect(await prisma.asaasSettings.count()).toBe(1);
    expect(asaas.calls).toEqual([]);
  });

  it('takes each way as the only one on, and keeps the instalments of a card switched off', async () => {
    for (const ways of [{ pix: true, card: false, offline: false }, { pix: false, card: true, offline: false }, { pix: false, card: false, offline: true }]) {
      const response = await save({ ...ways, maxInstallments: 9 });
      expect([response.statusCode, response.json<AsaasSettings>()]).toEqual([200, expect.objectContaining({ ...ways, maxInstallments: 9 })]);
    }
  });

  it.each([
    ['no instalment at all', { ...CHOICES, maxInstallments: 0 }],
    ['instalments past twelve', { ...CHOICES, maxInstallments: 13 }],
    ['half an instalment', { ...CHOICES, maxInstallments: 1.5 }],
    ['instalments as text', { ...CHOICES, maxInstallments: '3' }],
    ['no instalments named', { pix: true, card: true, offline: true }],
    ['a way that is neither on nor off', { ...CHOICES, pix: 'yes' }],
    ['a way left out', { card: true, maxInstallments: 1, offline: true }],
    ['a body with nothing in it', {}],
    ['every way switched off', { pix: false, card: false, maxInstallments: 1, offline: false }],
  ])('refuses %s, saying which settings, and keeps what was saved', async (_, body) => {
    await save(CHOICES);

    const response = await save(body);

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ statusCode: 400, errorCode: 'ASAAS_SETTINGS_INVALID' });
    expect(await read()).toMatchObject(CHOICES);
  });

  it("is the owner's alone, and closed to anyone signed out", async () => {
    await save(CHOICES);

    for (const [method, payload] of [['GET', undefined], ['PUT', DEFAULT_CHOICES]] as const) {
      const refused = await call(method, settings, stranger, payload);
      expect([refused.statusCode, refused.json<{ errorCode: string }>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
      expect((await call(method, settings, null, payload)).statusCode).toBe(401);
    }

    // Whoever does not own the shop is told only that, even of a body its rules would refuse.
    const invalid = await save({ pix: false, card: false, maxInstallments: 1, offline: false }, stranger);
    expect([invalid.statusCode, invalid.json<{ errorCode: string }>().errorCode]).toEqual([403, 'STORE_FORBIDDEN']);
    expect(await read()).toMatchObject(CHOICES);
  });

  it('answers 404 for a shop that does not exist', async () => {
    expect((await call('GET', '/api/stores/nenhuma/integrations/asaas/settings', owner)).statusCode).toBe(404);
    expect((await call('PUT', '/api/stores/nenhuma/integrations/asaas/settings', owner, CHOICES)).statusCode).toBe(404);
  });

  /** The choices are the shop's, in a row of their own: the connection comes and goes around them. */
  it('keeps the choices across connecting, replacing the key and disconnecting', async () => {
    await save(CHOICES);

    expect((await call('POST', connection, owner, { apiKey: KEY })).json<AsaasConnection>().status).toBe('CONNECTED');
    expect(await read()).toMatchObject(CHOICES);

    expect((await call('POST', connection, owner, { apiKey: OTHER_KEY })).statusCode).toBe(200);
    expect(await read()).toMatchObject(CHOICES);

    expect((await call('DELETE', connection, owner)).statusCode).toBe(204);
    expect((await call('GET', connection, owner)).json<AsaasConnection>().status).toBe('DISCONNECTED');
    expect(await read()).toMatchObject(CHOICES);

    // And saved while connected, they outlive the connection the same way.
    await call('POST', connection, owner, { apiKey: KEY });
    await save({ ...CHOICES, maxInstallments: 3 });
    await call('DELETE', connection, owner);
    expect(await read()).toMatchObject({ ...CHOICES, maxInstallments: 3 });
  });

  it('holds the bounds where a write that skipped the API would land', async () => {
    const { id: storeId } = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } });

    await expect(prisma.asaasSettings.create({ data: { storeId, maxInstallments: 13 } })).rejects.toThrow(/asaas_settings_installments_check/);
    await expect(prisma.asaasSettings.create({ data: { storeId, pix: false, card: false, offline: false } })).rejects.toThrow(/asaas_settings_one_way_check/);
  });
});
