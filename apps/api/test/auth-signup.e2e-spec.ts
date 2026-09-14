// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, User } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, register, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

describe('signing up', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    await clearInbox();
  });

  it('creates an unverified account and e-mails a link that verifies it', async () => {
    const email = newEmail('novo');

    const user = await register(app, email);
    expect(user).toMatchObject({ email, name: 'Ana Souza', emailVerified: false });

    const message = await waitForMessage(email);
    expect(message.Subject).toBe('Confirme seu e-mail');
    expect(message.Text).toContain('http://localhost:3000/verify-email?token=');

    await verifyEmailOf(app, email);

    const signedIn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: PASSWORD },
    });
    expect(signedIn.statusCode).toBe(200);
    expect(signedIn.json<{ user: User }>().user.emailVerified).toBe(true);
  });

  it('refuses a second account on the same e-mail, whatever its casing', async () => {
    const email = newEmail('duplicado');
    await register(app, email);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Outra Pessoa', email: email.toUpperCase(), password: PASSWORD },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'AUTH_EMAIL_TAKEN' });
  });

  it('keeps an unverified account out, naming the reason', async () => {
    const email = newEmail('sem-verificar');
    await register(app, email);

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: PASSWORD },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json<ApiErrorBody>().errorCode).toBe('AUTH_EMAIL_NOT_VERIFIED');
  });

  it('spends a verification token once, and says nothing about why a link failed', async () => {
    const email = newEmail('token-gasto');
    await register(app, email);
    const token = tokenFromLink((await waitForMessage(email)).Text, '/verify-email');

    const first = await app.inject({ method: 'POST', url: '/api/auth/verify-email', payload: { token } });
    const second = await app.inject({ method: 'POST', url: '/api/auth/verify-email', payload: { token } });
    const madeUp = await app.inject({ method: 'POST', url: '/api/auth/verify-email', payload: { token: 'nada' } });

    expect(first.statusCode).toBe(204);
    expect(second.statusCode).toBe(400);
    expect(second.json<ApiErrorBody>().errorCode).toBe('AUTH_TOKEN_INVALID');
    expect(madeUp.json<ApiErrorBody>()).toEqual(second.json<ApiErrorBody>());
  });

  it('answers resend-verification the same way for an address with and without an account', async () => {
    const registered = newEmail('reenvio');
    await register(app, registered);
    await clearInbox();

    const known = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      payload: { email: registered },
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/auth/resend-verification',
      payload: { email: newEmail('inexistente') },
    });

    expect(known.statusCode).toBe(202);
    expect(unknown.statusCode).toBe(202);
    expect(known.payload).toBe(unknown.payload);

    // Only the real account gets a second link.
    await expect(waitForMessage(registered, 5_000)).resolves.toMatchObject({ Subject: 'Confirme seu e-mail' });
  });

  it('refuses a password shorter than the product allows', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { name: 'Ana Souza', email: newEmail('senha-curta'), password: 'curta' },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().message).toContain('password');
  });
});
