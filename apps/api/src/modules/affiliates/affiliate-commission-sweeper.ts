// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { brasiliaDayOf, dateColumnOf } from '../billing/billing-dates.js';
import { lockAffiliate, recountAffiliate } from './affiliate-ledger.js';

/** Between sweeps: a commission falls due within a minute of its day opening. */
const SWEEP_MS = 60_000;
/** How many affiliates one sweep settles; the rest wait a minute. */
const SWEEP_BATCH = 100;

/**
 * What the clock does to commissions (IMPULSEIA-106, addendum A of the epic), every minute: one
 * delivered and waiting whose due day has come, on Brasília's calendar, is owed — AVAILABLE, with a
 * RELEASED line on the affiliate's statement.
 *
 * Each affiliate's lock is taken before their commissions are read again, the order every change to
 * a commission takes them in, so two sweeps, or two processes, find the second time that nothing is
 * left to release, and a commission never falls due twice.
 */
@Injectable()
export class AffiliateCommissionSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AffiliateCommissionSweeper.name);
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // A suite sweeps when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), SWEEP_MS);
    // A sweep in waiting is no reason for the process to stay up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      await this.sweep(new Date());
    } catch (error) {
      this.logger.error({ err: error }, 'Could not sweep the affiliate commissions');
    } finally {
      this.sweeping = false;
    }
  }

  /** One sweep at `now`. Answers how many commissions fell due. */
  async sweep(now: Date): Promise<number> {
    const today = dateColumnOf(brasiliaDayOf(now));
    const due = await this.prisma.affiliateCommission.findMany({
      where: { status: 'PENDING', dueOn: { lte: today } },
      distinct: ['affiliateId'],
      select: { affiliateId: true },
      take: SWEEP_BATCH,
    });

    let count = 0;
    for (const { affiliateId } of due) {
      // One affiliate's failure is theirs alone: the others' commissions still fall due this minute.
      count += await this.releaseFor(affiliateId, today, now).catch((error: unknown) => {
        this.logger.error({ err: error, affiliateId }, "Could not release an affiliate's commissions");
        return 0;
      });
    }
    return count;
  }

  private releaseFor(affiliateId: string, today: Date, now: Date): Promise<number> {
    return this.prisma.$transaction(async (tx) => {
      await lockAffiliate(tx, affiliateId);
      const due = await tx.affiliateCommission.findMany({ where: { affiliateId, status: 'PENDING', dueOn: { lte: today } }, select: { orderId: true, storeId: true, commissionCents: true } });
      for (const commission of due) {
        await tx.affiliateCommission.update({ where: { orderId: commission.orderId }, data: { status: 'AVAILABLE', availableAt: now } });
        if (commission.commissionCents > 0) {
          await tx.affiliateEntry.create({ data: { storeId: commission.storeId, affiliateId, kind: 'RELEASED', amountCents: commission.commissionCents, orderId: commission.orderId, createdAt: now } });
        }
      }
      await recountAffiliate(tx, affiliateId);
      return due.length;
    });
  }
}
