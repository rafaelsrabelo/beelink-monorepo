// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, User } from '@harness-monorepo/contracts';

// App
import { LEGAL_VERSION } from '../src/modules/auth/auth.constants.js';
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

  it('records the terms the account accepted, and their version, with the account (BEELINK-171)', async () => {
    const email = newEmail('termos');
    await register(app, email);

    const prisma = app.get(PrismaService);
    const account = await prisma.user.findFirstOrThrow({ where: { email, storeId: null }, include: { legalAcceptances: true } });
    expect(account.legalAcceptances).toEqual([expect.objectContaining({ version: LEGAL_VERSION, via: 'SIGN_UP' })]);

    // A second sign-up of the address creates no account, and so records nothing.
    await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Outra', email, password: PASSWORD } });
    expect(await prisma.legalAcceptance.count({ where: { user: { email } } })).toBe(1);
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

  it('lets an account whose confirmation was lost in once it resets its password from the e-mail', async () => {
    const email = newEmail('confirmacao-perdida');
    await register(app, email);
    // The confirmation never reaches anyone: the inbox is cleared before it is read.
    await clearInbox();

    await app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email } });
    const token = tokenFromLink((await waitForMessage(email)).Text, '/reset-password');
    const reset = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token, password: 'senha-nova-bem-comprida' },
    });
    expect(reset.statusCode).toBe(204);

    const signedIn = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'senha-nova-bem-comprida' },
    });
    expect(signedIn.statusCode).toBe(200);
    expect(signedIn.json<{ user: User }>().user.emailVerified).toBe(true);

    // Whoever signed up may not have owned the address; the owner, proven by the reset, accepts now.
    const acceptances = await app.get(PrismaService).legalAcceptance.findMany({ where: { user: { email } }, orderBy: { id: 'asc' } });
    expect(acceptances.map((acceptance) => acceptance.via)).toEqual(['SIGN_UP', 'PASSWORD_RESET']);
  });

  /** BEELINK-171: an account from before the terms, or an imported one, meets them setting a password. */
  it('records the terms on the first reset of an account that never accepted them, and only once', async () => {
    const prisma = app.get(PrismaService);
    const email = newEmail('antes-dos-termos');
    await prisma.user.create({ data: { name: 'Lojista Antigo', email, emailVerifiedAt: new Date() } });

    const resetTo = async (password: string) => {
      await clearInbox();
      await app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email } });
      const token = tokenFromLink((await waitForMessage(email)).Text, '/reset-password');
      expect((await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token, password } })).statusCode).toBe(204);
    };

    await resetTo('senha-nova-bem-comprida');
    expect(await prisma.legalAcceptance.findMany({ where: { user: { email } } })).toEqual([
      expect.objectContaining({ version: LEGAL_VERSION, via: 'PASSWORD_RESET' }),
    ]);

    // The version in force is already accepted: another reset records nothing more.
    await resetTo('outra-senha-bem-comprida');
    expect(await prisma.legalAcceptance.count({ where: { user: { email } } })).toBe(1);
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
