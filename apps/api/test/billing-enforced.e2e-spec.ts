// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, Store, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { env } from '../src/shared/config/env.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once, when it is first imported.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
});

const DAY = 24 * 3_600_000;

/** The switch is read and told, and as far as BEELINK-219 goes that is all it does: the lock is BEELINK-223's. */
describe('a deployment with BILLING_ENFORCED on (BEELINK-219)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
  });

  afterAll(async () => {
    await app.close();
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  it('says so where the page’s subscription is read, and the page is born in trial as anywhere', async () => {
    expect(env.BILLING_ENFORCED).toBe(true);

    const created = await call('POST', '/api/stores', owner, { name: 'padaria', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    const answer = (await call('GET', '/api/stores/padaria/subscription', owner)).json<StoreSubscriptionAnswer>();

    expect(created.statusCode).toBe(201);
    expect(answer.billingEnforced).toBe(true);
    expect(answer.subscription).toMatchObject({ status: 'TRIALING', trialDaysLeft: 7 });
  });

  it('locks nothing yet: a page whose trial ended is still read, served and edited', async () => {
    await prisma.storeSubscription.updateMany({ data: { trialStartedAt: new Date(Date.now() - 9 * DAY), trialEndsAt: new Date(Date.now() - DAY) } });

    const subscription = (await call('GET', '/api/stores/padaria/subscription', owner)).json<StoreSubscriptionAnswer>();
    const panel = await call('GET', '/api/stores/padaria', owner);
    const window = await call('GET', '/api/stores/padaria/public');
    const product = await call('POST', '/api/stores/padaria/products', owner, { name: 'Pão', priceCents: 500 });

    expect(subscription).toMatchObject({ billingEnforced: true, subscription: { status: 'TRIAL_EXPIRED', trialDaysLeft: 0 } });
    expect([panel.statusCode, panel.json<Store>().slug]).toEqual([200, 'padaria']);
    expect(window.statusCode).toBe(200);
    expect(product.statusCode).toBe(201);
  });
});
