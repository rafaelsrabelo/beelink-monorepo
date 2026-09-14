// The limit is read when the controller module loads, so it has to be lowered before any import.
vi.hoisted(() => {
  process.env.AUTH_RATE_LIMIT_MAX = '3';
  process.env.AUTH_RATE_LIMIT_WINDOW = '1 minute';
});

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

describe('rate limiting the auth routes', () => {
  let app: NestFastifyApplication;

  const attemptLogin = () =>
    app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'quem-quer-que-seja@exemplo.test', password: 'senha-errada-mesmo' },
    });

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 429 in the same error envelope as everything else', async () => {
    const allowed = [await attemptLogin(), await attemptLogin(), await attemptLogin()];
    const blocked = await attemptLogin();

    expect(allowed.map((response) => response.statusCode)).toEqual([401, 401, 401]);
    expect(blocked.statusCode).toBe(429);

    const body = blocked.json<ApiErrorBody>();
    expect(body).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
    expect(body.message).toMatch(/Too many requests/);
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('leaves the routes that carry a token alone', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/users/me' });

    // Still 401 rather than 429: the limit is on the unauthenticated auth routes only.
    expect(response.statusCode).toBe(401);
    expect(response.json<ApiErrorBody>().errorCode).toBe('AUTH_UNAUTHENTICATED');
  });
});
