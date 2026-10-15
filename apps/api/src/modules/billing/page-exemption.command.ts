// Types
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { SubscriptionStatus } from '../../generated/prisma/enums.js';

// App
import { optionsOf, Refusal, runSubcommands, UsageError, type CommandOutput } from './billing-command.js';
import { brasiliaDayOf, lastDayBefore } from './billing-dates.js';
import { lockOf } from './page-lock.js';
import { statusAt } from './subscription-status.js';

/*
  Exempt pages from a terminal (BEELINK-297): the pages bee-link charges nothing for, by its own choice —
  Beelink's own, a test's, a pilot shop's. Run in the API's container, as the coupon's command is
  (`src/scripts/page-exemption.ts`). An exempt page is never locked and never charged (`page-lock.ts`).
*/

/** All the command touches. */
export type ExemptionCommandDb = Pick<PrismaClient, 'store' | 'storeSubscription'>;

const USAGE = [
  "Exempt pages: pages bee-link charges nothing for, by its own choice. An exempt page never locks.",
  '',
  'Usage, in the api container (Dokploy: the api service, Terminal):',
  '  node dist/scripts/page-exemption.js exempt --slug <SLUG>',
  '  node dist/scripts/page-exemption.js unexempt --slug <SLUG>',
  '  node dist/scripts/page-exemption.js list',
  '',
  "  --slug   the page's address, as in beelink.biz/<SLUG>",
];

/** What a page that never paid is written as: nothing at Asaas was ever paid for it. */
const NEVER_PAID: readonly SubscriptionStatus[] = ['TRIALING', 'TRIAL_EXPIRED'];

const PAGE_ROW = {
  status: true,
  trialEndsAt: true,
  currentPeriodEndsAt: true,
  freePeriodEndsAt: true,
  graceEndsAt: true,
  asaasSubscriptionId: true,
} as const;

function slugOf(args: readonly string[]): string {
  const typed = optionsOf(args, ['slug']).get('slug');
  if (typed === undefined) throw new UsageError('--slug is required');
  return typed.trim().toLowerCase();
}

async function pageAt(db: ExemptionCommandDb, slug: string) {
  const page = await db.store.findUnique({ where: { slug }, select: { id: true, name: true, subscription: { select: PAGE_ROW } } });
  if (!page) throw new Refusal(`No page has the address ${slug}.`);
  if (!page.subscription) throw new Refusal(`${slug} has no subscription to mark: every page is given one by the migration of BEELINK-297. Nothing was written.`);
  return { id: page.id, name: page.name, row: page.subscription };
}

/**
 * Only a page that never paid: one that did has its subscription at Asaas, which goes on charging — a
 * card by itself — and nothing here can stop it. The condition is written into the update, so a page
 * whose standing moved since it was read, or whose owner is choosing a plan this very moment (the
 * cycle's claim), is not touched.
 */
async function exempt(args: readonly string[], db: ExemptionCommandDb, io: CommandOutput, now: Date): Promise<void> {
  const slug = slugOf(args);
  const page = await pageAt(db, slug);
  if (page.row.status === 'EXEMPT') return io.out(`${slug} is exempt already.`);
  if (!NEVER_PAID.includes(page.row.status)) {
    throw new Refusal(`${slug} paid for its plan before (it stands ${statusAt(page.row, now)}): its subscription at Asaas goes on charging, and exempting it here would not stop that. Nothing was written.`);
  }

  const { count } = await db.storeSubscription.updateMany({
    where: { storeId: page.id, status: { in: [...NEVER_PAID] }, OR: [{ asaasSubscriptionClaimedUntil: null }, { asaasSubscriptionClaimedUntil: { lte: now } }] },
    data: { status: 'EXEMPT' },
  });
  if (count === 0) throw new Refusal(`${slug} changed while this ran, or its owner is choosing a plan for it right now: run it again in a minute. Nothing was written.`);

  io.out(`Exempted ${slug} (${page.name}): it is charged nothing and never locks. Its trial and any free month stay on its row, and count again should it be unexempted.`);
  if (page.row.asaasSubscriptionId) {
    io.out("  Its owner chose a plan for it at bee-link's Asaas account and never paid: that subscription stands there. It charges nobody by itself — nothing was paid, so no card is kept — and may be removed in Asaas's panel.");
  }
}

/**
 * Back to a page that never paid — the only kind `exempt` makes. Its trial and any free month are what
 * its row kept; the lock reads them again from now on. One made exempt by hand after it paid is not
 * guessed at.
 */
async function unexempt(args: readonly string[], db: ExemptionCommandDb, io: CommandOutput, now: Date): Promise<void> {
  const slug = slugOf(args);
  const page = await pageAt(db, slug);
  if (page.row.status !== 'EXEMPT') return io.out(`${slug} is not exempt: it stands ${statusAt(page.row, now)}.`);
  if (page.row.currentPeriodEndsAt) {
    throw new Refusal(`${slug} paid for a period before it was made exempt: where it stands is Asaas's to say, and is not guessed here. Nothing was written.`);
  }

  const { count } = await db.storeSubscription.updateMany({ where: { storeId: page.id, status: 'EXEMPT', currentPeriodEndsAt: null }, data: { status: 'TRIALING' } });
  if (count === 0) throw new Refusal(`${slug} changed while this ran: run it again. Nothing was written.`);

  const row = { ...page.row, status: 'TRIALING' as const };
  const free = row.freePeriodEndsAt && now.getTime() < row.freePeriodEndsAt.getTime() ? `, free until ${lastDayBefore(row.freePeriodEndsAt)}` : '';
  const lock = lockOf(row, now) ? ': it locks at once wherever charging is on, until it pays' : '';
  io.out(`Unexempted ${slug} (${page.name}): it stands ${statusAt(row, now)}${free}${lock}.`);
}

async function list(args: readonly string[], db: ExemptionCommandDb, io: CommandOutput): Promise<void> {
  optionsOf(args, []);
  const pages = await db.store.findMany({ where: { subscription: { status: 'EXEMPT' } }, select: { slug: true, name: true, createdAt: true }, orderBy: { slug: 'asc' } });
  if (pages.length === 0) return io.out('No page is exempt.');

  const table = [['SLUG', 'CREATED', 'NAME'], ...pages.map((page) => [page.slug, brasiliaDayOf(page.createdAt), page.name])];
  const widths = [0, 1].map((column) => Math.max(...table.map((row) => (row[column] ?? '').length)));
  for (const row of table) io.out(row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ').trimEnd());
}

/** The command, given its arguments (`process.argv` past the script) and the database. Answers its exit code: `COMMAND_EXIT`. */
export function runPageExemptionCommand(argv: readonly string[], db: ExemptionCommandDb, io: CommandOutput, now = new Date()): Promise<number> {
  return runSubcommands(
    argv,
    USAGE,
    {
      exempt: (args) => exempt(args, db, io, now),
      unexempt: (args) => unexempt(args, db, io, now),
      list: (args) => list(args, db, io),
    },
    io,
  );
}
