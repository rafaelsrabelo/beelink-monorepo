// Node
import { randomUUID } from 'node:crypto';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, GoogleAuthorization, GoogleSignIn } from '@harness-monorepo/contracts';

// App
import { codeChallengeOf, GoogleOAuthClient, type GoogleClaims } from '../src/modules/customers/google/google-oauth.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/**
 * Google, as far as this flow can tell: it holds each code to the PKCE challenge of the flow it was
 * granted in, and gives the person back only to the verifier whose hash is that challenge.
 */
class FakeGoogle {
  private lastChallenge = '';
  private readonly grants = new Map<string, { challenge: string; claims: GoogleClaims }>();

  authorizationUrl(_config: unknown, { state, codeChallenge }: { state: string; codeChallenge: string }): string {
    this.lastChallenge = codeChallenge;
    return `https://accounts.google.test/auth?state=${state}`;
  }

  /** The person consenting on Google's page: a code for the flow that was started last. */
  grant(claims: Partial<GoogleClaims> & Pick<GoogleClaims, 'email'>): string {
    const code = randomUUID();
    this.grants.set(code, { challenge: this.lastChallenge, claims: { sub: randomUUID(), emailVerified: true, authoritative: true, name: 'Bia Google', ...claims } });
    return code;
  }

  async exchange(_config: unknown, code: string, codeVerifier: string): Promise<GoogleClaims | null> {
    const grant = this.grants.get(code);
    this.grants.delete(code);
    return grant && codeChallengeOf(codeVerifier) === grant.challenge ? grant.claims : null;
  }
}

const shop = (slug: string) => ({ name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } });

