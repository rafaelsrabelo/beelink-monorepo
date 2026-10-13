// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PlanCatalog, Store, StoreSubscriptionAnswer, User } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported. A blank
// here loses to a key written in the developer's own `apps/api/.env`, which is why that file's
// example leaves it commented out: with one there, this suite is not about a deployment without it.
vi.hoisted(() => {
  process.env.ASAAS_PLATFORM_API_KEY = '';
  // Low enough to be reached here: the limit on the write is this route's own counter.
  process.env.STORE_WRITE_RATE_LIMIT_MAX = '4';
  process.env.STORE_WRITE_RATE_LIMIT_WINDOW = '1 minute';
});

const PATH = '/api/billing/account';
const person = { name: 'Zuleica Tavares', document: '529.982.247-25' };

/** Whatever this suite does, nothing of it may reach Asaas: the real client is bound here, not a fake. */
const toAsaas: string[] = [];

describe("a deployment with no key of bee-link's own Asaas account (BEELINK-291)", () => {
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
    owner = await signUpAndSignIn(app, newEmail('dona'));
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

  it('answers the billing account\'s read with a stable error that says billing is unavailable', async () => {
    const response = await call('GET', PATH, owner);

    expect(response.statusCode).toBe(503);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 503, errorCode: 'BILLING_UNAVAILABLE' });
  });

  it('answers its write the same way, keeps nothing, and asks Asaas nothing', async () => {
    const response = await call('PUT', PATH, owner, person);

    expect(response.statusCode).toBe(503);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 503, errorCode: 'BILLING_UNAVAILABLE' });
    expect(await prisma.billingAccount.count()).toBe(0);
    expect(toAsaas).toEqual([]);
  });

  it('still closes both to a caller with no session', async () => {
    expect((await call('GET', PATH)).statusCode).toBe(401);
    expect((await call('PUT', PATH, undefined, person)).statusCode).toBe(401);
  });

  it('leaves every other route answering as it did: the plans, the account, a new page and its subscription', async () => {
    expect((await call('GET', '/api/health')).statusCode).toBe(200);

    const plans = await call('GET', '/api/billing/plans');
    expect(plans.statusCode).toBe(200);
    expect(plans.json<PlanCatalog>()).toMatchObject({ trialDays: 7 });

    const me = await call('GET', '/api/users/me', owner);
    expect(me.statusCode).toBe(200);
    expect(me.json<User>().id).toBe(owner.user.id);

    const opened = await call('POST', '/api/stores', owner, { name: 'padaria', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    expect(opened.statusCode).toBe(201);
    expect(opened.json<Store>().slug).toBe('padaria');

    const subscription = await call('GET', '/api/stores/padaria/subscription', owner);
    expect(subscription.statusCode).toBe(200);
    expect(subscription.json<StoreSubscriptionAnswer>()).toMatchObject({ billingEnforced: false, subscription: { status: 'TRIALING', trialDaysLeft: 7 } });

    expect(toAsaas).toEqual([]);
  });

  /** Last: it spends the write's limit for this address. Two writes were made above. */
  it('limits the write by address, as the shop\'s writes are', async () => {
    const codes: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) codes.push((await call('PUT', PATH, owner, person)).statusCode);

    expect(codes).toEqual([503, 503, 429, 429]);
    // The read is not a write: it goes on answering.
    expect((await call('GET', PATH, owner)).statusCode).toBe(503);
  });
});
