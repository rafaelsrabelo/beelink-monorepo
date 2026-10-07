// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, BackofficeAdmin } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, register } from './support/auth-flow.js';
import { backofficeSignIn, callWith, newAccount, signInStep, signedInAdmin } from './support/backoffice.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

describe('who administers the platform', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const list = (token: string) => callWith(app, 'GET', '/api/backoffice/admins', token);
  const grant = (token: string, email: string) => callWith(app, 'POST', '/api/backoffice/admins', token, { email });
  const revoke = (token: string, userId: string) => callWith(app, 'DELETE', `/api/backoffice/admins/${userId}`, token);
  const auditOf = (action: string) => prisma.backofficeAuditLog.findMany({ where: { action }, orderBy: { id: 'asc' } });

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

  it('lists the first administrator as granted by nobody: the command made it', async () => {
    const first = await signedInAdmin(app);

    const response = await list(first.session.accessToken);

    expect(response.statusCode).toBe(200);
    expect(response.json<BackofficeAdmin[]>()).toEqual([{ userId: first.id, name: 'Ana Souza', email: first.email, grantedAt: expect.any(String), grantedBy: null }]);
  });

  it('lets an administrator grant the role to a verified account, which can then sign in', async () => {
    const first = await signedInAdmin(app, 'primeira');
    const second = await newAccount(app, 'segunda', 'Bia Lima');
    expect((await signInStep(app, second.email)).statusCode).toBe(401);

    // Typed with capitals and spaces, as an address is.
    const response = await grant(first.session.accessToken, `  ${second.email.toUpperCase()} `);

    expect(response.statusCode).toBe(201);
    const granted = response.json<BackofficeAdmin>();
    expect(granted).toEqual({ userId: second.id, name: 'Bia Lima', email: second.email, grantedAt: expect.any(String), grantedBy: { id: first.id, name: 'Ana Souza', email: first.email } });
    expect((await list(first.session.accessToken)).json<BackofficeAdmin[]>()).toEqual([expect.objectContaining({ userId: first.id }), granted]);

    const session = await backofficeSignIn(app, second.email);
    expect((await list(session.accessToken)).statusCode).toBe(200);
  });

  it('records a grant with who granted, to whom and from where', async () => {
    const first = await signedInAdmin(app, 'primeira');
    const second = await newAccount(app, 'segunda');

    await grant(first.session.accessToken, second.email);

    const granted = (await auditOf('ADMIN_GRANTED')).filter((row) => row.actorKind === 'ADMIN');
    expect(granted).toEqual([
      expect.objectContaining({ actorUserId: first.id, actorLabel: first.email, targetType: 'USER', targetId: second.id, targetLabel: second.email, ip: '127.0.0.1', details: {} }),
    ]);
  });

  it('refuses to grant to an unknown e-mail, an unverified account and somebody who is one already — and records none of it', async () => {
    const first = await signedInAdmin(app, 'primeira');
    const unverified = newEmail('sem-verificar');
    await register(app, unverified);
    const before = await prisma.backofficeAuditLog.count();

    const unknown = await grant(first.session.accessToken, newEmail('ninguem'));
    const notVerified = await grant(first.session.accessToken, unverified);
    const already = await grant(first.session.accessToken, first.email);
    const notAnEmail = await grant(first.session.accessToken, 'isto-nao-e-um-email');

    expect([unknown.statusCode, unknown.json<ApiErrorBody>().errorCode]).toEqual([404, 'BACKOFFICE_USER_NOT_FOUND']);
    expect([notVerified.statusCode, notVerified.json<ApiErrorBody>().errorCode]).toEqual([409, 'BACKOFFICE_USER_NOT_VERIFIED']);
    expect([already.statusCode, already.json<ApiErrorBody>().errorCode]).toEqual([409, 'BACKOFFICE_ADMIN_ALREADY']);
    expect(notAnEmail.statusCode).toBe(400);
    expect(await prisma.platformAdmin.count()).toBe(1);
    expect(await prisma.backofficeAuditLog.count()).toBe(before);
  });

  it('cannot be reached by signing up: a body that asks for the role is refused, and none is given', async () => {
    const email = newEmail('esperta');

    for (const extra of [{ platformAdmin: true }, { role: 'ADMIN' }, { isAdmin: true }, { platformAdmin: { create: {} } }]) {
      const response = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { name: 'Ana Souza', email, password: PASSWORD, ...extra } });
      expect(response.statusCode).toBe(400);
    }

    expect(await prisma.user.count({ where: { email } })).toBe(0);
    expect(await prisma.platformAdmin.count()).toBe(0);
  });

  it('lets an administrator revoke another, whose sessions and pending sign-ins end with the role', async () => {
    const staying = await signedInAdmin(app, 'fica');
    const leaving = await signedInAdmin(app, 'sai');
    await signInStep(app, leaving.email);

    const response = await revoke(staying.session.accessToken, leaving.id);

    expect(response.statusCode).toBe(204);
    expect((await list(staying.session.accessToken)).json<BackofficeAdmin[]>().map((admin) => admin.userId)).toEqual([staying.id]);
    expect(await prisma.platformAdmin.findUniqueOrThrow({ where: { userId: leaving.id } })).toMatchObject({ revokedByUserId: staying.id, revokedAt: expect.any(Date) });
    expect(await prisma.backofficeSession.count({ where: { userId: leaving.id, revokedAt: null } })).toBe(0);
    expect(await prisma.backofficeSignInChallenge.count({ where: { userId: leaving.id, consumedAt: null } })).toBe(0);
    expect((await signInStep(app, leaving.email)).statusCode).toBe(401);
    expect(await auditOf('ADMIN_REVOKED')).toEqual([
      expect.objectContaining({ actorKind: 'ADMIN', actorUserId: staying.id, actorLabel: staying.email, targetType: 'USER', targetId: leaving.id, targetLabel: leaving.email, ip: '127.0.0.1' }),
    ]);
    // The account itself is untouched: it is a shopkeeper's still.
    expect(await prisma.user.findUniqueOrThrow({ where: { id: leaving.id } })).toMatchObject({ email: leaving.email, emailVerifiedAt: expect.any(Date) });
  });

  it('never revokes the last administrator', async () => {
    const only = await signedInAdmin(app);

    const response = await revoke(only.session.accessToken, only.id);

    expect([response.statusCode, response.json<ApiErrorBody>().errorCode]).toEqual([409, 'BACKOFFICE_LAST_ADMIN']);
    expect(await prisma.platformAdmin.count({ where: { revokedAt: null } })).toBe(1);
    expect(await auditOf('ADMIN_REVOKED')).toEqual([]);
    expect((await list(only.session.accessToken)).statusCode).toBe(200);
  });

  it('lets an administrator give up the role while another stands, and is then out', async () => {
    const staying = await signedInAdmin(app, 'fica');
    const leaving = await signedInAdmin(app, 'sai');

    expect((await revoke(leaving.session.accessToken, leaving.id)).statusCode).toBe(204);

    expect((await list(leaving.session.accessToken)).statusCode).toBe(401);
    expect((await auditOf('ADMIN_REVOKED'))[0]).toMatchObject({ actorUserId: leaving.id, targetId: leaving.id });
    // And the one left is now the last.
    expect((await revoke(staying.session.accessToken, staying.id)).json<ApiErrorBody>().errorCode).toBe('BACKOFFICE_LAST_ADMIN');
  });

  it('leaves one standing when two administrators revoke each other at once', async () => {
    const one = await signedInAdmin(app, 'uma');
    const other = await signedInAdmin(app, 'outra');

    const both = await Promise.all([revoke(one.session.accessToken, other.id), revoke(other.session.accessToken, one.id)]);

    expect(await prisma.platformAdmin.count({ where: { revokedAt: null } })).toBe(1);
    expect(both.map((response) => response.statusCode).filter((status) => status === 204)).toHaveLength(1);
    expect(await auditOf('ADMIN_REVOKED')).toHaveLength(1);
  });

  it('answers 404 for somebody who is no administrator, and 400 for an id that is none', async () => {
    const first = await signedInAdmin(app, 'primeira');
    const shopkeeper = await newAccount(app, 'lojista');

    const notOne = await revoke(first.session.accessToken, shopkeeper.id);
    const notAnId = await revoke(first.session.accessToken, 'abc');

    expect([notOne.statusCode, notOne.json<ApiErrorBody>().errorCode]).toEqual([404, 'BACKOFFICE_ADMIN_NOT_FOUND']);
    expect(notAnId.statusCode).toBe(400);
  });

  it('grants again to somebody revoked, on the same row, and both moves stay in the record', async () => {
    const staying = await signedInAdmin(app, 'fica');
    const back = await newAccount(app, 'volta');
    await grant(staying.session.accessToken, back.email);
    await revoke(staying.session.accessToken, back.id);

    const again = await grant(staying.session.accessToken, back.email);

    expect(again.statusCode).toBe(201);
    expect(await prisma.platformAdmin.findMany({ where: { userId: back.id } })).toEqual([expect.objectContaining({ revokedAt: null, revokedByUserId: null, grantedByUserId: staying.id })]);
    const moves = await prisma.backofficeAuditLog.findMany({ where: { targetId: back.id, action: { startsWith: 'ADMIN_' } }, orderBy: { id: 'asc' } });
    expect(moves.map((row) => row.action)).toEqual(['ADMIN_GRANTED', 'ADMIN_REVOKED', 'ADMIN_GRANTED']);
  });
});
