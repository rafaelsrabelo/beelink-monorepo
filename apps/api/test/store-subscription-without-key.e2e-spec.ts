// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession } from '@harness-monorepo/contracts';

// App
import { BillingRoutine } from '../src/modules/billing/billing-routine.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PlatformWebhookKeeper } from '../src/modules/billing/platform-webhook-keeper.js';
import { SubscriptionSync } from '../src/modules/billing/subscription-sync.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported. A blank
// key here loses to one written in the developer's own `apps/api/.env`, as in the billing account's
// suite of the same kind.
const TOKEN = vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
  process.env.ASAAS_PLATFORM_API_KEY = '';
  // The webhook's token is right, so what turns its events away is the missing key (BEELINK-221).
  const token = 'nX0bq3l8V7mYkU2sA9cR4tE6wZ1pH5jD0fG8iK3oL2M=';
  process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = token;
  return token;
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');

/** Whatever this suite does, nothing of it may reach Asaas: the real client is bound here, not a fake. */
const toAsaas: string[] = [];

describe("a deployment that charges and has no key of bee-link's own Asaas account (BEELINK-292)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    const reach = globalThis.fetch;
    vi.stubGlobal('fetch', (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = input instanceof Request ? input.url : String(input);
      if (!/asaas\.com/i.test(url)) return reach(input, init);
      toAsaas.push(url);
      return Promise.reject(new Error('This suite must not reach Asaas'));
    });

    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, { name: 'Padaria da Lia', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllGlobals();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  it('has a client that says it is not configured', () => {
    expect(app.get(PlatformAsaas).configured).toBe(false);
  });

  it.each(['MONTHLY', 'SEMIANNUAL', 'ANNUAL'])('answers the choice of %s with the stable error that says billing is unavailable, writes nothing and asks Asaas nothing', async (cycle) => {
    const before = await prisma.storeSubscription.findFirstOrThrow();

    const response = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle });

    expect(response.statusCode).toBe(503);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 503, errorCode: 'BILLING_UNAVAILABLE' });
    expect(await prisma.storeSubscription.findFirstOrThrow()).toEqual(before);
    expect(toAsaas).toEqual([]);
  });

  it('still refuses a body with no cycle as a body, before it says anything of the key', async () => {
    const response = await call('PUT', '/api/stores/padaria/subscription', owner, {});

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('BILLING_CYCLE_INVALID');
    expect(toAsaas).toEqual([]);
  });

  it('answers a coupon with the stable error that says billing is unavailable, spends nothing and asks Asaas nothing (BEELINK-224)', async () => {
    await prisma.platformCoupon.create({ data: { code: 'TESTE-SEM-CHAVE' } });
    const before = await prisma.storeSubscription.findFirstOrThrow();

    const response = await call('POST', '/api/stores/padaria/subscription/coupon', owner, { code: 'TESTE-SEM-CHAVE' });

    expect(response.statusCode).toBe(503);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 503, errorCode: 'BILLING_UNAVAILABLE' });
    expect(await prisma.storeSubscription.findFirstOrThrow()).toEqual(before);
    expect(await prisma.platformCoupon.findUniqueOrThrow({ where: { code: 'TESTE-SEM-CHAVE' } })).toMatchObject({ redemptionCount: 0 });
    expect(toAsaas).toEqual([]);
  });

  it('leaves the page read as it was', async () => {
    const read = await call('GET', '/api/stores/padaria/subscription', owner);

    expect(read.statusCode).toBe(200);
    expect(read.json()).toMatchObject({ billingEnforced: true, subscription: { status: 'TRIALING', invoiceUrl: null } });
    expect(toAsaas).toEqual([]);
  });

  describe("and learning of a page's payment (BEELINK-221)", () => {
    beforeAll(async () => {
      // A page whose subscription was made while the deployment had a key.
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: 'sub_made_with_a_key', nextCheckAt: new Date(Date.now() - 1_000) } });
    });

    afterAll(async () => {
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: null, nextCheckAt: null } });
    });

    it('answers an event that carries the token, and writes nothing and asks nothing', async () => {
      const row = await prisma.storeSubscription.findFirstOrThrow();

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/asaas/webhook',
        headers: { 'content-type': 'application/json', 'asaas-access-token': TOKEN },
        payload: { id: 'evt_1', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', subscription: 'sub_made_with_a_key', externalReference: `beelink-subscription-${row.id}` } },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ result: 'IGNORED' });
      expect(await prisma.billingEvent.count()).toBe(0);
      expect(toAsaas).toEqual([]);
    });

    it("answers the panel's check as the read does, asking nothing", async () => {
      const checked = await call('POST', '/api/stores/padaria/subscription/check', owner);

      expect(checked.statusCode).toBe(200);
      expect(checked.json()).toEqual((await call('GET', '/api/stores/padaria/subscription', owner)).json());
      expect(toAsaas).toEqual([]);
    });

    it('runs no routine, and registers no webhook', async () => {
      await app.get(BillingRoutine).pass(new Date(Date.now() + 86_400_000));

      expect(await app.get(SubscriptionSync).checkDue(new Date(Date.now() + 86_400_000))).toBe(0);
      expect(await app.get(PlatformWebhookKeeper).keep()).toBe('SKIPPED');
      expect(toAsaas).toEqual([]);
    });
  });
});
