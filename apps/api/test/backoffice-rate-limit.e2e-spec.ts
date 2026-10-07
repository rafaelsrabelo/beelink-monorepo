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
import { signInStep, verifyStep } from './support/backoffice.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

describe("rate limiting the backoffice's door", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app.get(PrismaService));
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits how often an address may try a password', async () => {
    const attempt = () => signInStep(app, 'quem-quer-que-seja@exemplo.test', 'senha-errada-mesmo');

    const allowed = [await attempt(), await attempt(), await attempt()];
    const blocked = await attempt();

    expect(allowed.map((response) => response.statusCode)).toEqual([401, 401, 401]);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>()).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
    expect(blocked.headers['retry-after']).toBeDefined();
  });

  it('limits how often an address may try a code, on a count of its own', async () => {
    const attempt = () => verifyStep(app, 'um-token-qualquer', '123456');

    const allowed = [await attempt(), await attempt(), await attempt()];
    const blocked = await attempt();

    expect(allowed.map((response) => response.statusCode)).toEqual([401, 401, 401]);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>().errorCode).toBe('RATE_LIMITED');
  });

  it('records nothing for an attempt the limit stopped', async () => {
    // Three passwords and three codes went through; the two blocked ones never reached a handler.
    expect(await app.get(PrismaService).backofficeAuditLog.count({ where: { action: 'BACKOFFICE_SIGN_IN_FAILED' } })).toBe(6);
  });
});
