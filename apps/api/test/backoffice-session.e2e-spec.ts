// Nest
import { JwtService } from '@nestjs/jwt';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, BackofficeMe, BackofficeSession } from '@harness-monorepo/contracts';

// App
import { BACKOFFICE_SESSION_IDLE_MINUTES } from '../src/modules/backoffice/backoffice.constants.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, login, newEmail, verifyEmailOf } from './support/auth-flow.js';
import { callWith, signedInAdmin } from './support/backoffice.js';
import { tokenFromLink, waitForMessage } from './support/mailpit.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Every route behind the backoffice's guard. */
const GUARDED: [method: 'GET' | 'POST' | 'DELETE', url: string][] = [
  ['GET', '/api/backoffice/me'],
  ['GET', '/api/backoffice/admins'],
  ['POST', '/api/backoffice/admins'],
  ['DELETE', '/api/backoffice/admins/0199b0c0-0000-7000-8000-000000000000'],
  ['GET', '/api/backoffice/audit'],
  ['POST', '/api/backoffice/auth/sign-out'],
];

describe("the backoffice's session, and the doors beside it", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const me = (accessToken?: string) => callWith(app, 'GET', '/api/backoffice/me', accessToken);
  const refresh = (refreshToken: string) => app.inject({ method: 'POST', url: '/api/backoffice/auth/refresh', payload: { refreshToken } });

  async function expectRefusedEverywhere(accessToken?: string): Promise<void> {
    for (const [method, url] of GUARDED) {
      const response = await callWith(app, method, url, accessToken, method === 'POST' && url.endsWith('/admins') ? { email: 'x@exemplo.test' } : undefined);
      expect([method, url, response.statusCode]).toEqual([method, url, 401]);
      expect(response.json<ApiErrorBody>().errorCode).toBe('BACKOFFICE_UNAUTHENTICATED');
    }
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  it('is short: ten minutes a token, thirty idle, eight hours at most', async () => {
    const { session } = await signedInAdmin(app);
    const fromNow = (iso: string) => new Date(iso).getTime() - Date.now();

    expect(fromNow(session.accessTokenExpiresAt)).toBeGreaterThan(9 * MINUTE_MS);
    expect(fromNow(session.accessTokenExpiresAt)).toBeLessThanOrEqual(10 * MINUTE_MS);
    expect(fromNow(session.refreshTokenExpiresAt)).toBeGreaterThan(29 * MINUTE_MS);
    expect(fromNow(session.refreshTokenExpiresAt)).toBeLessThanOrEqual(30 * MINUTE_MS);
    expect(fromNow(session.sessionExpiresAt)).toBeGreaterThan(8 * HOUR_MS - MINUTE_MS);
    expect(fromNow(session.sessionExpiresAt)).toBeLessThanOrEqual(8 * HOUR_MS);

    const answer = (await me(session.accessToken)).json<BackofficeMe>();
    expect(answer.session.expiresAt).toBe(session.sessionExpiresAt);
    expect(answer.session.idleExpiresAt).toBe(session.refreshTokenExpiresAt);
    expect(await prisma.backofficeSession.findFirstOrThrow()).toMatchObject({ secondStep: 'EMAIL_CODE', ip: '127.0.0.1', userAgent: 'e2e-browser' });
  });

  it('closes every guarded route to a request with no token', async () => {
    await expectRefusedEverywhere();
    await expectRefusedEverywhere('nao-e-um-jwt');
  });

  it("refuses the panel's token — even an administrator's own", async () => {
    const admin = await signedInAdmin(app);
    const panel = await login(app, admin.email);

    await expectRefusedEverywhere(panel.accessToken);
    // The same person, the same moment: their backoffice token opens what their panel one does not.
    expect((await me(admin.session.accessToken)).statusCode).toBe(200);
  });

  it("refuses a shop customer's token", async () => {
    const owner = await signedInAdmin(app, 'dona');
    const panel = await login(app, owner.email);
    await callWith(app, 'POST', '/api/stores', panel.accessToken, { name: 'Loja', slug: 'loja-da-porta', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } });
    const email = newEmail('cliente');
    await callWith(app, 'POST', '/api/stores/loja-da-porta/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const shopper = (await callWith(app, 'POST', '/api/stores/loja-da-porta/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    expect((await callWith(app, 'GET', '/api/stores/loja-da-porta/customer/me', shopper.accessToken)).statusCode).toBe(200);

    await expectRefusedEverywhere(shopper.accessToken);

    // And the backoffice's token opens neither the shop's door nor the panel's.
    const backoffice = owner.session.accessToken;
    expect((await callWith(app, 'GET', '/api/stores/loja-da-porta/customer/me', backoffice)).statusCode).toBe(401);
    expect((await callWith(app, 'GET', '/api/stores/loja-da-porta', backoffice)).statusCode).toBe(401);
  });

  it('is refused by the panel: a backoffice token is no shopkeeper', async () => {
    const { session } = await signedInAdmin(app);

    for (const url of ['/api/users/me', '/api/stores/mine', '/api/store-categories']) {
      const response = await callWith(app, 'GET', url, session.accessToken);
      expect([url, response.statusCode]).toEqual([url, 401]);
      expect(response.json<ApiErrorBody>().errorCode).toBe('AUTH_UNAUTHENTICATED');
    }
  });

  it('keeps its refresh tokens to itself, as the panel keeps its own', async () => {
    const admin = await signedInAdmin(app);
    const panel = await login(app, admin.email);

    const atThePanel = await app.inject({ method: 'POST', url: '/api/auth/refresh', payload: { refreshToken: admin.session.refreshToken } });
    const atTheBackoffice = await refresh(panel.refreshToken);

    expect(atThePanel.statusCode).toBe(401);
    expect(atTheBackoffice.statusCode).toBe(401);
    expect(atTheBackoffice.json<ApiErrorBody>().errorCode).toBe('BACKOFFICE_SESSION_INVALID');
    // Neither attempt cost either session anything.
    expect((await me(admin.session.accessToken)).statusCode).toBe(200);
    expect((await callWith(app, 'GET', '/api/users/me', panel.accessToken)).statusCode).toBe(200);
  });

  it('is not ended by the panel signing out: the two sessions are two', async () => {
    const admin = await signedInAdmin(app);
    const panel = await login(app, admin.email);

    await app.inject({ method: 'POST', url: '/api/auth/logout', payload: { refreshToken: panel.refreshToken } });

    expect((await callWith(app, 'GET', '/api/users/me', panel.accessToken)).statusCode).toBe(401);
    expect((await me(admin.session.accessToken)).statusCode).toBe(200);
  });

  it('ends when the password is replaced: whoever knew the old one is out of every door', async () => {
    const admin = await signedInAdmin(app);
    await app.inject({ method: 'POST', url: '/api/auth/forgot-password', payload: { email: admin.email } });
    const token = tokenFromLink((await waitForMessage(admin.email, 10_000, 'Redefinir sua senha')).Text, '/reset-password');

    const reset = await app.inject({ method: 'POST', url: '/api/auth/reset-password', payload: { token, password: 'uma-senha-nova-e-comprida' } });

    expect(reset.statusCode).toBe(204);
    expect((await me(admin.session.accessToken)).statusCode).toBe(401);
    expect((await refresh(admin.session.refreshToken)).statusCode).toBe(401);
  });

  it('refuses a token signed with the right key that no sign-in gave out', async () => {
    const admin = await signedInAdmin(app);
    const jwt = app.get(JwtService);
    const row = await prisma.backofficeSession.findFirstOrThrow();

    const forged = [
      // This door's kind, and a session that does not exist.
      await jwt.signAsync({ sub: admin.id, sid: '0199b0c0-0000-7000-8000-000000000000', kind: 'backoffice', step: 'EMAIL_CODE' }),
      // A real session, and no second step named.
      await jwt.signAsync({ sub: admin.id, sid: row.id, kind: 'backoffice' }),
      // A real session, and a second step it never passed.
      await jwt.signAsync({ sub: admin.id, sid: row.id, kind: 'backoffice', step: 'TOTP' }),
      // A real session, in somebody else's name.
      await jwt.signAsync({ sub: '0199b0c0-0000-7000-8000-000000000001', sid: row.id, kind: 'backoffice', step: 'EMAIL_CODE' }),
      // A real session, with the panel's kind of token: none.
      await jwt.signAsync({ sub: admin.id, sid: row.id }),
    ];

    for (const token of forged) expect((await me(token)).statusCode).toBe(401);
    expect((await me(admin.session.accessToken)).statusCode).toBe(200);
  });

  it('rotates the refresh token, and the new access token works', async () => {
    const { session } = await signedInAdmin(app);

    const rotated = await refresh(session.refreshToken);

    expect(rotated.statusCode).toBe(200);
    const next = rotated.json<BackofficeSession>();
    expect(next.refreshToken).not.toBe(session.refreshToken);
    expect(next.sessionExpiresAt).toBe(session.sessionExpiresAt);
    expect((await me(next.accessToken)).statusCode).toBe(200);
  });

  it('lets a second tab racing the same refresh token through, and ends the session when a spent one comes back later', async () => {
    const { session } = await signedInAdmin(app);
    const rotated = (await refresh(session.refreshToken)).json<BackofficeSession>();
    expect((await refresh(session.refreshToken)).statusCode).toBe(200);

    await prisma.backofficeRefreshToken.updateMany({ where: { usedAt: { not: null } }, data: { usedAt: new Date(Date.now() - MINUTE_MS) } });
    const reused = await refresh(session.refreshToken);

    expect(reused.statusCode).toBe(401);
    expect(reused.json<ApiErrorBody>().errorCode).toBe('BACKOFFICE_REFRESH_REUSED');
    expect((await refresh(rotated.refreshToken)).statusCode).toBe(401);
    expect((await me(rotated.accessToken)).statusCode).toBe(401);
  });

  it('is over once left idle for thirty minutes, with a token still valid', async () => {
    const { session } = await signedInAdmin(app);
    await prisma.backofficeSession.updateMany({ data: { lastSeenAt: new Date(Date.now() - (BACKOFFICE_SESSION_IDLE_MINUTES - 2) * MINUTE_MS) } });
    expect((await me(session.accessToken)).statusCode).toBe(200);
    // Using it moved the clock: it was two minutes from over, and is thirty again.
    expect(Date.now() - (await prisma.backofficeSession.findFirstOrThrow()).lastSeenAt.getTime()).toBeLessThan(MINUTE_MS);

    await prisma.backofficeSession.updateMany({ data: { lastSeenAt: new Date(Date.now() - BACKOFFICE_SESSION_IDLE_MINUTES * MINUTE_MS) } });

    expect((await me(session.accessToken)).statusCode).toBe(401);
    expect((await refresh(session.refreshToken)).statusCode).toBe(401);
  });

  it('ends eight hours after it began, however much it was used, and nothing renews it', async () => {
    const { session } = await signedInAdmin(app);
    await prisma.backofficeSession.updateMany({ data: { expiresAt: new Date(Date.now() + 2 * MINUTE_MS) } });

    // Near its end, what is handed out ends with it.
    const last = (await refresh(session.refreshToken)).json<BackofficeSession>();
    expect(new Date(last.accessTokenExpiresAt).getTime() - Date.now()).toBeLessThanOrEqual(2 * MINUTE_MS);
    expect(last.refreshTokenExpiresAt).toBe(last.sessionExpiresAt);

    await prisma.backofficeSession.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await me(last.accessToken)).statusCode).toBe(401);
    expect((await refresh(last.refreshToken)).statusCode).toBe(401);
  });

  it('ends on sign-out, at once, and says so in the audit record', async () => {
    const admin = await signedInAdmin(app);

    const out = await callWith(app, 'POST', '/api/backoffice/auth/sign-out', admin.session.accessToken);

    expect(out.statusCode).toBe(204);
    expect((await me(admin.session.accessToken)).statusCode).toBe(401);
    expect((await refresh(admin.session.refreshToken)).statusCode).toBe(401);
    expect(await prisma.backofficeAuditLog.findMany({ where: { action: 'BACKOFFICE_SIGNED_OUT' } })).toEqual([
      expect.objectContaining({ actorKind: 'ADMIN', actorUserId: admin.id, actorLabel: admin.email, targetId: admin.id, ip: '127.0.0.1' }),
    ]);
  });

  it('stops answering on the very next request once the role is revoked', async () => {
    const staying = await signedInAdmin(app, 'fica');
    const leaving = await signedInAdmin(app, 'sai');
    expect((await me(leaving.session.accessToken)).statusCode).toBe(200);

    expect((await callWith(app, 'DELETE', `/api/backoffice/admins/${leaving.id}`, staying.session.accessToken)).statusCode).toBe(204);

    await expectRefusedEverywhere(leaving.session.accessToken);
    expect((await refresh(leaving.session.refreshToken)).statusCode).toBe(401);
  });

  it('asks the role on every request, not only the session: a role gone with the session left standing is refused', async () => {
    const staying = await signedInAdmin(app, 'fica');
    const leaving = await signedInAdmin(app, 'sai');
    // Only the role: the session row is left alive, as nothing in the code leaves it.
    await prisma.platformAdmin.update({ where: { userId: leaving.id }, data: { revokedAt: new Date(), revokedByUserId: staying.id } });

    expect((await me(leaving.session.accessToken)).statusCode).toBe(401);
    expect((await refresh(leaving.session.refreshToken)).statusCode).toBe(401);
    expect((await me(staying.session.accessToken)).statusCode).toBe(200);
  });
});
