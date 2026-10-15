// Types
import type { PrismaClient } from '../../generated/prisma/client.js';

// App
import { optionsOf, Refusal, runSubcommands, UsageError, type CommandOutput } from './billing-command.js';
import { brasiliaDayOf, closeOfBrasiliaDay, lastDayBefore } from './billing-dates.js';
import { PLATFORM_COUPON_MAX_USES_MAX } from './billing.constants.js';
import { couponRefusalOf, storedCouponCodeOf } from './platform-coupon-rules.js';

export { COMMAND_EXIT, type CommandOutput } from './billing-command.js';

/*
  bee-link's own coupons from a terminal (BEELINK-224) — made, listed and switched off by Beelink, while
  no screen does it. Run in the API's container, where its variables are: `src/scripts/platform-coupon.ts`
  opens the database and hands it here. No code is ever written in the repository, which is public: a
  coupon exists only once somebody types it into this command.
*/

/** All the command touches. */
export type CouponCommandDb = Pick<PrismaClient, 'platformCoupon'>;

const USAGE = [
  "bee-link's coupons: each gives a page that never paid one free month, once in the page's life.",
  '',
  'Usage, in the api container (Dokploy: the api service, Terminal):',
  '  node dist/scripts/platform-coupon.js create --code <CODE> [--expires <YYYY-MM-DD>] [--max-uses <N>]',
  '  node dist/scripts/platform-coupon.js list',
  '  node dist/scripts/platform-coupon.js disable --code <CODE>',
  '',
  '  --code      3 to 30 letters without accents, digits, "-" or "_"; any case, kept in upper case',
  "  --expires   the last day it can be used, on Brasília's calendar; without it, it never expires",
  `  --max-uses  how many pages may use it, 1 to ${PLATFORM_COUPON_MAX_USES_MAX}; without it, as many as use it`,
];

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isUniqueViolation = (error: unknown): boolean => error instanceof Error && 'code' in error && error.code === 'P2002';

function codeOf(options: Map<string, string>): string {
  const typed = options.get('code');
  if (typed === undefined) throw new UsageError('--code is required');
  const code = storedCouponCodeOf(typed);
  if (!code) throw new Refusal('The code must be 3 to 30 letters without accents, digits, "-" or "_", beginning with a letter or a digit.');
  return code;
}

/** The first instant a coupon whose last day is `day` gives nothing: the midnight in Brasília closing it. Today is the earliest. */
function expiryOf(day: string | undefined, now: Date): Date | null {
  if (day === undefined) return null;
  let closes: Date;
  try {
    if (!DAY.test(day)) throw new RangeError(day);
    closes = closeOfBrasiliaDay(day);
  } catch {
    throw new Refusal(`--expires must be a day as YYYY-MM-DD: got "${day}".`);
  }
  if (closes.getTime() <= now.getTime()) throw new Refusal(`--expires ${day} is already over in Brasília (today is ${brasiliaDayOf(now)}).`);
  return closes;
}

function limitOf(typed: string | undefined): number | null {
  if (typed === undefined) return null;
  const limit = /^\d+$/.test(typed) ? Number(typed) : Number.NaN;
  if (!Number.isInteger(limit) || limit < 1 || limit > PLATFORM_COUPON_MAX_USES_MAX) throw new Refusal(`--max-uses must be a whole number from 1 to ${PLATFORM_COUPON_MAX_USES_MAX}: got "${typed}".`);
  return limit;
}

const lastDayOf = (expiresAt: Date | null): string => (expiresAt ? lastDayBefore(expiresAt) : 'no end');
const usesOf = (count: number, max: number | null): string => (max === null ? `${count} (no limit)` : `${count} of ${max}`);

async function create(args: readonly string[], db: CouponCommandDb, io: CommandOutput, now: Date): Promise<void> {
  const options = optionsOf(args, ['code', 'expires', 'max-uses']);
  const code = codeOf(options);
  const expiresAt = expiryOf(options.get('expires'), now);
  const maxRedemptions = limitOf(options.get('max-uses'));

  await db.platformCoupon.create({ data: { code, expiresAt, maxRedemptions } }).catch((error: unknown) => {
    throw isUniqueViolation(error) ? new Refusal(`A coupon with the code ${code} already exists: list them with "list".`) : error;
  });
  io.out(`Created ${code}: one free month for a page that never paid, once a page.`);
  io.out(`  Last day: ${expiresAt ? `${lastDayOf(expiresAt)} (Brasília)` : 'none, it never expires'}.`);
  io.out(`  Pages: ${maxRedemptions === null ? 'no limit' : `up to ${maxRedemptions}`}.`);
}

async function list(args: readonly string[], db: CouponCommandDb, io: CommandOutput, now: Date): Promise<void> {
  optionsOf(args, []);
  const coupons = await db.platformCoupon.findMany({ orderBy: [{ createdAt: 'desc' }, { code: 'asc' }] });
  if (coupons.length === 0) return io.out('No coupons yet.');

  const states = { BILLING_COUPON_DISABLED: 'disabled', BILLING_COUPON_EXPIRED: 'expired', BILLING_COUPON_EXHAUSTED: 'used up' } as const;
  const rows = coupons.map((coupon) => {
    const refusal = couponRefusalOf(coupon, now);
    return [coupon.code, refusal ? states[refusal] : 'active', lastDayOf(coupon.expiresAt), usesOf(coupon.redemptionCount, coupon.maxRedemptions), brasiliaDayOf(coupon.createdAt)];
  });
  const header = ['CODE', 'STATE', 'LAST DAY', 'PAGES', 'CREATED'];
  const table = [header, ...rows];
  const widths = header.map((_, column) => Math.max(...table.map((row) => (row[column] ?? '').length)));
  for (const row of table) io.out(row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join('  ').trimEnd());
}

async function disable(args: readonly string[], db: CouponCommandDb, io: CommandOutput, now: Date): Promise<void> {
  const code = codeOf(optionsOf(args, ['code']));
  const { count } = await db.platformCoupon.updateMany({ where: { code, disabledAt: null }, data: { disabledAt: now } });
  if (count === 1) return io.out(`Disabled ${code}: no page can use it from now on. The months it gave stay given.`);

  const coupon = await db.platformCoupon.findUnique({ where: { code }, select: { disabledAt: true } });
  if (!coupon) throw new Refusal(`No coupon has the code ${code}.`);
  io.out(`${code} was disabled already, on ${brasiliaDayOf(coupon.disabledAt ?? now)}.`);
}

/**
 * The command, given its arguments (`process.argv` past the script) and the database. Answers its exit
 * code: `COMMAND_EXIT`. Nothing it writes is a log line: it is the terminal of whoever runs it.
 */
export function runPlatformCouponCommand(argv: readonly string[], db: CouponCommandDb, io: CommandOutput, now = new Date()): Promise<number> {
  return runSubcommands(
    argv,
    USAGE,
    {
      create: (args) => create(args, db, io, now),
      list: (args) => list(args, db, io, now),
      disable: (args) => disable(args, db, io, now),
    },
    io,
  );
}
