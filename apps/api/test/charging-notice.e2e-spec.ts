// Node
import { readFileSync } from 'node:fs';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Libs
import pg from 'pg';

// App
import { COMMAND_EXIT } from '../src/modules/billing/billing-command.js';
import { trialEndOf } from '../src/modules/billing/billing-dates.js';
import { ChargingNoticeMailer } from '../src/modules/billing/charging-notice-mailer.js';
import { runChargingNoticeCommand } from '../src/modules/billing/charging-notice.command.js';
import { env } from '../src/shared/config/env.js';
import { addressOf } from '../src/shared/mail/mail.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, countMessages, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';
import { TEST_DATABASE_URL } from './support/test-database.js';

const PLANS_SEED = readFileSync(new URL('../prisma/seed/plans.sql', import.meta.url), 'utf8');
const MIGRATION = readFileSync(new URL('../prisma/migrations/20261015170000_pages_that_existed/migration.sql', import.meta.url), 'utf8');
/** 20/10/2026 at noon in Brasília: the earliest day charging may be announced for is 27/10. */
const NOW = new Date('2026-10-20T15:00:00.000Z');
const SUBJECT = 'A cobrança das páginas na Beelink começa em';

/** The text of the newest notice an address got, its lines ended as written: SMTP carries them as CRLF. */
async function noticeTo(address: string) {
  const message = await waitForMessage(address, 10_000, SUBJECT);
  return { ...message, Text: message.Text.replace(/\r\n/g, '\n') };
}

/**
 * The e-mail that tells each shopkeeper the day charging starts (BEELINK-297): written by the command,
 * sent by the API's outbox — here, by flushing it as the API's own sweep does every minute. Charging is
 * off, as it is in production while the notice goes: the notice is what comes before switching it on.
 */
