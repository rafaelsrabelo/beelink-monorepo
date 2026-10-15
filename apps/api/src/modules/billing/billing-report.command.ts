// Types
import type { PrismaClient } from '../../generated/prisma/client.js';

// App
import { dayShaped, optionsOf, Refusal, runOptions, type CommandOutput } from './billing-command.js';
import { brasiliaDayOf, openOfBrasiliaDay } from './billing-dates.js';
import { billingReportOf, type BillingReport } from './billing-report.js';
import { PAGES_EXISTED_ON } from './billing.constants.js';
import { LOCK_COLUMNS } from './page-lock.js';

/*
  The report run before charging is switched on (BEELINK-297), from a terminal in the API's container
  (`src/scripts/billing-report.ts`): how many pages there are, how many are exempt, free and until when,
  in their trial, and would be locked — and, apart, the pages created after 13/10/2026 whose trial is
  over, which lock the day it is switched on. It reads and writes nothing else.
*/

/** All the command touches. */
export type ReportCommandDb = Pick<PrismaClient, 'store'>;

/** Whether this deployment charges and has where to be paid — the pair that makes pages lock (`PageLocks.engaged`). */
export interface ChargingHere {
  enforced: boolean;
  keyed: boolean;
}

const USAGE = [
  "bee-link's pages as charging would find them: exempt, free and until when, in their trial, locked.",
  '',
  'Usage, in the api container (Dokploy: the api service, Terminal):',
  '  node dist/scripts/billing-report.js [--on <YYYY-MM-DD>]',
  '',
  "  --on   as the day charging is switched on begins in Brasília, nothing else changing until then; without it, now",
];

const LABEL_WIDTH = 34;

function chargingSaid({ enforced, keyed }: ChargingHere): string {
  if (enforced && keyed) return 'Charging here: on — the pages below locked are locked now.';
  if (enforced) return "Charging here: BILLING_ENFORCED is true, but bee-link's Asaas key is not set — no page locks until it is.";
  return 'Charging here: off — BILLING_ENFORCED is not true, and no page locks until it is.';
}

/** The instant the report is read at: now, or the first instant of the day given, today or later. */
function instantOf(on: string | undefined, now: Date): Date {
  if (on === undefined) return now;
  const day = dayShaped('on', on);
  let opens: Date;
  try {
    opens = openOfBrasiliaDay(day);
  } catch {
    throw new Refusal(`--on must be a day as YYYY-MM-DD: got "${on}".`);
  }
  const today = brasiliaDayOf(now);
  if (day < today) throw new Refusal(`--on ${day} is already over in Brasília (today is ${today}).`);
  return opens;
}

function lines(report: BillingReport): string[] {
  const row = (label: string, count: number, after = '') => `${label.padEnd(LABEL_WIDTH)}${String(count).padStart(5)}${after}`;
  const locked = report.locked.TRIAL_EXPIRED + report.locked.SUSPENDED + report.locked.CANCELED;
  return [
    row('Pages', report.pages),
    row('  exempt', report.exempt),
    row('  with no subscription', report.withoutSubscription),
    row('  locked with charging on', locked, `   (trial over ${report.locked.TRIAL_EXPIRED}, suspended ${report.locked.SUSPENDED}, cancelled ${report.locked.CANCELED})`),
    row('  open, on a plan paid for', report.paid),
    ...report.free.map((group) => row(`  open, free until ${group.lastDay}`, group.pages)),
    row('  open, in their trial', report.trial),
  ];
}

function trialOverLines(report: BillingReport): string[] {
  const heading = `Created after ${PAGES_EXISTED_ON}, with their trial over — they lock the day charging is switched on: ${report.trialOverSinceThen.length}`;
  if (report.trialOverSinceThen.length === 0) return [heading];
  const table = [['SLUG', 'CREATED', "TRIAL'S LAST DAY"], ...report.trialOverSinceThen.map((page) => [page.slug, page.createdOn, page.trialLastDay])];
  const widths = [0, 1].map((column) => Math.max(...table.map((cells) => (cells[column] ?? '').length)));
  return [heading, ...table.map((cells) => `  ${cells.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ').trimEnd()}`)];
}

async function report(args: readonly string[], db: ReportCommandDb, io: CommandOutput, charging: ChargingHere, now: Date): Promise<void> {
  const on = optionsOf(args, ['on']).get('on');
  const at = instantOf(on, now);
  const pages = await db.store.findMany({ select: { slug: true, createdAt: true, subscription: { select: LOCK_COLUMNS } }, orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }] });
  const read = billingReportOf(pages, at);

  io.out(on === undefined ? `bee-link's pages as charging would find them now, ${now.toISOString()}.` : `bee-link's pages as charging would find them as ${on} begins in Brasília, nothing else changing until then.`);
  io.out(chargingSaid(charging));
  io.out('');
  for (const line of lines(read)) io.out(line);
  io.out('');
  for (const line of trialOverLines(read)) io.out(line);
}

/** The command, given its arguments (`process.argv` past the script) and the database. Answers its exit code: `COMMAND_EXIT`. */
export function runBillingReportCommand(argv: readonly string[], db: ReportCommandDb, io: CommandOutput, charging: ChargingHere, now = new Date()): Promise<number> {
  return runOptions(argv, USAGE, (args) => report(args, db, io, charging, now), io);
}