describe("a shopper's Google door into a shop", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  const google = new FakeGoogle();

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(GoogleOAuthClient).useValue(google));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    const owner = await signUpAndSignIn(app, newEmail('dona'));
    for (const slug of ['lessari', 'outra']) {
      await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: shop(slug) });
    }
  });

  async function start(returnTo?: string, slug = 'lessari'): Promise<GoogleAuthorization> {
    const response = await app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/google/authorize`, payload: returnTo ? { returnTo } : {} });
    expect(response.statusCode).toBe(200);
    return response.json<GoogleAuthorization>();
  }

  function finish(code: string, state: string) {
    return app.inject({ method: 'POST', url: '/api/customer/google/callback', payload: { code, state } });
  }

  it('offers Google when it is set up', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/customer/sign-in-options' })).json()).toEqual({ google: true });
  });

  it("opens a verified account with no password on a first sign-in, and the shop's record of it", async () => {
    const email = newEmail('google');
    const { state } = await start('/lessari/carrinho');
    const response = await finish(google.grant({ email, name: 'Bia Google' }), state);

    expect(response.statusCode).toBe(200);
    const signedIn = response.json<GoogleSignIn>();
    expect(signedIn).toMatchObject({ storeSlug: 'lessari', returnTo: '/lessari/carrinho' });
    expect(signedIn.session.accessToken).toBeTruthy();

    const user = await prisma.user.findFirstOrThrow({ where: { email }, include: { store: true, identities: true, customers: true } });
    expect(user.store?.slug).toBe('lessari');
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.identities).toHaveLength(1);
    expect(user.customers).toHaveLength(1);
    // The shopper's own page answers to the session Google opened.
    const me = await app.inject({ method: 'GET', url: '/api/stores/lessari/customer/me', headers: { authorization: `Bearer ${signedIn.session.accessToken}` } });
    expect(me.json()).toMatchObject({ name: 'Bia Google', email });
  });

  it('lands a verified account with a password on the same account, which keeps its password', async () => {
    const email = newEmail('senha');
    await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/register', payload: { name: 'Bia Senha', email, password: PASSWORD } });
    await verifyEmailOf(app, email);
    const before = await prisma.user.findFirstOrThrow({ where: { email } });

    const { state } = await start();
    const response = await finish(google.grant({ email }), state);

    expect(response.statusCode).toBe(200);
    expect(await prisma.user.count({ where: { email } })).toBe(1);
    expect((await prisma.accountIdentity.findFirstOrThrow()).userId).toBe(before.id);
    expect((await prisma.customer.findMany({ where: { userId: before.id } })).length).toBe(1);
    const login = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/login', payload: { email, password: PASSWORD } });
    expect(login.statusCode).toBe(200);
  });

  // Anyone can sign up with someone else's e-mail; the password such an account carries is theirs.
  it('verifies an account whose e-mail was never confirmed, and drops the password nobody proved', async () => {
    const email = newEmail('pendente');
    await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/register', payload: { name: 'Quem Digitou', email, password: PASSWORD } });

    const { state } = await start();
    expect((await finish(google.grant({ email }), state)).statusCode).toBe(200);

    const user = await prisma.user.findFirstOrThrow({ where: { email } });
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).toBeNull();
    const login = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/login', payload: { email, password: PASSWORD } });
    expect(login.json()).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' });
  });

  it('ties one Google account to one account, whatever e-mail it later reports', async () => {
    const sub = randomUUID();
    const first = await start();
    await finish(google.grant({ sub, email: newEmail('antes') }), first.state);
    const second = await start();
    await finish(google.grant({ sub, email: newEmail('depois') }), second.state);

    expect(await prisma.user.count({ where: { identities: { some: {} } } })).toBe(1);
  });

  it("opens each shop's own account: one Google account at two shops is two accounts, never the panel's", async () => {
    const sub = randomUUID();
    const email = newEmail('duas-lojas');
    await signUpAndSignIn(app, email);

    for (const slug of ['lessari', 'outra']) {
      const { state } = await start(undefined, slug);
      expect((await finish(google.grant({ sub, email }), state)).statusCode).toBe(200);
    }

    const accounts = await prisma.user.findMany({ where: { email }, include: { store: true, identities: true } });
    expect(accounts.map((account) => account.store?.slug ?? 'bee-link').sort()).toEqual(['bee-link', 'lessari', 'outra']);
    // bee-link's account — the panel's — was never tied to Google, and keeps its password.
    const panel = accounts.find((account) => account.storeId === null);
    expect(panel?.identities).toHaveLength(0);
    expect(panel?.passwordHash).not.toBeNull();
  });

  // `email_verified` on an address Google does not own says only that it was checked once, when the
  // Google account was made: enough to open a new account, never to take someone's existing one.
  it('opens a new account on an address Google does not own, and never an existing one', async () => {
    const verified = newEmail('verificada');
    await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/register', payload: { name: 'Dona da Conta', email: verified, password: PASSWORD } });
    await verifyEmailOf(app, verified);
    const pending = newEmail('pendente');
    await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/register', payload: { name: 'Quem Digitou', email: pending, password: PASSWORD } });

    for (const email of [verified, pending]) {
      const { state } = await start();
      const response = await finish(google.grant({ email, authoritative: false }), state);
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ errorCode: 'GOOGLE_EMAIL_UNVERIFIED' });
      expect((await prisma.user.findFirstOrThrow({ where: { email } })).passwordHash).not.toBeNull();
    }
    expect(await prisma.accountIdentity.count()).toBe(0);

    const { state } = await start();
    expect((await finish(google.grant({ email: newEmail('nova'), authoritative: false }), state)).statusCode).toBe(200);
  });

  it('refuses a state it never gave, or gave and saw used, and opens no account', async () => {
    const email = newEmail('estado');
    const unknown = await finish(google.grant({ email }), 'um-state-que-ninguem-deu-aqui');
    expect(unknown.statusCode).toBe(400);
    expect(unknown.json()).toMatchObject({ errorCode: 'GOOGLE_STATE_INVALID' });

    const { state } = await start();
    expect((await finish(google.grant({ email: newEmail('uma-vez') }), state)).statusCode).toBe(200);
    const replay = await finish(google.grant({ email }), state);
    expect(replay.json()).toMatchObject({ errorCode: 'GOOGLE_STATE_INVALID' });
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });

  it('refuses a code granted to another flow — the PKCE verifier does not match — and opens no account', async () => {
    const email = newEmail('pkce');
    const first = await start();
    const second = await start();
    // Granted under the second flow's challenge, finished with the first flow's state and verifier.
    const code = google.grant({ email });

    const response = await finish(code, first.state);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ errorCode: 'GOOGLE_EXCHANGE_FAILED' });
    expect(await prisma.user.count({ where: { email } })).toBe(0);
    expect(second.state).not.toBe(first.state);
  });

  it('refuses an e-mail Google does not vouch for, for everyone alike', async () => {
    const taken = newEmail('existe');
    await signUpAndSignIn(app, taken);

    for (const email of [taken, newEmail('nova')]) {
      const { state } = await start();
      const response = await finish(google.grant({ email, emailVerified: false }), state);
      expect(response.statusCode).toBe(403);
      expect(response.json()).toMatchObject({ errorCode: 'GOOGLE_EMAIL_UNVERIFIED' });
    }
    expect(await prisma.accountIdentity.count()).toBe(0);
  });

  it('keeps a return address only inside the shop the flow began at', async () => {
    const { state } = await start('https://evil.example/lessari');
    const response = await finish(google.grant({ email: newEmail('volta') }), state);

    expect(response.json<GoogleSignIn>().returnTo).toBeNull();
  });

  it('keeps the session Google opened, renewing it like any other', async () => {
    const { state } = await start();
    const signedIn = (await finish(google.grant({ email: newEmail('renova') }), state)).json<GoogleSignIn>();

    const refreshed = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/refresh', payload: { refreshToken: signedIn.session.refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json<AuthSession>().refreshToken).not.toBe(signedIn.session.refreshToken);
  });
});
