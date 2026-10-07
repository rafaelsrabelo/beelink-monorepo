// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// App
import { GRANT_PLATFORM_ADMIN_USAGE, grantPlatformAdminCommand } from '../src/modules/backoffice/admins/grant-platform-admin.command.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, register } from './support/auth-flow.js';
import { newAccount } from './support/backoffice.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

describe('the command that makes the first platform administrator', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let out: string[];
  let errors: string[];

  const run = (argument?: string) => grantPlatformAdminCommand(argument, { out: (line) => void out.push(line), error: (line) => void errors.push(line) });

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    out = [];
    errors = [];
  });

  it('grants the role to a verified account, and records it with the command as the actor', async () => {
    const account = await newAccount(app, 'primeira');

    // Typed as a person types an address: the account's is stored trimmed and in lower case.
    expect(await run(`  ${account.email.toUpperCase()} `)).toBe(0);

    expect(out).toEqual([`${account.email} is now a platform administrator.`]);
    expect(errors).toEqual([]);
    expect(await prisma.platformAdmin.findMany()).toEqual([expect.objectContaining({ userId: account.id, grantedByUserId: null, revokedAt: null })]);
    expect(await prisma.backofficeAuditLog.findMany()).toEqual([
      expect.objectContaining({ actorKind: 'COMMAND', actorUserId: null, actorLabel: null, action: 'ADMIN_GRANTED', targetType: 'USER', targetId: account.id, targetLabel: account.email, ip: null, userAgent: null, details: {} }),
    ]);
  });

  it('changes nothing and records nothing when run again', async () => {
    const account = await newAccount(app, 'repetida');
    await run(account.email);
    const before = await prisma.platformAdmin.findUniqueOrThrow({ where: { userId: account.id } });

    expect(await run(account.email)).toBe(0);

    expect(out.at(-1)).toBe(`${account.email} is a platform administrator already; nothing changed.`);
    expect(await prisma.platformAdmin.findUniqueOrThrow({ where: { userId: account.id } })).toEqual(before);
    expect(await prisma.backofficeAuditLog.count()).toBe(1);
  });

  it('refuses an e-mail no account has', async () => {
    expect(await run('ninguem@exemplo.test')).toBe(1);

    expect(errors).toEqual(['Refused: No bee-link account has this e-mail']);
    expect(await prisma.platformAdmin.count()).toBe(0);
    expect(await prisma.backofficeAuditLog.count()).toBe(0);
  });

  it('refuses an account whose e-mail is not verified', async () => {
    const email = newEmail('sem-verificar');
    await register(app, email);

    expect(await run(email)).toBe(1);

    expect(errors).toEqual(['Refused: The account has not verified its e-mail']);
    expect(await prisma.platformAdmin.count()).toBe(0);
    expect(await prisma.backofficeAuditLog.count()).toBe(0);
  });

  it("refuses a shop's customer, whose account is not bee-link's", async () => {
    const owner = await newAccount(app, 'dona');
    const store = await prisma.store.create({ data: { name: 'Loja', slug: 'loja-do-comando', type: 'ECOMMERCE', ownerId: owner.id } });
    const customer = await prisma.user.create({ data: { name: 'Bia', email: 'bia-cliente@exemplo.test', storeId: store.id, emailVerifiedAt: new Date() } });

    expect(await run(customer.email)).toBe(1);

    expect(errors).toEqual(['Refused: No bee-link account has this e-mail']);
    expect(await prisma.platformAdmin.count()).toBe(0);
  });

  it('says how it is used when given no e-mail', async () => {
    expect(await run()).toBe(1);
    expect(await run('   ')).toBe(1);

    expect(errors).toEqual([GRANT_PLATFORM_ADMIN_USAGE, GRANT_PLATFORM_ADMIN_USAGE]);
  });
});
