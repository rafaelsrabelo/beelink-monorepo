// Node
import { createHash, randomBytes, randomUUID } from 'node:crypto';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, GoogleAuthorization, GoogleHandoffSession, GoogleSignIn } from '@harness-monorepo/contracts';

// App
import { LEGAL_VERSION } from '../src/modules/auth/auth.constants.js';
import { codeChallengeOf, GoogleOAuthClient, type GoogleClaims } from '../src/modules/customers/google/google-oauth.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { HANDOFF_TTL_MS } from '../src/modules/customers/google/customer-google.service.js';
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
    expect((await app.inject({ method: 'GET', url: '/api/customer/sign-in-options' })).json()).toEqual({ google: true, platformOrigin: 'http://localhost:3000' });
  });

  it("opens a verified account with no password on a first sign-in, and the shop's record of it", async () => {
    const email = newEmail('google');
    const { state } = await start('/lessari/carrinho');
    const response = await finish(google.grant({ email, name: 'Bia Google' }), state);

    expect(response.statusCode).toBe(200);
    const signedIn = response.json<GoogleSignIn>();
    expect(signedIn).toMatchObject({ storeSlug: 'lessari', returnTo: '/lessari/carrinho' });
    expect(signedIn.session?.accessToken).toBeTruthy();

    const user = await prisma.user.findFirstOrThrow({ where: { email }, include: { store: true, identities: true, customers: true, legalAcceptances: true } });
    expect(user.store?.slug).toBe('lessari');
    // No form: the button said continuing accepts the terms (BEELINK-171).
    expect(user.legalAcceptances).toEqual([expect.objectContaining({ version: LEGAL_VERSION, via: 'GOOGLE' })]);
    expect(user.emailVerifiedAt).not.toBeNull();
    expect(user.passwordHash).toBeNull();
    expect(user.identities).toHaveLength(1);
    expect(user.customers).toHaveLength(1);
    // The shopper's own page answers to the session Google opened.
    const me = await app.inject({ method: 'GET', url: '/api/stores/lessari/customer/me', headers: { authorization: `Bearer ${signedIn.session?.accessToken}` } });
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
    // It accepted at sign-up; tying Google to it records nothing more.
    expect((await prisma.legalAcceptance.findMany({ where: { userId: before.id } })).map((acceptance) => acceptance.via)).toEqual(['SIGN_UP']);
    const login = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/login', payload: { email, password: PASSWORD } });
    expect(login.statusCode).toBe(200);
  });

  /** BEELINK-171: the button says continuing accepts the terms, on the sign-in face as much as on the other. */
  it('records the terms for an account from before them, the first time Google lands on it, and only once', async () => {
    const email = newEmail('antes-dos-termos');
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } });
    await prisma.user.create({ data: { name: 'Bia Antiga', email, storeId: store.id, emailVerifiedAt: new Date() } });

    const first = await start();
    expect((await finish(google.grant({ email, sub: 'google-bia' }), first.state)).statusCode).toBe(200);
    // The tie now exists: the next sign-in goes through it, and finds the terms already taken.
    const again = await start();
    expect((await finish(google.grant({ email, sub: 'google-bia' }), again.state)).statusCode).toBe(200);

    expect(await prisma.legalAcceptance.findMany({ where: { user: { email } } })).toEqual([
      expect.objectContaining({ version: LEGAL_VERSION, via: 'GOOGLE' }),
    ]);
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
    // Whoever typed the e-mail accepted at sign-up; the owner Google just proved accepts now.
    const acceptances = await prisma.legalAcceptance.findMany({ where: { userId: user.id }, orderBy: { id: 'asc' } });
    expect(acceptances.map((acceptance) => acceptance.via)).toEqual(['SIGN_UP', 'GOOGLE']);
    const login = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/login', payload: { email, password: PASSWORD } });
    expect(login.json()).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' });
  });

  it('ties one Google account to one account, whatever e-mail it later reports', async () => {
    const sub = randomUUID();
    const before = newEmail('antes');
    const first = await start();
    const opened = await finish(google.grant({ sub, email: before }), first.state);
    const second = await start();
    const again = await finish(google.grant({ sub, email: newEmail('depois') }), second.state);

    expect([opened.statusCode, again.statusCode]).toEqual([200, 200]);
    // The second sign-in lands on the account the first one opened, e-mail and all.
    expect(again.json<GoogleSignIn>().session?.user).toMatchObject({ id: opened.json<GoogleSignIn>().session?.user.id, email: before });
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
    for (const returnTo of ['https://evil.example/lessari', '/lessari/../outra', '/lessari/%2e%2e/outra']) {
      const { state } = await start(returnTo);
      const response = await finish(google.grant({ email: newEmail('volta') }), state);
      expect(response.json<GoogleSignIn>().returnTo).toBeNull();
    }
  });

  it('keeps the session Google opened, renewing it like any other', async () => {
    const { state } = await start();
    const signedIn = (await finish(google.grant({ email: newEmail('renova') }), state)).json<GoogleSignIn>();

    const refreshed = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/refresh', payload: { refreshToken: signedIn.session?.refreshToken } });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json<AuthSession>().refreshToken).not.toBe(signedIn.session?.refreshToken);
  });

  /**
   * BEELINK-284: a flow begun at the shop's own domain. The callback is still the platform's, and
   * answers with a code that domain trades for the session — with the secret its browser kept.
   */
  describe("from the shop's own domain", () => {
    const secret = () => randomBytes(32).toString('base64url');
    const challengeOf = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');

    async function ownDomain(slug: string, host: string, status: 'ACTIVE' | 'PENDING' = 'ACTIVE') {
      await prisma.store.update({ where: { slug }, data: { customDomain: host, customDomainStatus: status } });
    }

    /** As far as the platform's callback: Google consented, and the API answered it. */
    async function arrive(verifier: string, email = newEmail('dominio'), slug = 'lessari') {
      const begun = await app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/google/authorize`, payload: { returnTo: `/${slug}/carrinho`, handoffChallenge: challengeOf(verifier) } });
      expect(begun.statusCode).toBe(200);
      const response = await finish(google.grant({ email }), begun.json<GoogleAuthorization>().state);
      expect(response.statusCode).toBe(200);
      return response.json<GoogleSignIn>();
    }

    function trade(code: string, verifier: string, slug = 'lessari') {
      return app.inject({ method: 'POST', url: `/api/stores/${slug}/customer/google/handoff`, payload: { code, verifier } });
    }

    it('ends at the callback with a code for the active domain and no session, and trades it there for one', async () => {
      await ownDomain('lessari', 'lessari.example');
      const verifier = secret();
      const email = newEmail('dominio');

      const signedIn = await arrive(verifier, email);
      expect(signedIn).toMatchObject({ session: null, storeSlug: 'lessari', returnTo: '/lessari/carrinho', handoff: { host: 'lessari.example' } });
      // No session exists until the trade: nothing to steal off the way.
      expect(await prisma.session.count({ where: { user: { email } } })).toBe(0);

      const traded = await trade(signedIn.handoff?.code ?? '', verifier);
      expect(traded.statusCode).toBe(200);
      const { session, returnTo } = traded.json<GoogleHandoffSession>();
      expect(returnTo).toBe('/lessari/carrinho');
      const me = await app.inject({ method: 'GET', url: '/api/stores/lessari/customer/me', headers: { authorization: `Bearer ${session.accessToken}` } });
      expect(me.json()).toMatchObject({ email });
      expect(await prisma.session.count({ where: { user: { email }, audience: 'CUSTOMER' } })).toBe(1);
    });

    it('keeps only the hash of the code, and nothing of a session', async () => {
      await ownDomain('lessari', 'lessari.example');
      const { handoff } = await arrive(secret());

      const [row] = await prisma.googleHandoff.findMany();
      expect(row?.codeHash).toBe(createHash('sha256').update(handoff?.code ?? '').digest('hex'));
      expect(JSON.stringify(row)).not.toContain(handoff?.code);
      expect(Object.keys(row ?? {}).sort()).toEqual(['challenge', 'codeHash', 'expiresAt', 'returnTo', 'storeId', 'userId']);
      expect((row?.expiresAt.getTime() ?? 0) - Date.now()).toBeLessThanOrEqual(HANDOFF_TTL_MS);
    });

    it('trades a code once', async () => {
      await ownDomain('lessari', 'lessari.example');
      const verifier = secret();
      const { handoff } = await arrive(verifier);

      expect((await trade(handoff?.code ?? '', verifier)).statusCode).toBe(200);
      const again = await trade(handoff?.code ?? '', verifier);
      expect(again.statusCode).toBe(400);
      expect(again.json()).toMatchObject({ errorCode: 'GOOGLE_STATE_INVALID' });
    });

    it('gives one session to two trades at once', async () => {
      await ownDomain('lessari', 'lessari.example');
      const verifier = secret();
      const email = newEmail('corrida');
      const { handoff } = await arrive(verifier, email);

      const both = await Promise.all([trade(handoff?.code ?? '', verifier), trade(handoff?.code ?? '', verifier)]);
      expect(both.map((response) => response.statusCode).sort()).toEqual([200, 400]);
      expect(await prisma.session.count({ where: { user: { email } } })).toBe(1);
    });

    it('refuses alike a code past its minute, one of another shop, one with another secret, and one nobody gave', async () => {
      await ownDomain('lessari', 'lessari.example');
      await ownDomain('outra', 'outra.example');
      const verifier = secret();
      const refusals: unknown[] = [];

      const late = await arrive(verifier);
      await prisma.googleHandoff.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      refusals.push((await trade(late.handoff?.code ?? '', verifier)).json());

      const elsewhere = await arrive(verifier);
      refusals.push((await trade(elsewhere.handoff?.code ?? '', verifier, 'outra')).json());
      // Asked for at the wrong shop, it is spent all the same.
      refusals.push((await trade(elsewhere.handoff?.code ?? '', verifier)).json());

      const stolen = await arrive(verifier);
      refusals.push((await trade(stolen.handoff?.code ?? '', secret())).json());
      refusals.push((await trade(stolen.handoff?.code ?? '', verifier)).json());

      refusals.push((await trade(secret(), verifier)).json());

      expect(refusals).toHaveLength(6);
      for (const refusal of refusals) expect(refusal).toEqual(refusals[0]);
      expect(refusals[0]).toMatchObject({ statusCode: 400, errorCode: 'GOOGLE_STATE_INVALID' });
      expect(await prisma.session.count({ where: { audience: 'CUSTOMER' } })).toBe(0);
    });

    it('refuses a code or a secret that is not shaped like one, before looking for it', async () => {
      const response = await trade('curto', secret());
      expect(response.statusCode).toBe(400);
      const challenge = await app.inject({ method: 'POST', url: '/api/stores/lessari/customer/google/authorize', payload: { handoffChallenge: 'https://evil.example' } });
      expect(challenge.statusCode).toBe(400);
    });

    it('ends on the platform, with a session, when the shop has no active domain by the time Google answers', async () => {
      const verifier = secret();
      const none = await arrive(verifier);
      expect(none.handoff).toBeNull();
      expect(none.session?.accessToken).toBeTruthy();

      await ownDomain('lessari', 'lessari.example', 'PENDING');
      const pending = await arrive(verifier);
      expect(pending.handoff).toBeNull();
      expect(pending.session?.accessToken).toBeTruthy();
    });

    it('ends on the platform for a flow begun there, active domain or not', async () => {
      await ownDomain('lessari', 'lessari.example');
      const { state } = await start('/lessari/carrinho');

      const signedIn = (await finish(google.grant({ email: newEmail('plataforma') }), state)).json<GoogleSignIn>();
      expect(signedIn.handoff).toBeNull();
      expect(signedIn.session?.accessToken).toBeTruthy();
      expect(await prisma.googleHandoff.count()).toBe(0);
    });

    it('sweeps the codes nobody traded when the next one is made', async () => {
      await ownDomain('lessari', 'lessari.example');
      await arrive(secret());
      await prisma.googleHandoff.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      await arrive(secret());
      expect(await prisma.googleHandoff.count()).toBe(1);
    });
  });
});
