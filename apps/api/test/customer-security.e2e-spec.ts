// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shopper's own access to their account", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let email: string;
  let here: AuthSession;

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
    const owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    here = await signIn(PASSWORD);
    await clearInbox();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function signIn(password: string): Promise<AuthSession> {
    const response = await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password });
    if (response.statusCode !== 200) throw new Error(`login answered ${response.statusCode}: ${response.payload}`);
    return response.json<AuthSession>();
  }

  const me = (session: AuthSession) => call('GET', '/api/stores/lessari/customer/me', session);
  const change = (payload: object, session = here) => call('PUT', '/api/stores/lessari/customer/me/password', session, payload);

  it('changes the password given the current one; the other devices sign in again, this one stays', async () => {
    const elsewhere = await signIn(PASSWORD);
    expect((await me(here)).json<CustomerProfile>().hasPassword).toBe(true);

    expect((await change({ currentPassword: PASSWORD, newPassword: 'uma-senha-nova-comprida' })).statusCode).toBe(204);

    expect((await me(here)).statusCode).toBe(200);
    // This device's session stays whole: its refresh token still renews it.
    expect((await call('POST', '/api/stores/lessari/customer/refresh', undefined, { refreshToken: here.refreshToken })).statusCode).toBe(200);
    expect((await me(elsewhere)).statusCode).toBe(401);
    expect((await call('POST', '/api/stores/lessari/customer/refresh', undefined, { refreshToken: elsewhere.refreshToken })).statusCode).toBe(401);
    expect((await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).statusCode).toBe(401);
    await expect(signIn('uma-senha-nova-comprida')).resolves.toMatchObject({ accessToken: expect.any(String) });
  });

  it('refuses a wrong current password — never as a 401 — or a new one out of bounds, changing nothing', async () => {
    const wrong = await change({ currentPassword: 'nao-e-essa', newPassword: 'uma-senha-nova-comprida' });
    expect(wrong.statusCode).toBe(403);
    expect(wrong.json()).toMatchObject({ errorCode: 'AUTH_PASSWORD_WRONG' });

    for (const payload of [
      { currentPassword: PASSWORD, newPassword: 'curta' },
      { currentPassword: PASSWORD, newPassword: 'x'.repeat(129) },
      { currentPassword: PASSWORD },
      { currentPassword: PASSWORD, newPassword: 'uma-senha-nova-comprida', email: 'outra@exemplo.com' },
    ]) {
      expect((await change(payload)).statusCode, JSON.stringify(payload).slice(0, 80)).toBe(400);
    }
    expect((await me(here)).statusCode).toBe(200);
    await expect(signIn(PASSWORD)).resolves.toBeDefined();
  });

  it("gives an account with no password — Google's — the link that sets one, at the shop, back where the shopper was", async () => {
    const account = await prisma.user.findFirstOrThrow({ where: { email, storeId: { not: null } } });
    await prisma.user.update({ where: { id: account.id }, data: { passwordHash: null } });
    expect((await me(here)).json<CustomerProfile>().hasPassword).toBe(false);

    const refused = await change({ currentPassword: PASSWORD, newPassword: 'uma-senha-nova-comprida' });
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ errorCode: 'AUTH_PASSWORD_NOT_SET' });

    expect((await call('POST', '/api/stores/lessari/customer/me/password/link', here, { returnTo: '/lessari/conta/perfil' })).statusCode).toBe(202);
    const message = await waitForMessage(email);
    expect(message.Subject).toBe('lessari — crie uma nova senha');
    expect(message.Text).toContain('&voltar=%2Flessari%2Fconta%2Fperfil');

    const set = await call('POST', '/api/auth/reset-password', undefined, { token: tokenFromLink(message.Text, '/lessari/nova-senha'), password: 'a-primeira-senha-dela' });
    expect(set.statusCode).toBe(204);
    await expect(signIn('a-primeira-senha-dela')).resolves.toBeDefined();
  });

  it('signs out of every device, this one too', async () => {
    const elsewhere = await signIn(PASSWORD);

    expect((await call('DELETE', '/api/stores/lessari/customer/me/sessions', here)).statusCode).toBe(204);

    expect((await me(here)).statusCode).toBe(401);
    expect((await me(elsewhere)).statusCode).toBe(401);
    // The password is untouched: signing in again works.
    await expect(signIn(PASSWORD)).resolves.toBeDefined();
  });

  it("is the signed-in shopper's alone, at their own shop", async () => {
    const owner = await signUpAndSignIn(app, newEmail('outra-dona'));
    await call('POST', '/api/stores', owner, shopBody('outra'));

    for (const [method, path, payload] of [
      ['PUT', 'me/password', { currentPassword: PASSWORD, newPassword: 'uma-senha-nova-comprida' }],
      ['POST', 'me/password/link', {}],
      ['DELETE', 'me/sessions', undefined],
    ] as const) {
      expect((await call(method, `/api/stores/lessari/customer/${path}`, undefined, payload)).statusCode, path).toBe(401);
      // A session opened at one shop is a stranger at another: nothing there moves for it.
      expect((await call(method, `/api/stores/outra/customer/${path}`, here, payload)).statusCode, `outra ${path}`).toBe(401);
    }
    expect((await me(here)).statusCode).toBe(200);
    await expect(signIn(PASSWORD)).resolves.toBeDefined();
  });
});
