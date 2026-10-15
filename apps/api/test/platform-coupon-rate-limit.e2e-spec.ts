// The limit is read when the controller module loads, so it has to be lowered before any import.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
  process.env.AUTH_RATE_LIMIT_MAX = '3';
  process.env.AUTH_RATE_LIMIT_WINDOW = '1 minute';
});

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { resetDatabase } from './support/reset-database.js';

/** Guessing a coupon's code is guessing a password: the route is held to the sign-in's pair, in a bucket of its own (BEELINK-224). */
describe("rate limiting the coupon of bee-link's", () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(new FakePlatformAsaas()));
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    const opened = await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { name: 'Padaria da Lia', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } } });
    if (opened.statusCode !== 201) throw new Error(`POST /stores answered ${opened.statusCode}: ${opened.payload}`);
  });

  afterAll(async () => {
    await app.close();
  });

  const guess = (code: string) => app.inject({ method: 'POST', url: '/api/stores/padaria/subscription/coupon', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: { code } });

  it('answers 429 once an address guessed as many codes as it may sign in, and spends nothing', async () => {
    const allowed = [await guess('TESTE-PALPITE-1'), await guess('TESTE-PALPITE-2'), await guess('TESTE-PALPITE-3')];
    const blocked = await guess('TESTE-PALPITE-4');

    expect(allowed.map((response) => response.json<ApiErrorBody>().errorCode)).toEqual(['BILLING_COUPON_NOT_FOUND', 'BILLING_COUPON_NOT_FOUND', 'BILLING_COUPON_NOT_FOUND']);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>()).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it("leaves the page's other subscription routes to their own limit", async () => {
    const response = await app.inject({ method: 'GET', url: '/api/stores/padaria/subscription', headers: { authorization: `Bearer ${owner.accessToken}` } });

    expect(response.statusCode).toBe(200);
  });
});