describe('the notice that charging starts', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let mailer: ChargingNoticeMailer;
  let ana: string;
  let bia: string;
  let caio: string;
  let duda: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    mailer = app.get(ChargingNoticeMailer);
  });

  afterAll(async () => {
    await app.close();
  });

  async function migrate(): Promise<void> {
    const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query(MIGRATION);
    } finally {
      await client.end();
    }
  }

  async function run(argv: string[], now = NOW) {
    const out: string[] = [];
    const err: string[] = [];
    const exit = await runChargingNoticeCommand(argv, prisma, { out: (line) => out.push(line), err: (line) => err.push(line) }, now);
    return { exit, out: out.join('\n'), err: err.join('\n') };
  }

  async function shopkeeper(name: string): Promise<{ id: string; email: string }> {
    const email = newEmail(name.split(' ')[0]!.toLowerCase());
    const user = await prisma.user.create({ data: { name, email } });
    return { id: user.id, email };
  }

  /** A page created at `createdAt`; with `row`, the subscription a page born then has, set as it says. */
  async function page(ownerId: string, slug: string, name: string, createdAt: string, row?: { status?: 'TRIALING' | 'EXEMPT' | 'ACTIVE'; currentPeriodEndsAt?: Date }): Promise<void> {
    const store = await prisma.store.create({ data: { ownerId, slug, name, createdAt: new Date(createdAt) } });
    if (row) await prisma.storeSubscription.create({ data: { storeId: store.id, status: 'TRIALING', trialStartedAt: new Date(createdAt), trialEndsAt: trialEndOf(new Date(createdAt)), ...row } });
  }

  const notices = () => prisma.chargingNotice.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: 'asc' } });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await prisma.$executeRawUnsafe(PLANS_SEED);
    await clearInbox();

    const owners = await Promise.all([shopkeeper('Ana Souza'), shopkeeper('Bia Lima'), shopkeeper('Caio Reis'), shopkeeper('Duda Prado')]);
    [ana, bia, caio, duda] = owners.map((owner) => owner.email) as [string, string, string, string];
    const [anaId, biaId, caioId, dudaId] = owners.map((owner) => owner.id) as [string, string, string, string];
    // Ana: a page from before subscriptions, and one created on 14/10 whose trial ended on 21/10.
    await page(anaId, 'doces-da-ana', 'Doces da Ana', '2026-09-20T13:00:00.000Z');
    await page(anaId, 'ana-bolos', 'Ana Bolos', '2026-10-14T13:00:00.000Z', {});
    // Bia: exempt alone. Caio: paying alone. Duda: a page of 13/10, and an exempt one beside it.
    await page(biaId, 'bia-teste', 'Bia Teste', '2026-10-13T18:00:00.000Z', { status: 'EXEMPT' });
    await page(caioId, 'caio-paga', 'Caio Paga', '2026-10-13T18:00:00.000Z', { status: 'ACTIVE', currentPeriodEndsAt: new Date('2026-12-13T03:00:00.000Z') });
    await page(dudaId, 'duda-doces', 'Duda Doces', '2026-10-13T19:00:00.000Z', {});
    await page(dudaId, 'duda-isenta', 'Duda Isenta', '2026-10-13T20:00:00.000Z', { status: 'EXEMPT' });
    // The month of 13/10, as the deploy gave it.
    await migrate();
  });

  it('tells each shopkeeper with a page that locks, once: the day, the price of each cycle by page, and the day each page locks', async () => {
    const { exit, out } = await run(['send', '--on', '2026-11-20']);

    expect(exit).toBe(COMMAND_EXIT.done);
    expect(out).toContain('Queued 2 notices saying charging starts on 2026-11-20');
    expect(await mailer.flush()).toBe(2);

    const host = new URL(env.WEB_URL).host;
    const toAna = await noticeTo(ana);
    expect(toAna.Subject).toBe('A cobrança das páginas na Beelink começa em 20/11/2026');
    expect(toAna.From.Address).toBe(addressOf(env.MAIL_FROM));
    expect(toAna.Text).toContain('Olá, Ana.');
    expect(toAna.Text).toContain('- Mensal: R$ 59,90\n- 6 meses: R$ 323,40 (R$ 53,90 por mês)\n- 1 ano: R$ 574,80 (R$ 47,90 por mês)');
    expect(toAna.Text).toContain(`Suas páginas:\n\n- Doces da Ana (${host}/doces-da-ana): sem um plano, ela trava e sai do ar em 20/11/2026.\n- Ana Bolos (${host}/ana-bolos): sem um plano, ela trava e sai do ar em 20/11/2026.`);

    const toDuda = await noticeTo(duda);
    expect(toDuda.Text).toContain(`Sua página:\n\n- Duda Doces (${host}/duda-doces): sem um plano`);
    expect(toDuda.Text).not.toContain('Duda Isenta');
    expect(await countMessages(bia)).toBe(0);
    expect(await countMessages(caio)).toBe(0);
  });

  it('tells a page of 13/10 it is free until 13/11 and locks on 14/11, when charging starts before', async () => {
    await run(['send', '--on', '2026-11-01']);
    await mailer.flush();

    const host = new URL(env.WEB_URL).host;
    const toAna = await noticeTo(ana);
    expect(toAna.Text).toContain(`- Doces da Ana (${host}/doces-da-ana): grátis até 13/11/2026. Sem um plano, ela trava e sai do ar em 14/11/2026.`);
    expect(toAna.Text).toContain(`- Ana Bolos (${host}/ana-bolos): sem um plano, ela trava e sai do ar em 01/11/2026.`);
  });

  it('tells nobody twice: a second run writes nothing for those told, and the outbox sends nothing more', async () => {
    await run(['send', '--on', '2026-11-20']);
    expect(await mailer.flush()).toBe(2);
    const once = await notices();

    const again = await run(['send', '--on', '2026-11-20']);

    expect(again.exit).toBe(COMMAND_EXIT.done);
    expect(again.out).toContain('Queued 0 notices');
    expect(again.out).toContain('2 shopkeepers were told already, and are not told again.');
    expect(await mailer.flush()).toBe(0);
    expect(await notices()).toEqual(once);
    expect(await countMessages(ana)).toBe(1);
    expect(await countMessages(duda)).toBe(1);
  });

  it('tells, on a second run with the same day, only a shopkeeper who was not told yet', async () => {
    await run(['send', '--on', '2026-11-20']);
    await mailer.flush();
    const eva = await shopkeeper('Eva Nunes');
    await page(eva.id, 'eva-loja', 'Eva Loja', '2026-10-16T13:00:00.000Z', {});

    expect((await run(['send', '--on', '2026-11-20'])).out).toContain('Queued 1 notice saying');
    expect(await mailer.flush()).toBe(1);
    expect(await countMessages(eva.email)).toBe(1);
    expect(await countMessages(ana)).toBe(1);
  });

  it('refuses another day once shopkeepers were told one, and writes nothing', async () => {
    await run(['send', '--on', '2026-11-20']);
    const before = await notices();

    const { exit, err } = await run(['send', '--on', '2026-11-27']);

    expect(exit).toBe(COMMAND_EXIT.refused);
    expect(err).toContain('were told charging starts on 2026-11-20');
    expect(await notices()).toEqual(before);
  });

  it('refuses a day less than seven days away, and takes the seventh', async () => {
    const tooSoon = await run(['send', '--on', '2026-10-26']);
    expect(tooSoon).toMatchObject({ exit: COMMAND_EXIT.refused, err: expect.stringContaining('the earliest day is 2026-10-27') });
    expect(await prisma.chargingNotice.count()).toBe(0);

    expect((await run(['send', '--on', '2026-10-27'])).exit).toBe(COMMAND_EXIT.done);
  });

  it.each([
    ['a day that is no day', ['send', '--on', '2026-11-31'], 'must be a day'],
    ['a day written otherwise', ['send', '--on', '20/11/2026'], 'must be a day'],
  ])('refuses %s', async (_what, argv, said) => {
    expect(await run(argv)).toMatchObject({ exit: COMMAND_EXIT.refused, err: expect.stringContaining(said) });
    expect(await prisma.chargingNotice.count()).toBe(0);
  });

  it('refuses with no plan on sale to say the prices of', async () => {
    await prisma.plan.updateMany({ data: { active: false } });

    expect(await run(['send', '--on', '2026-11-20'])).toMatchObject({ exit: COMMAND_EXIT.refused, err: expect.stringContaining('The plan on sale (beelink)') });
    expect(await prisma.chargingNotice.count()).toBe(0);
  });

  it('sends nothing unless the command is run', async () => {
    expect(await mailer.flush()).toBe(0);
    expect(await countMessages(ana)).toBe(0);
  });

  it('is done without an e-mail for a shopkeeper whose pages were all exempted after it was written', async () => {
    await run(['send', '--on', '2026-11-20']);
    await prisma.storeSubscription.updateMany({ where: { store: { owner: { email: ana } } }, data: { status: 'EXEMPT' } });

    expect(await mailer.flush()).toBe(1);
    expect(await countMessages(ana)).toBe(0);
    expect((await notices()).every((notice) => notice.sentAt !== null)).toBe(true);
  });

  it('says how the notices stand, and to whom the ones given up were owed', async () => {
    expect(await run(['status'])).toMatchObject({ exit: COMMAND_EXIT.done, out: 'No shopkeeper was told yet.' });
    await run(['send', '--on', '2026-11-20']);
    expect((await run(['status'])).out).toBe('Notices saying charging starts on 2026-11-20: 2 — 0 done, 2 waiting, 0 given up.');

    await mailer.flush();
    await prisma.chargingNotice.updateMany({ where: { user: { email: duda } }, data: { sentAt: null, attempts: 5 } });

    expect((await run(['status'])).out).toBe(`Notices saying charging starts on 2026-11-20: 2 — 1 done, 0 waiting, 1 given up.\nGiven up after 5 tries — tell these shopkeepers some other way:\n  ${duda}`);
  });

  it('says how it is used', async () => {
    expect(await run(['help'])).toMatchObject({ exit: COMMAND_EXIT.done, out: expect.stringContaining('node dist/scripts/charging-notice.js send --on <YYYY-MM-DD>') });
    expect((await run([])).exit).toBe(COMMAND_EXIT.usage);
    expect((await run(['send'])).exit).toBe(COMMAND_EXIT.usage);
    expect((await run(['send', '--day', '2026-11-20'])).exit).toBe(COMMAND_EXIT.usage);
  });
});
