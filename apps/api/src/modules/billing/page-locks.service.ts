// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { PageLockReason } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { brasiliaDayOf, closeOfBrasiliaDay } from './billing-dates.js';
import { GRACE_DAYS } from './billing.constants.js';
import { LOCK_COLUMNS, lockChangesAt, lockOf } from './page-lock.js';
import { PlatformAsaas } from './platform-asaas.client.js';

/** A page as the lock sees it at an instant. */
export interface LockedPage {
  ownerId: string;
  /** Why it is locked, or null while it is open. */
  lock: PageLockReason | null;
  /** Past this, `lock` may no longer hold by the clock alone (`lockChangesAt`); null when no clock moves it. */
  changesAt: Date | null;
}

/** How many pages one pass of the clock moved, by what it wrote. */
export interface ClockMoves {
  trialsExpired: number;
  periodsLapsed: number;
  gracesWritten: number;
  suspended: number;
}

const GRACE_MS = GRACE_DAYS * 86_400_000;
/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
const wallTimeOf = (date: Date) => date.toISOString().replace('Z', '');

/**
 * Where a page stands for its lock (BEELINK-223): whether this deployment locks at all, how one page
 * stands now — read by the guard on every route of a page — and the billing routine's clock, which
 * writes what the clock alone moved. The rule itself is `page-lock.ts`; nothing here decides it again.
 */
@Injectable()
export class PageLocks {
  private readonly logger = new Logger(PageLocks.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: PlatformAsaas,
  ) {}

  /**
   * Whether pages lock in this deployment: it charges, and a page has somewhere to pay — the key of
   * bee-link's own Asaas account. Without it the panel says paying is unavailable, and a page locked
   * there could not get out. Off, nothing here asks the database anything.
   */
  get engaged(): boolean {
    return env.BILLING_ENFORCED && this.asaas.configured;
  }

  /** How the page at `slug` stands for its lock at `now`; null for a slug no page holds. A page with no subscription — from before there were any — is open. */
  async pageOf(slug: string, now: Date): Promise<LockedPage | null> {
    const page = await this.prisma.store.findUnique({ where: { slug }, select: { ownerId: true, subscription: { select: LOCK_COLUMNS } } });
    if (!page) return null;
    const row = page.subscription;
    return { ownerId: page.ownerId, lock: row ? lockOf(row, now) : null, changesAt: row ? lockChangesAt(row, now) : null };
  }

  /**
   * One pass of the clock, for the billing routine: what the clock alone moved, written as it is
   * already read (`statusAt`) — a trial that ended, a paid period that ran out (past due, its grace
   * written, or suspended at once when that ran out too), a page found past due with no grace written,
   * a grace that ran out. The lock does not wait for it: it is for whoever asks by standing.
   *
   * Each step is one statement whose condition is what makes it due, and nothing else is assumed:
   * Postgres checks that condition again once a row it waited on is free, so a payment the door
   * (`SubscriptionSync`) wrote meanwhile takes the row out of the step instead of being undone. An
   * exempt page is never among them. A grace written is never moved earlier.
   */
  async settle(now: Date): Promise<ClockMoves> {
    if (!this.engaged) return { trialsExpired: 0, periodsLapsed: 0, gracesWritten: 0, suspended: 0 };

    const trialsExpired = await this.prisma.storeSubscription.updateMany({ where: { status: 'TRIALING', trialEndsAt: { lte: now } }, data: { status: 'TRIAL_EXPIRED' } });

    const grace = `${GRACE_DAYS} days`;
    const at = wallTimeOf(now);
    const periodsLapsed = await this.prisma.$executeRaw`
      UPDATE "store_subscriptions"
      SET "status" = (CASE WHEN GREATEST("graceEndsAt", "currentPeriodEndsAt" + ${grace}::interval) <= ${at}::timestamp THEN 'SUSPENDED' ELSE 'PAST_DUE' END)::"SubscriptionStatus",
          "graceEndsAt" = GREATEST("graceEndsAt", "currentPeriodEndsAt" + ${grace}::interval),
          "updatedAt" = ${at}::timestamp
      WHERE "status" = 'ACTIVE' AND "currentPeriodEndsAt" <= ${at}::timestamp`;

    // With no period to count from, the grace runs from the day the page is found past due: today.
    const foundToday = wallTimeOf(new Date(closeOfBrasiliaDay(brasiliaDayOf(now)).getTime() + GRACE_MS));
    const gracesWritten = await this.prisma.$executeRaw`
      UPDATE "store_subscriptions"
      SET "graceEndsAt" = COALESCE("currentPeriodEndsAt" + ${grace}::interval, ${foundToday}::timestamp),
          "updatedAt" = ${at}::timestamp
      WHERE "status" = 'PAST_DUE' AND "graceEndsAt" IS NULL`;

    const suspended = await this.prisma.storeSubscription.updateMany({ where: { status: 'PAST_DUE', graceEndsAt: { lte: now } }, data: { status: 'SUSPENDED' } });

    const moves = { trialsExpired: trialsExpired.count, periodsLapsed, gracesWritten, suspended: suspended.count };
    if (Object.values(moves).some((count) => count > 0)) this.logger.log(moves, "The clock moved pages' standing");
    return moves;
  }
}
