// Types
import type { PrismaClient } from '../../generated/prisma/client.js';

// App
import { ATTEMPTS_MAX } from '../../shared/mail/outbox-mailer.js';
import { dayShaped, optionsOf, Refusal, runSubcommands, UsageError, type CommandOutput } from './billing-command.js';
import { brasiliaDayOf, dateColumnOf, dayOfDateColumn, daysAfter } from './billing-dates.js';
import { CHARGING_NOTICE_DAYS, PLAN_ON_SALE } from './billing.constants.js';

/*
  The notice that charging starts, from a terminal (BEELINK-297): one e-mail to each shopkeeper with a
  page that locks without a plan, saying the day and the day each page locks. Run in the API's
  container (`src/scripts/charging-notice.ts`). This only writes the notices, one an account and never a
  second; the API that is running sends them, from its outbox (`ChargingNoticeMailer`). Nothing is sent
  unless this is run.
*/

/** All the command touches. */
export type NoticeCommandDb = Pick<PrismaClient, '$transaction' | 'chargingNotice' | 'plan'>;

const USAGE = [
  'The notice that charging starts: one e-mail to each shopkeeper with a page that locks without a plan,',
  'saying the day, and the day each of their pages locks. Each shopkeeper is told once, ever.',
  '',
  'Usage, in the api container (Dokploy: the api service, Terminal):',
  '  node dist/scripts/charging-notice.js send --on <YYYY-MM-DD>',
  '  node dist/scripts/charging-notice.js status',
  '',
  `  --on   the day BILLING_ENFORCED is switched on, on Brasília's calendar: ${CHARGING_NOTICE_DAYS} days from today or later`,
];

/** The day typed for `--on`, refused unless it is far enough ahead for the notice to be told in time. */
function switchOnDayOf(args: readonly string[], now: Date): string {
  const typed = optionsOf(args, ['on']).get('on');
  if (typed === undefined) throw new UsageError('--on is required');
  const day = dayShaped('on', typed);
  try {
    dateColumnOf(day);
  } catch {
    throw new Refusal(`--on must be a day as YYYY-MM-DD: got "${typed}".`);
  }
  const today = brasiliaDayOf(now);
  const earliest = daysAfter(today, CHARGING_NOTICE_DAYS);
  if (day < earliest) {
    throw new Refusal(`--on ${day} is too soon: shopkeepers are told ${CHARGING_NOTICE_DAYS} days before charging starts, so the earliest day is ${earliest} (today is ${today} in Brasília). Nothing was written.`);
  }
  return day;
}

/**
 * Writes a notice for every shopkeeper with a page that never paid and is not exempt — whose page locks
 * one day without a plan — and was not told yet, all in one statement. Refused, with nothing written,
 * when shopkeepers were told another day: two days told would be worse than one. Runs one at a time.
 */
async function send(args: readonly string[], db: NoticeCommandDb, io: CommandOutput, now: Date): Promise<void> {
  const day = switchOnDayOf(args, now);
  const plan = await db.plan.findUnique({ where: { slug: PLAN_ON_SALE }, select: { active: true } });
  if (!plan?.active) throw new Refusal(`The plan on sale (${PLAN_ON_SALE}) is not in the database, or is switched off: the notice says its prices, and every deploy's seed writes it. Nothing was written.`);

  const switchOnDay = dateColumnOf(day);
  const queued = await db.$transaction(async (tx) => {
    // Two runs at once with two days would each find the other's day not yet written.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('charging_notices'))`;
    const told = await tx.chargingNotice.findFirst({ where: { NOT: { switchOnDay } }, select: { switchOnDay: true } });
    if (told) throw new Refusal(`Shopkeepers were told charging starts on ${dayOfDateColumn(told.switchOnDay)}: telling some ${day} would tell two days. Nothing was written.`);

    return tx.$executeRaw`
      INSERT INTO "charging_notices" ("id", "userId", "switchOnDay")
      SELECT uuidv7(), "owners"."ownerId", ${day}::date
      FROM (
        SELECT DISTINCT s."ownerId"
        FROM "stores" AS s
        JOIN "store_subscriptions" AS sub ON sub."storeId" = s."id"
        WHERE sub."status" IN ('TRIALING', 'TRIAL_EXPIRED')
      ) AS "owners"
      ON CONFLICT ("userId") DO NOTHING`;
  });

  const told = await db.chargingNotice.count();
  io.out(`Queued ${queued} notice${queued === 1 ? '' : 's'} saying charging starts on ${day}: one for each shopkeeper with a page that locks without a plan.`);
  if (told > queued) io.out(`  ${told - queued} shopkeeper${told - queued === 1 ? ' was' : 's were'} told already, and ${told - queued === 1 ? 'is' : 'are'} not told again.`);
  io.out('The api service sends them within a minute. To see them go: node dist/scripts/charging-notice.js status');
}

/** How the notices stand: done (sent, or with no page left to tell of), waiting, given up — and to whom the given up were owed. */
async function status(args: readonly string[], db: NoticeCommandDb, io: CommandOutput): Promise<void> {
  optionsOf(args, []);
  const notices = await db.chargingNotice.findMany({ select: { switchOnDay: true, sentAt: true, attempts: true, user: { select: { email: true } } }, orderBy: { createdAt: 'asc' } });
  if (notices.length === 0) return io.out('No shopkeeper was told yet.');

  const days = [...new Set(notices.map((notice) => dayOfDateColumn(notice.switchOnDay)))];
  const done = notices.filter((notice) => notice.sentAt !== null).length;
  const givenUp = notices.filter((notice) => notice.sentAt === null && notice.attempts >= ATTEMPTS_MAX);
  io.out(`Notices saying charging starts on ${days.join(', ')}: ${notices.length} — ${done} done, ${notices.length - done - givenUp.length} waiting, ${givenUp.length} given up.`);
  if (givenUp.length === 0) return;
  io.out(`Given up after ${ATTEMPTS_MAX} tries — tell these shopkeepers some other way:`);
  for (const notice of givenUp) io.out(`  ${notice.user.email}`);
}

/** The command, given its arguments (`process.argv` past the script) and the database. Answers its exit code: `COMMAND_EXIT`. */
export function runChargingNoticeCommand(argv: readonly string[], db: NoticeCommandDb, io: CommandOutput, now = new Date()): Promise<number> {
  return runSubcommands(
    argv,
    USAGE,
    {
      send: (args) => send(args, db, io, now),
      status: (args) => status(args, db, io),
    },
    io,
  );
}
