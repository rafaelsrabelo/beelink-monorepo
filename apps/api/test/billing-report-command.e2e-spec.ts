// Node
import { readFileSync } from 'node:fs';

// Libs
import pg from 'pg';

// App
import type { SubscriptionStatus } from '../src/generated/prisma/enums.js';
import { COMMAND_EXIT } from '../src/modules/billing/billing-command.js';
import { trialEndOf } from '../src/modules/billing/billing-dates.js';
import { runBillingReportCommand, type ChargingHere } from '../src/modules/billing/billing-report.command.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { resetDatabase } from './support/reset-database.js';
import { TEST_DATABASE_URL } from './support/test-database.js';

const MIGRATION = readFileSync(new URL('../prisma/migrations/20261015170000_pages_that_existed/migration.sql', import.meta.url), 'utf8');
const OFF: ChargingHere = { enforced: false, keyed: false };
/** 15/10/2026 at noon in Brasília. */
const NOW = new Date('2026-10-15T15:00:00.000Z');

/**
 * The report run before charging is switched on (BEELINK-297), against planted pages: some from before
 * subscriptions existed, given their row and month by the migration, and some created since.
 */
describe('the report of the pages before charging is switched on', () => {
  const prisma = new PrismaService();
  let owner: string;
  let pages = 0;

  async function migrate(): Promise<void> {
    const client = new pg.Client({ connectionString: TEST_DATABASE_URL });
    await client.connect();
    try {
      await client.query(MIGRATION);
    } finally {
      await client.end();
    }
  }

  async function run(argv: string[], charging = OFF, now = NOW) {
    const out: string[] = [];
    const err: string[] = [];
    const exit = await runBillingReportCommand(argv, prisma, { out: (line) => out.push(line), err: (line) => err.push(line) }, charging, now);
    return { exit, out, err: err.join('\n') };
  }

  async function pageFrom(createdAt: string, slug?: string): Promise<string> {
    pages += 1;
    return (await prisma.store.create({ data: { ownerId: owner, slug: slug ?? `teste-s15-${pages}`, name: `Teste S15 ${pages}`, createdAt: new Date(createdAt) } })).id;
  }

  async function pageWithRow(createdAt: string, data: { status?: SubscriptionStatus; freePeriodEndsAt?: Date; currentPeriodEndsAt?: Date } = {}, slug?: string): Promise<void> {
    const storeId = await pageFrom(createdAt, slug);
    const created = new Date(createdAt);
    await prisma.storeSubscription.create({ data: { storeId, status: 'TRIALING', trialStartedAt: created, trialEndsAt: trialEndOf(created), ...data } });
  }

  /** The number on a line of the report, by its label. */
  const countOf = (out: string[], label: string): number => Number(new RegExp(`^${label} +(\\d+)`).exec(out.find((line) => line.startsWith(label)) ?? '')?.[1] ?? Number.NaN);

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    owner = (await prisma.user.create({ data: { name: 'Teste S15 Dona', email: `teste-s15-${Date.now()}@exemplo.test` } })).id;
    // From before subscriptions: three of 13/10 or earlier, one of 14/10 made by code from before them.
    await pageFrom('2026-09-20T13:00:00.000Z');
    await pageFrom('2026-10-10T13:00:00.000Z');
    await pageFrom('2026-10-14T02:59:59.999Z');
    await pageFrom('2026-10-14T03:00:00.000Z', 'teste-s15-depois-sem-linha');
    // Since: of 13/10 in trial, exempt, paid, past due inside its grace, suspended, with a coupon's later month; of 14/10 on, in trial.
    await pageWithRow('2026-10-13T18:00:00.000Z');
    await pageWithRow('2026-10-13T19:00:00.000Z', { status: 'EXEMPT' });
    await pageWithRow('2026-10-13T20:00:00.000Z', { status: 'ACTIVE', currentPeriodEndsAt: new Date('2026-11-14T03:00:00.000Z') });
    await pageWithRow('2026-10-13T20:30:00.000Z', { status: 'PAST_DUE', currentPeriodEndsAt: new Date('2026-10-14T03:00:00.000Z') });
    await pageWithRow('2026-10-13T20:45:00.000Z', { status: 'SUSPENDED', currentPeriodEndsAt: new Date('2026-10-01T03:00:00.000Z') });
    await pageWithRow('2026-10-13T21:00:00.000Z', { freePeriodEndsAt: new Date('2026-11-22T03:00:00.000Z') });
    await pageWithRow('2026-10-14T13:00:00.000Z', {}, 'teste-s15-depois');
    await migrate();
  });

  it('counts the pages by where they stand now, as counted by hand', async () => {
    const { exit, out } = await run([]);

    expect(exit).toBe(COMMAND_EXIT.done);
    expect(out[0]).toBe(`bee-link's pages as charging would find them now, ${NOW.toISOString()}.`);
    expect(out[1]).toBe('Charging here: off — BILLING_ENFORCED is not true, and no page locks until it is.');
    expect(countOf(out, 'Pages')).toBe(11);
    expect(countOf(out, '  exempt')).toBe(1);
    expect(countOf(out, '  with no subscription')).toBe(0);
    expect(countOf(out, '  locked with charging on')).toBe(1);
    expect(out.find((line) => line.startsWith('  locked'))).toMatch(/\(trial over 0, suspended 1, cancelled 0\)$/);
    expect(countOf(out, '  open, on a plan paid for')).toBe(2);
    // The three from before subscriptions of 13/10 and the one of 13/10 in trial; the coupon's later month apart.
    expect(countOf(out, '  open, free until 2026-11-13')).toBe(4);
    expect(countOf(out, '  open, free until 2026-11-21')).toBe(1);
    // Both of 14/10 on: the one given its row by the migration, and the one born with it.
    expect(countOf(out, '  open, in their trial')).toBe(2);
    expect(out.at(-1)).toBe('Created after 2026-10-13, with their trial over — they lock the day charging is switched on: 0');
  });

  it('reads the day charging would be switched on: the pages of 14/10 lock then, with the day their trial ended', async () => {
    const { exit, out } = await run(['--on', '2026-11-01']);

    expect(exit).toBe(COMMAND_EXIT.done);
    expect(out[0]).toBe("bee-link's pages as charging would find them as 2026-11-01 begins in Brasília, nothing else changing until then.");
    expect(countOf(out, '  open, free until 2026-11-13')).toBe(4);
    expect(countOf(out, '  open, in their trial')).toBe(0);
    const heading = out.indexOf('Created after 2026-10-13, with their trial over — they lock the day charging is switched on: 2');
    expect(heading).toBeGreaterThan(0);
    expect(out[heading + 1]).toMatch(/^ {2}SLUG +CREATED +TRIAL'S LAST DAY$/);
    expect(out.slice(heading + 2).map((line) => line.trim().split(/ {2,}/))).toEqual([
      ['teste-s15-depois-sem-linha', '2026-10-14', '2026-10-21'],
      ['teste-s15-depois', '2026-10-14', '2026-10-21'],
    ]);
  });

  it('reads a day as it begins: on 13/11, the last day of their month, the pages of 13/10 are still free', async () => {
    const { out } = await run(['--on', '2026-11-13']);

    expect(countOf(out, '  open, free until 2026-11-13')).toBe(4);
    expect(out.find((line) => line.startsWith('  locked'))).toMatch(/\(trial over 2, suspended 2, cancelled 0\)$/);
  });

  it('locks the pages of 13/10 once their month is over, on 14/11 — and a past due page whose grace ran out', async () => {
    const { out } = await run(['--on', '2026-11-14']);

    expect(out.some((line) => line.startsWith('  open, free until 2026-11-13'))).toBe(false);
    expect(countOf(out, '  open, free until 2026-11-21')).toBe(1);
    expect(countOf(out, '  open, on a plan paid for')).toBe(1);
    expect(out.find((line) => line.startsWith('  locked'))).toMatch(/ 8 {3}\(trial over 6, suspended 2, cancelled 0\)$/);
  });

  it('says whether this deployment locks pages: the switch and the key', async () => {
    expect((await run([], { enforced: true, keyed: true })).out[1]).toBe('Charging here: on — the pages below locked are locked now.');
    expect((await run([], { enforced: true, keyed: false })).out[1]).toContain("bee-link's Asaas key is not set");
  });

  it('counts a page left with no subscription, which never locks', async () => {
    await prisma.storeSubscription.deleteMany({ where: { store: { slug: 'teste-s15-depois' } } });

    expect(countOf((await run([])).out, '  with no subscription')).toBe(1);
  });

  it.each([
    ['a day gone by', ['--on', '2026-10-14'], 'already over'],
    ['a day that is no day', ['--on', '2026-11-31'], 'must be a day'],
    ['a day written otherwise', ['--on', '01/11/2026'], 'must be a day'],
  ])('refuses %s', async (_what, argv, said) => {
    const { exit, err } = await run(argv);

    expect(exit).toBe(COMMAND_EXIT.refused);
    expect(err).toContain(said);
  });

  it('says how it is used when asked for help, or asked wrongly', async () => {
    expect(await run(['help'])).toMatchObject({ exit: COMMAND_EXIT.done, out: expect.arrayContaining(['  node dist/scripts/billing-report.js [--on <YYYY-MM-DD>]']) });
    expect((await run(['--at', '2026-11-01'])).exit).toBe(COMMAND_EXIT.usage);
    expect((await run(['now'])).exit).toBe(COMMAND_EXIT.usage);
  });
});
