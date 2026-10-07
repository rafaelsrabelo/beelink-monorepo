// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, BackofficeMe, BackofficeSession, BackofficeSignInChallenge } from '@harness-monorepo/contracts';

// App
import { PlatformAdminsService } from '../src/modules/backoffice/admins/platform-admins.service.js';
import { AuditService } from '../src/modules/backoffice/audit/audit.service.js';
import { BACKOFFICE_CODE_MAX_ATTEMPTS, BACKOFFICE_CODE_MAX_PER_WINDOW } from '../src/modules/backoffice/backoffice.constants.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, register } from './support/auth-flow.js';
import { CODE_SUBJECT, callWith, codeSentTo, newAccount, newAdmin, signInStep, verifyStep } from './support/backoffice.js';
import { createTestApp } from './support/create-test-app.js';
import { waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const MINUTE_MS = 60_000;

/** A code that is surely not the one sent. */
const another = (code: string) => (code === '000000' ? '000001' : '000000');

describe('signing in to the backoffice, in two steps', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const auditOf = (action: string) => prisma.backofficeAuditLog.findMany({ where: { action }, orderBy: { id: 'asc' } });

  async function challengeFor(email: string): Promise<{ challengeToken: string; code: string }> {
    const response = await signInStep(app, email);
    expect(response.statusCode).toBe(200);
    return { challengeToken: response.json<BackofficeSignInChallenge>().challengeToken, code: await codeSentTo(email) };
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

  it('asks the password, e-mails a code, and opens a session of its own with the two', async () => {
    const admin = await newAdmin(app);

    const first = await signInStep(app, admin.email);
    expect(first.statusCode).toBe(200);
    const challenge = first.json<BackofficeSignInChallenge>();
    expect(Object.keys(challenge).sort()).toEqual(['challengeToken', 'expiresAt']);
    expect(new Date(challenge.expiresAt).getTime() - Date.now()).toBeGreaterThan(9 * MINUTE_MS);
    expect(new Date(challenge.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(10 * MINUTE_MS);

    const message = await waitForMessage(admin.email, 10_000, CODE_SUBJECT);
    const code = await codeSentTo(admin.email);
    // A lock screen shows the subject, and the mailer logs it: the code is in the body alone.
    expect(message.Subject).toBe(CODE_SUBJECT);
    expect(message.Subject).not.toContain(code);
    expect(message.Text).toContain('10 minutos');

    const second = await verifyStep(app, challenge.challengeToken, code);
    expect(second.statusCode).toBe(200);
    const session = second.json<BackofficeSession>();
    expect(session.admin).toEqual({ id: admin.id, name: 'Ana Souza', email: admin.email });

    const me = await callWith(app, 'GET', '/api/backoffice/me', session.accessToken);
    expect(me.statusCode).toBe(200);
    expect(me.json<BackofficeMe>().admin).toEqual(session.admin);
  });

  it('keeps neither the code nor the challenge token, only what proves them', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);

    const [row] = await prisma.backofficeSignInChallenge.findMany();
    expect(row!.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain(code);
    expect(JSON.stringify(row)).not.toContain(challengeToken);
  });

  it('answers a wrong password, an unknown e-mail, an unverified account and a shopkeeper who is no administrator the same way', async () => {
    const admin = await newAdmin(app);
    const shopkeeper = await newAccount(app, 'lojista');
    const unverified = newEmail('sem-verificar');
    await register(app, unverified);

    const answers = [
      await signInStep(app, admin.email, 'outra-senha-qualquer'),
      await signInStep(app, newEmail('ninguem')),
      await signInStep(app, unverified),
      // The right password of a real, verified account — which is not an administrator's.
      await signInStep(app, shopkeeper.email),
    ];

    for (const answer of answers) {
      expect(answer.statusCode).toBe(401);
      expect(answer.json<ApiErrorBody>()).toEqual(answers[0]!.json<ApiErrorBody>());
      expect(Object.keys(answer.headers).sort()).toEqual(Object.keys(answers[0]!.headers).sort());
    }
    expect(answers[0]!.json<ApiErrorBody>()).toEqual({ statusCode: 401, errorCode: 'BACKOFFICE_INVALID_CREDENTIALS', message: 'Invalid e-mail or password' });
    // No code was made for any of them, so none was sent.
    expect(await prisma.backofficeSignInChallenge.count()).toBe(0);
  });

  it('records each refused password without the e-mail typed, naming the account only when it is an administrator\'s', async () => {
    const admin = await newAdmin(app);
    const shopkeeper = await newAccount(app, 'lojista');
    const stranger = newEmail('ninguem');

    await signInStep(app, admin.email, 'outra-senha-qualquer');
    await signInStep(app, shopkeeper.email);
    await signInStep(app, stranger);

    const failures = await auditOf('BACKOFFICE_SIGN_IN_FAILED');
    expect(failures).toHaveLength(3);
    for (const failure of failures) expect(failure).toMatchObject({ actorKind: 'ANONYMOUS', actorUserId: null, actorLabel: null, details: { step: 'PASSWORD' }, ip: '127.0.0.1' });
    expect(failures.map((failure) => failure.targetId)).toEqual([admin.id, null, null]);
    expect(JSON.stringify(failures)).not.toContain(shopkeeper.email);
    expect(JSON.stringify(failures)).not.toContain(stranger);
  });

  it('records the code sent and the sign-in, with who, from where and nothing secret', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);
    const session = (await verifyStep(app, challengeToken, code)).json<BackofficeSession>();

    const rows = await prisma.backofficeAuditLog.findMany({ where: { action: { startsWith: 'BACKOFFICE_' } }, orderBy: { id: 'asc' } });
    expect(rows.map((row) => row.action)).toEqual(['BACKOFFICE_SIGN_IN_CODE_SENT', 'BACKOFFICE_SIGNED_IN']);
    for (const row of rows) {
      expect(row).toMatchObject({ actorKind: 'ADMIN', actorUserId: admin.id, actorLabel: admin.email, targetType: 'USER', targetId: admin.id, ip: '127.0.0.1' });
      expect(row.createdAt.getTime()).toBeGreaterThan(Date.now() - MINUTE_MS);
    }
    expect(rows[1]!.userAgent).toBe('e2e-browser');

    const everything = JSON.stringify(await prisma.backofficeAuditLog.findMany());
    for (const secret of [code, challengeToken, session.accessToken, session.refreshToken, PASSWORD]) expect(everything).not.toContain(secret);
  });

  it('refuses a wrong code, and still takes the right one after it', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);

    const wrong = await verifyStep(app, challengeToken, another(code));
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json<ApiErrorBody>()).toEqual({ statusCode: 401, errorCode: 'BACKOFFICE_CODE_INVALID', message: 'Invalid or expired code' });
    expect(await auditOf('BACKOFFICE_SIGN_IN_FAILED')).toEqual([expect.objectContaining({ actorKind: 'ANONYMOUS', targetId: admin.id, details: { step: 'CODE' } })]);

    expect((await verifyStep(app, challengeToken, code)).statusCode).toBe(200);
  });

  it('gives a code a few attempts, and then not even the right one opens it', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);

    for (let attempt = 0; attempt < BACKOFFICE_CODE_MAX_ATTEMPTS; attempt += 1) {
      expect((await verifyStep(app, challengeToken, another(code))).statusCode).toBe(401);
    }

    const late = await verifyStep(app, challengeToken, code);
    expect(late.statusCode).toBe(401);
    expect(late.json<ApiErrorBody>().errorCode).toBe('BACKOFFICE_CODE_INVALID');
    expect(await prisma.backofficeSession.count()).toBe(0);
  });

  it('refuses a code past its ten minutes, in the words of a wrong one', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);
    const wrong = await verifyStep(app, challengeToken, another(code));
    await prisma.backofficeSignInChallenge.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

    const expired = await verifyStep(app, challengeToken, code);

    expect(expired.statusCode).toBe(401);
    expect(expired.json<ApiErrorBody>()).toEqual(wrong.json<ApiErrorBody>());
  });

  it('takes a code once', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);
    expect((await verifyStep(app, challengeToken, code)).statusCode).toBe(200);

    const again = await verifyStep(app, challengeToken, code);

    expect(again.statusCode).toBe(401);
    expect(again.json<ApiErrorBody>().errorCode).toBe('BACKOFFICE_CODE_INVALID');
    expect(await prisma.backofficeSession.count()).toBe(1);
  });

  it('opens one session when the same code arrives twice at once', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);

    const both = await Promise.all([verifyStep(app, challengeToken, code), verifyStep(app, challengeToken, code)]);

    expect(both.map((answer) => answer.statusCode).sort()).toEqual([200, 401]);
    expect(await prisma.backofficeSession.count()).toBe(1);
  });

  it('makes an older code useless when a new one is asked', async () => {
    const admin = await newAdmin(app);
    const old = await challengeFor(admin.email);
    const fresh = (await signInStep(app, admin.email)).json<BackofficeSignInChallenge>();
    const freshCode = await codeSentTo(admin.email, old.code);

    expect((await verifyStep(app, old.challengeToken, old.code)).statusCode).toBe(401);
    // A code belongs to its own challenge: the new one does not open the old, nor the reverse.
    expect((await verifyStep(app, old.challengeToken, freshCode)).statusCode).toBe(401);
    expect((await verifyStep(app, fresh.challengeToken, freshCode)).statusCode).toBe(200);
  });

  it('refuses a challenge token step one never answered, in the words of a wrong code', async () => {
    const admin = await newAdmin(app);
    const { challengeToken, code } = await challengeFor(admin.email);
    const wrong = await verifyStep(app, challengeToken, another(code));

    const forged = await verifyStep(app, 'um-token-que-ninguem-recebeu', code);

    expect(forged.statusCode).toBe(401);
    expect(forged.json<ApiErrorBody>()).toEqual(wrong.json<ApiErrorBody>());
  });

  it('refuses a code that is not six digits before looking at anything', async () => {
    const admin = await newAdmin(app);
    const { challengeToken } = await challengeFor(admin.email);

    for (const code of ['12345', '1234567', 'abcdef', '12 456']) {
      expect((await verifyStep(app, challengeToken, code)).statusCode).toBe(400);
    }
    expect((await prisma.backofficeSignInChallenge.findFirstOrThrow()).attempts).toBe(0);
  });

  it('refuses the code of somebody whose role was revoked between the two steps', async () => {
    const admin = await newAdmin(app, 'fica');
    const leaving = await newAdmin(app, 'sai');
    const { challengeToken, code } = await challengeFor(leaving.email);
    // What revoking does to a pending sign-in is its own: here only the role goes.
    await prisma.platformAdmin.update({ where: { userId: leaving.id }, data: { revokedAt: new Date(), revokedByUserId: admin.id } });

    expect((await verifyStep(app, challengeToken, code)).statusCode).toBe(401);
    expect(await prisma.backofficeSession.count()).toBe(0);
  });

  it('sends one account only so many codes in a quarter of an hour', async () => {
    const admin = await newAdmin(app);
    for (let sent = 0; sent < BACKOFFICE_CODE_MAX_PER_WINDOW; sent += 1) {
      expect((await signInStep(app, admin.email)).statusCode).toBe(200);
    }

    const blocked = await signInStep(app, admin.email);

    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>().errorCode).toBe('RATE_LIMITED');
    expect(await prisma.backofficeSignInChallenge.count()).toBe(BACKOFFICE_CODE_MAX_PER_WINDOW);
    expect((await auditOf('BACKOFFICE_SIGN_IN_FAILED')).at(-1)).toMatchObject({ targetId: admin.id, details: { step: 'PASSWORD', reason: 'TOO_MANY_REQUESTS' } });

    // The window is the quarter of an hour behind now: once the codes are older, another goes.
    await prisma.backofficeSignInChallenge.updateMany({ data: { createdAt: new Date(Date.now() - 16 * MINUTE_MS) } });
    expect((await signInStep(app, admin.email)).statusCode).toBe(200);
  });

  it('lets an administrator made by another sign in, and not one made by nobody', async () => {
    const first = await newAdmin(app, 'primeira');
    const second = await newAccount(app, 'segunda');
    expect((await signInStep(app, second.email)).statusCode).toBe(401);

    await app.get(PlatformAdminsService).grant(second.email, first.id, app.get(AuditService).commandTrail());

    expect((await signInStep(app, second.email)).statusCode).toBe(200);
  });
});
