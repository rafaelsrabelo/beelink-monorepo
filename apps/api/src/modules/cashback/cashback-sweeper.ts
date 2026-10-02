// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CashbackExpiryMailer } from './cashback-expiry-mailer.js';
import { lockLedger, recountCashback } from './cashback-ledger.js';
import { CASHBACK_EXPIRY_NOTICE_DAYS, CASHBACK_SWEEP_BATCH, DAY_MS } from './cashback.constants.js';

/** Between sweeps: credit expires within a minute of its time. */
const SWEEP_MS = 60_000;

/**
 * What the clock does to credit (BEELINK-241), every minute: a lot past its expiry leaves the balance
 * with an EXPIRE line, and a lot a week from its expiry owes its customer an e-mail. A shop whose rule
 * has no validity gives lots that never expire, and never reach either.
 *
 * The expiry takes each customer's locks in the order every change to credit takes them — the shop's
 * row, then the customer's — and reads the lots again under them: two sweeps, or two processes, find
 * the second time that nothing is left to expire, so a lot never expires twice. Locking the lots
 * first would be the other order, and a deadlock with an order spending them.
 */
@Injectable()
export class CashbackSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CashbackSweeper.name);
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: CashbackExpiryMailer,
  ) {}

  onModuleInit(): void {
    // A suite sweeps when it means to, at the instant it names: the real clock ticking in the middle
    // of one would expire credit a test had just set up as expired.
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
      this.logger.error({ err: error }, 'Could not sweep the cashback');
    } finally {
      this.sweeping = false;
    }
  }

  /** One sweep at `now`: what expired, and what owes a notice. Answers how many lots expired. */
  async sweep(now: Date): Promise<number> {
    const expired = await this.expire(now);
    if ((await this.owe(now)) > 0) this.mailer.dispatch();
    return expired;
  }

  private async expire(now: Date): Promise<number> {
    const due = await this.prisma.cashbackCredit.findMany({
      where: { status: 'AVAILABLE', remainingCents: { gt: 0 }, expiresAt: { lte: now } },
      distinct: ['customerId'],
      select: { storeId: true, customerId: true },
      take: CASHBACK_SWEEP_BATCH,
    });

    let count = 0;
    for (const { storeId, customerId } of due) {
      count += await this.prisma.$transaction(async (tx) => {
        if (!(await lockLedger(tx, storeId, customerId))) return 0;
        const lots = await tx.cashbackCredit.findMany({ where: { customerId, status: 'AVAILABLE', remainingCents: { gt: 0 }, expiresAt: { lte: now } }, select: { id: true, remainingCents: true } });
        for (const lot of lots) {
          await tx.cashbackCredit.update({ where: { id: lot.id }, data: { status: 'EXPIRED', remainingCents: 0 } });
          await tx.cashbackEntry.create({ data: { storeId, customerId, kind: 'EXPIRE', amountCents: -lot.remainingCents, creditId: lot.id, createdAt: now } });
        }
        await recountCashback(tx, customerId);
        return lots.length;
      });
    }
    return count;
  }

  /** Lots inside the week before their expiry with no notice yet get one; the unique index keeps it to one per lot. */
  private async owe(now: Date): Promise<number> {
    const soon = new Date(now.getTime() + CASHBACK_EXPIRY_NOTICE_DAYS * DAY_MS);
    const lots = await this.prisma.cashbackCredit.findMany({
      where: { status: 'AVAILABLE', remainingCents: { gt: 0 }, expiresAt: { gt: now, lte: soon }, expiryNotice: null },
      select: { id: true },
      take: CASHBACK_SWEEP_BATCH,
    });
    if (lots.length === 0) return 0;
    const { count } = await this.prisma.cashbackExpiryNotice.createMany({ data: lots.map((lot) => ({ creditId: lot.id })), skipDuplicates: true });
    return count;
  }
}
