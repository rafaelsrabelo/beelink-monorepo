// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, BackofficeAuditPage } from '@harness-monorepo/contracts';

// App
import { AuditService } from '../src/modules/backoffice/audit/audit.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, login } from './support/auth-flow.js';
import { callWith, newAccount, signInStep, signedInAdmin } from './support/backoffice.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** A name no answer of the backoffice may carry, however deep: somebody's password, session or secret. */
const NEVER_ANSWERED = /pass(word)?|hash|secret|sealed|token|sessions|cookie/i;

function keysOf(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysOf);
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) => [key, ...keysOf(inner)]);
}

describe('the audit record', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const read = (token: string | undefined, query = '') => callWith(app, 'GET', `/api/backoffice/audit${query}`, token);

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

  it('is read by administrators only', async () => {
    const admin = await signedInAdmin(app);
    const panel = await login(app, admin.email);
    const shopkeeper = await login(app, (await newAccount(app, 'lojista')).email);

    expect((await read(undefined)).statusCode).toBe(401);
    expect((await read(panel.accessToken)).statusCode).toBe(401);
    expect((await read(shopkeeper.accessToken)).statusCode).toBe(401);
    expect((await read(admin.session.accessToken)).statusCode).toBe(200);
  });

  it('answers each line whole: who, what, on what, when and from where — newest first', async () => {
    const admin = await signedInAdmin(app);

    const page = (await read(admin.session.accessToken)).json<BackofficeAuditPage>();

    expect(page).toMatchObject({ total: 3, page: 1, pageSize: 50 });
    expect(page.entries.map((entry) => entry.action)).toEqual(['BACKOFFICE_SIGNED_IN', 'BACKOFFICE_SIGN_IN_CODE_SENT', 'ADMIN_GRANTED']);
    expect(page.entries[0]).toEqual({
      id: expect.any(String),
      actor: { kind: 'ADMIN', userId: admin.id, label: admin.email },
      action: 'BACKOFFICE_SIGNED_IN',
      target: { type: 'USER', id: admin.id, label: admin.email },
      details: {},
      ip: '127.0.0.1',
      userAgent: 'e2e-browser',
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(page.entries[2]).toMatchObject({ actor: { kind: 'COMMAND', userId: null, label: null }, ip: null, userAgent: null });
  });

  it('is paged, echoing the bounds it used', async () => {
    const admin = await signedInAdmin(app);
    const audit = app.get(AuditService);
    for (let index = 0; index < 7; index += 1) {
      await audit.record({ actor: { kind: 'ADMIN', userId: admin.id, label: admin.email }, action: 'ADMIN_GRANTED', details: { index } });
    }
    const token = admin.session.accessToken;

    const first = (await read(token, '?pageSize=4')).json<BackofficeAuditPage>();
    const second = (await read(token, '?pageSize=4&page=2')).json<BackofficeAuditPage>();
    const third = (await read(token, '?pageSize=4&page=3')).json<BackofficeAuditPage>();
    const beyond = (await read(token, '?pageSize=4&page=9')).json<BackofficeAuditPage>();

    expect([first.total, first.page, first.pageSize, first.entries.length]).toEqual([10, 1, 4, 4]);
    expect([second.page, second.entries.length, third.entries.length, beyond.entries.length]).toEqual([2, 4, 2, 0]);
    expect(first.entries.map((entry) => entry.details.index)).toEqual([6, 5, 4, 3]);
    const ids = [...first.entries, ...second.entries, ...third.entries].map((entry) => entry.id);
    expect(new Set(ids).size).toBe(10);
  });

  it('filters by actor, by action and by period', async () => {
    const admin = await signedInAdmin(app, 'primeira');
    const other = await signedInAdmin(app, 'segunda');
    await signInStep(app, admin.email, 'outra-senha-qualquer');
    const token = admin.session.accessToken;
    const actions = async (query: string) => (await read(token, query)).json<BackofficeAuditPage>().entries.map((entry) => entry.action);

    expect(await actions(`?actorId=${other.id}`)).toEqual(['BACKOFFICE_SIGNED_IN', 'BACKOFFICE_SIGN_IN_CODE_SENT']);
    expect(await actions('?actorKind=COMMAND')).toEqual(['ADMIN_GRANTED', 'ADMIN_GRANTED']);
    expect(await actions('?actorKind=ANONYMOUS')).toEqual(['BACKOFFICE_SIGN_IN_FAILED']);
    expect(await actions('?action=BACKOFFICE_SIGNED_IN')).toEqual(['BACKOFFICE_SIGNED_IN', 'BACKOFFICE_SIGNED_IN']);
    expect(await actions(`?action=BACKOFFICE_SIGNED_IN&actorId=${admin.id}`)).toEqual(['BACKOFFICE_SIGNED_IN']);

    const all = (await read(token)).json<BackofficeAuditPage>();
    const newest = all.entries[0]!.createdAt;
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString();
    // `from` is inclusive and `to` is not.
    expect((await read(token, `?from=${encodeURIComponent(newest)}`)).json<BackofficeAuditPage>().total).toBeGreaterThanOrEqual(1);
    expect((await read(token, `?to=${encodeURIComponent(newest)}`)).json<BackofficeAuditPage>().total).toBeLessThan(all.total);
    expect((await read(token, `?from=${encodeURIComponent(tomorrow)}`)).json<BackofficeAuditPage>().total).toBe(0);
    expect((await read(token, `?to=${encodeURIComponent(tomorrow)}`)).json<BackofficeAuditPage>().total).toBe(all.total);
  });

  it('refuses a filter it does not know', async () => {
    const { session } = await signedInAdmin(app);

    for (const query of ['?action=SOMETHING_ELSE', '?actorKind=ROBOT', '?actorId=abc', '?from=ontem', '?pageSize=101', '?pageSize=0', '?page=0', '?unknown=1']) {
      const response = await read(session.accessToken, query);
      expect([query, response.statusCode]).toEqual([query, 400]);
      expect(response.json<ApiErrorBody>().statusCode).toBe(400);
    }
  });

  it('cannot be changed or emptied: the database refuses, whoever asks', async () => {
    await signedInAdmin(app);
    const before = await prisma.backofficeAuditLog.findMany({ orderBy: { id: 'asc' } });

    await expect(prisma.backofficeAuditLog.updateMany({ data: { action: 'NOTHING_HAPPENED' } })).rejects.toThrow(/append-only/);
    await expect(prisma.backofficeAuditLog.deleteMany()).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRaw`UPDATE "backoffice_audit_log" SET "actorLabel" = 'ninguem'`).rejects.toThrow(/append-only/);
    await expect(prisma.$executeRaw`DELETE FROM "backoffice_audit_log"`).rejects.toThrow(/append-only/);

    expect(await prisma.backofficeAuditLog.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });

  it('outlives the account it names', async () => {
    const admin = await signedInAdmin(app, 'fica');
    const gone = await newAccount(app, 'some');
    await callWith(app, 'POST', '/api/backoffice/admins', admin.session.accessToken, { email: gone.email });
    await callWith(app, 'DELETE', `/api/backoffice/admins/${gone.id}`, admin.session.accessToken);

    await prisma.user.delete({ where: { id: gone.id } });

    const rows = await prisma.backofficeAuditLog.findMany({ where: { targetId: gone.id }, orderBy: { id: 'asc' } });
    expect(rows.map((row) => [row.action, row.targetLabel])).toEqual([['ADMIN_GRANTED', gone.email], ['ADMIN_REVOKED', gone.email]]);
  });

  it('refuses a line that would carry a secret, before it is written', async () => {
    const audit = app.get(AuditService);
    const before = await prisma.backofficeAuditLog.count();

    await expect(audit.record({ actor: { kind: 'COMMAND' }, action: 'ADMIN_GRANTED', details: { password: PASSWORD } })).rejects.toThrow(/never carries a secret/);
    await expect(audit.record({ actor: { kind: 'COMMAND' }, action: 'ADMIN_GRANTED', details: { refreshToken: 'abc' } })).rejects.toThrow(/never carries a secret/);

    expect(await prisma.backofficeAuditLog.count()).toBe(before);
  });

  it("answers nothing of anybody's password, session or secret, on any read", async () => {
    const admin = await signedInAdmin(app, 'primeira');
    const other = await newAccount(app, 'segunda');
    const token = admin.session.accessToken;
    const granted = await callWith(app, 'POST', '/api/backoffice/admins', token, { email: other.email });

    const answers = [granted, await callWith(app, 'GET', '/api/backoffice/admins', token), await callWith(app, 'GET', '/api/backoffice/me', token), await read(token)];

    for (const answer of answers) {
      expect(answer.statusCode).toBeLessThan(300);
      expect(keysOf(answer.json()).filter((key) => NEVER_ANSWERED.test(key))).toEqual([]);
    }
    const hashes = (await prisma.user.findMany({ select: { passwordHash: true } })).map((user) => user.passwordHash!);
    expect(hashes.length).toBeGreaterThan(0);
    for (const hash of hashes) expect(answers.map((answer) => answer.payload).join()).not.toContain(hash);
  });
});
