// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, User } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, login, newEmail, register, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

describe('living with a session', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const me = (accessToken?: string) =>
    app.inject({
      method: 'GET',
      url: '/api/users/me',
      headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
    });

  const refresh = (refreshToken: string) =>
    app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken } });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
  });

  it('answers /users/me only to a valid bearer token', async () => {
    const session = await signUpAndSignIn(app, newEmail('me'));

    const withToken = await me(session.accessToken);
    const without = await me();
    const garbage = await me('nao-e-um-jwt');

    expect(withToken.statusCode).toBe(200);
    expect(withToken.json<User>()).toEqual(session.user);
    expect(without.statusCode).toBe(401);
    expect(without.json<ApiErrorBody>().errorCode).toBe('AUTH_UNAUTHENTICATED');
    expect(garbage.statusCode).toBe(401);
  });

  it('reads a wrong password and an unknown e-mail the same way', async () => {
    const email = newEmail('credenciais');
    await register(app, email);
    await verifyEmailOf(app, email);

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'outra-senha-qualquer' },
    });
    const unknownEmail = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: newEmail('ninguem'), password: PASSWORD },
    });

    expect(wrongPassword.statusCode).toBe(401);
    expect(wrongPassword.json<ApiErrorBody>()).toEqual(unknownEmail.json<ApiErrorBody>());
    expect(wrongPassword.json<ApiErrorBody>().errorCode).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rotates the refresh token, and the new access token works', async () => {
    const session = await signUpAndSignIn(app, newEmail('rotacao'));

    const rotated = await refresh(session.refreshToken);
    expect(rotated.statusCode).toBe(200);

    const next = rotated.json<AuthSession>();
    expect(next.refreshToken).not.toBe(session.refreshToken);
    expect((await me(next.accessToken)).statusCode).toBe(200);
  });

  it('lets a second tab racing the same refresh token through', async () => {
    const session = await signUpAndSignIn(app, newEmail('corrida'));
    await refresh(session.refreshToken);

    // Still inside the grace window: the same browser, not a thief.
    const racing = await refresh(session.refreshToken);

    expect(racing.statusCode).toBe(200);
    expect((await prisma.session.findMany({ where: { revokedAt: { not: null } } })).length).toBe(0);
  });

  it('revokes the whole session when a spent token comes back later', async () => {
    const session = await signUpAndSignIn(app, newEmail('reuso'));
    const rotated = (await refresh(session.refreshToken)).json<AuthSession>();

    // Push the rotation out of the grace window without waiting for it.
    await prisma.refreshToken.updateMany({
      where: { usedAt: { not: null } },
      data: { usedAt: new Date(Date.now() - 60_000) },
    });

    const reused = await refresh(session.refreshToken);
    expect(reused.statusCode).toBe(401);
    expect(reused.json<ApiErrorBody>().errorCode).toBe('AUTH_REFRESH_REUSED');

    // The token the thief did not have is dead too.
    expect((await refresh(rotated.refreshToken)).statusCode).toBe(401);
  });

  it('ends the session on logout, twice over if asked', async () => {
    const session = await signUpAndSignIn(app, newEmail('logout'));

    const first = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken: session.refreshToken },
    });
    const again = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken: session.refreshToken },
    });
    const unknown = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      payload: { refreshToken: 'token-que-nunca-existiu' },
    });

    expect([first.statusCode, again.statusCode, unknown.statusCode]).toEqual([204, 204, 204]);
    expect((await refresh(session.refreshToken)).statusCode).toBe(401);
  });

  it('resets a forgotten password and signs every device out', async () => {
    const email = newEmail('reset');
    const session = await signUpAndSignIn(app, email);
    await clearInbox();

    const asked = await app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email } });
    expect(asked.statusCode).toBe(202);

    const message = await waitForMessage(email);
    expect(message.Subject).toBe('Redefinir sua senha');
    const token = tokenFromLink(message.Text, '/reset-password');

    const reset = await app.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token, password: 'senha-nova-bem-comprida' },
    });
    expect(reset.statusCode).toBe(204);

    // The old session is gone and the old password no longer opens one.
    expect((await refresh(session.refreshToken)).statusCode).toBe(401);
    const oldPassword = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: PASSWORD },
    });
    expect(oldPassword.statusCode).toBe(401);

    await expect(login(app, email, 'senha-nova-bem-comprida')).resolves.toMatchObject({
      user: { email },
    });
  });

  it('answers forgot-password the same for an address with no account', async () => {
    const known = await app.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: newEmail('existe-nao') },
    });

    expect(known.statusCode).toBe(202);
  });
});
