// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported. Said
// and not left to the default, so a developer's own `apps/api/.env` cannot switch it on here.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'false';
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

  it("leaves the page's subscription reading as it did: in trial, with nothing chosen and no invoice", async () => {
    const answer = (await call('GET', '/api/stores/padaria/subscription', owner)).json<StoreSubscriptionAnswer>();

    expect(answer).toMatchObject({ billingEnforced: false, subscription: { status: 'TRIALING', plan: null, cycle: null, priceCents: null, invoiceUrl: null } });
  });
});
