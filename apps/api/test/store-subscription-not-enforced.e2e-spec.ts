// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { BillingRoutine } from '../src/modules/billing/billing-routine.js';
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PlatformWebhookKeeper } from '../src/modules/billing/platform-webhook-keeper.js';
import { SubscriptionSync } from '../src/modules/billing/subscription-sync.service.js';
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported. Said
// and not left to the default, so a developer's own `apps/api/.env` cannot switch it on here.
const TOKEN = vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'false';
  // The webhook's token is right, so what turns its events away is the switch (BEELINK-221).
  const token = 'nX0bq3l8V7mYkU2sA9cR4tE6wZ1pH5jD0fG8iK3oL2M=';
  process.env.ASAAS_PLATFORM_WEBHOOK_TOKEN = token;
  return token;
});

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');

/**
 * Everything a purchase needs is in place here — the key (a fake Asaas that answers), the plans, the
 * account's billing data, a page in trial — so the one thing that refuses it is the switch.
 */
describe('a deployment with BILLING_ENFORCED off: where nothing is charged, nothing is bought (BEELINK-292)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  const asaas = new FakePlatformAsaas();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(asaas));
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, { name: 'Padaria da Lia', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    await call('PUT', '/api/billing/account', owner, { name: 'Zuleica Tavares', document: '529.982.247-25' });
  });

  afterAll(async () => {
    await app.close();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  it.each(['MONTHLY', 'SEMIANNUAL', 'ANNUAL'])('refuses the choice of %s with a stable code, asks Asaas nothing and writes nothing', async (cycle) => {
    expect(env.BILLING_ENFORCED).toBe(false);
    expect(asaas.standing).toHaveLength(1);
    const before = await prisma.storeSubscription.findFirstOrThrow();
    asaas.calls.length = 0;

    const response = await call('PUT', '/api/stores/padaria/subscription', owner, { cycle });

    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'BILLING_NOT_ENFORCED' });
    expect(asaas.calls).toEqual([]);
    expect(asaas.subscriptionsHeld).toHaveLength(0);
    expect(await prisma.storeSubscription.findFirstOrThrow()).toEqual(before);
  });

  it("still says first that the page is someone else's, or that there is no session", async () => {
    const stranger = await signUpAndSignIn(app, newEmail('estranha'));
    asaas.calls.length = 0;

    expect((await call('PUT', '/api/stores/padaria/subscription', stranger, { cycle: 'MONTHLY' })).json<ApiErrorBody>().errorCode).toBe('STORE_FORBIDDEN');
    expect((await call('PUT', '/api/stores/padaria/subscription', undefined, { cycle: 'MONTHLY' })).statusCode).toBe(401);
    expect(asaas.calls).toEqual([]);
  });

  it('refuses a coupon with the same stable code, spends nothing, writes nothing and asks Asaas nothing (BEELINK-224)', async () => {
    await prisma.platformCoupon.create({ data: { code: 'TESTE-DESLIGADA' } });
    const before = await prisma.storeSubscription.findFirstOrThrow();
    asaas.calls.length = 0;

    const response = await call('POST', '/api/stores/padaria/subscription/coupon', owner, { code: 'TESTE-DESLIGADA' });

    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'BILLING_NOT_ENFORCED' });
    expect(asaas.calls).toEqual([]);
    expect(await prisma.storeSubscription.findFirstOrThrow()).toEqual(before);
    expect(await prisma.platformCoupon.findUniqueOrThrow({ where: { code: 'TESTE-DESLIGADA' } })).toMatchObject({ redemptionCount: 0 });
  });

  it("leaves the page's subscription reading as it did: in trial, with nothing chosen and no invoice", async () => {
    const answer = (await call('GET', '/api/stores/padaria/subscription', owner)).json<StoreSubscriptionAnswer>();

    expect(answer).toMatchObject({ billingEnforced: false, subscription: { status: 'TRIALING', plan: null, cycle: null, priceCents: null, invoiceUrl: null } });
  });

  describe("and learning of a page's payment (BEELINK-221)", () => {
    /** A page whose subscription stands at Asaas, paid there — as one chosen before the switch was turned off would. */
    async function paidAtAsaas() {
      const row = await prisma.storeSubscription.findFirstOrThrow();
      const customerId = asaas.standing[0]!.id;
      const made = asaas.plantSubscription({ customerId, valueCents: 5990, cycle: 'MONTHLY', firstDueDay: new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10), description: 'Plano Beelink mensal', externalReference: `beelink-subscription-${row.id}` });
      asaas.pay(made.id);
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: made.id, nextCheckAt: new Date(Date.now() - 1_000) } });
      asaas.calls.length = 0;
      return { row: await prisma.storeSubscription.findFirstOrThrow(), made };
    }

    afterAll(async () => {
      await prisma.storeSubscription.updateMany({ data: { asaasSubscriptionId: null, nextCheckAt: null } });
    });

    it('answers an event that carries the token, and writes nothing and asks nothing', async () => {
      const { row, made } = await paidAtAsaas();

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/asaas/webhook',
        headers: { 'content-type': 'application/json', 'asaas-access-token': TOKEN },
        payload: { id: 'evt_1', event: 'PAYMENT_CONFIRMED', payment: { id: 'pay_1', subscription: made.id, externalReference: `beelink-subscription-${row.id}` } },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ result: 'IGNORED' });
      expect(await prisma.billingEvent.count()).toBe(0);
      expect(asaas.calls).toEqual([]);
      expect(await prisma.storeSubscription.findFirstOrThrow()).toEqual(row);
    });

    it("answers the panel's check as the read does, asking nothing", async () => {
      const { row } = await paidAtAsaas();

      const checked = await call('POST', '/api/stores/padaria/subscription/check', owner);

      expect(checked.statusCode).toBe(200);
      expect(checked.json()).toEqual((await call('GET', '/api/stores/padaria/subscription', owner)).json());
      expect(checked.json<StoreSubscriptionAnswer>().subscription!.status).toBe('TRIALING');
      expect(asaas.calls).toEqual([]);
      expect(await prisma.storeSubscription.findFirstOrThrow()).toEqual(row);
    });

    it('runs no routine: a page whose turn came is not read, and no webhook is registered', async () => {
      await paidAtAsaas();

      await app.get(BillingRoutine).pass(new Date(Date.now() + 86_400_000));

      expect(await app.get(SubscriptionSync).checkDue(new Date(Date.now() + 86_400_000))).toBe(0);
      expect(await app.get(PlatformWebhookKeeper).keep()).toBe('SKIPPED');
      expect(asaas.calls).toEqual([]);
      expect((await prisma.storeSubscription.findFirstOrThrow()).status).toBe('TRIALING');
    });
  });
});
