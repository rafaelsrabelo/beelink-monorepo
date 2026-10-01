// Nest
import type { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

// App
import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

/** How many a sweep claims at once, and how many times one is tried before it is given up. */
const BATCH = 20;
export const ATTEMPTS_MAX = 5;
/** How long a claimed row is this sweep's: far longer than a send may take (`MailService`'s timeouts). */
const LEASE_MS = 10 * 60_000;
/** Between sweeps: retries what failed, and sends what no one asked to send at once. */
const SWEEP_MS = 60_000;

/** The outboxes: tables of e-mails owed, each written by the transaction that owes one. */
export type OutboxTable = 'order_status_emails' | 'favorite_notices';

/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
function wallTimeOf(date: Date): string {
  return date.toISOString().replace('Z', '');
}

/** When a row that failed its `attempts`-th try is due again: after 1, 2, 4, 8 minutes. */
export function retryAtOf(attempts: number, now = Date.now()): Date {
  return new Date(now + 60_000 * 2 ** (attempts - 1));
}

/**
 * Pays an outbox's e-mails apart from what owed them: when asked (`dispatch`), and every minute for
 * what failed. A row is claimed before it is sent — `FOR UPDATE SKIP LOCKED`, and a lease far longer
 * than any send — so two sweeps, or two processes, never send it twice; a failed one waits 1, 2, 4,
 * 8 minutes, and after the fifth try it is given up. `sentAt` marks what is done: sent, or no longer
 * worth sending. Each outbox says what sending one row is.
 *
 * Every outbox table carries `attempts`, `nextAttemptAt`, `sentAt` and `createdAt` under those names.
 */
export abstract class OutboxMailer implements OnModuleInit, OnModuleDestroy {
  protected abstract readonly logger: Logger;
  protected abstract readonly table: OutboxTable;
  private timer: NodeJS.Timeout | null = null;
  /** One sweep at a time in this process; a call meanwhile asks for one more once it ends. */
  private sweeping = false;
  private again = false;

  protected constructor(protected readonly prisma: PrismaService) {}

  /** Sends one claimed row, on its `attempts`-th try, and answers whether it went. */
  protected abstract send(id: string, attempts: number): Promise<boolean>;

  onModuleInit(): void {
    this.timer = setInterval(() => this.dispatch(), SWEEP_MS);
    // A sweep in waiting is no reason for the process to stay up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Sends what is owed without anyone waiting on it: whatever asked has already answered. */
  dispatch(): void {
    if (this.sweeping) {
      this.again = true;
      return;
    }
    this.sweeping = true;
    void (async () => {
      try {
        do {
          this.again = false;
          await this.flush();
        } while (this.again);
      } catch (error) {
        this.logger.error({ err: error, outbox: this.table }, 'Could not send an outbox');
      } finally {
        this.sweeping = false;
      }
    })();
  }

  /** Claims what is owed and due, sends each, and answers how many went. */
  async flush(): Promise<number> {
    // This process's clock, not the database's: Prisma writes these columns from here, and a database
    // clock a moment behind would leave a row written just now not yet due.
    const now = new Date();
    const table = Prisma.raw(`"${this.table}"`);
    const claimed = await this.prisma.$queryRaw<{ id: string; attempts: number }[]>(Prisma.sql`
      UPDATE ${table}
      SET "attempts" = "attempts" + 1, "nextAttemptAt" = ${wallTimeOf(new Date(now.getTime() + LEASE_MS))}::timestamp
      WHERE "id" IN (
        SELECT "id" FROM ${table}
        WHERE "sentAt" IS NULL AND "attempts" < ${ATTEMPTS_MAX} AND "nextAttemptAt" <= ${wallTimeOf(now)}::timestamp
        ORDER BY "createdAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "attempts"`);

    let sent = 0;
    for (const row of claimed) if (await this.send(row.id, row.attempts)) sent += 1;
    return sent;
  }
}
