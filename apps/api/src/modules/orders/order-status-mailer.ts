// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { isNotified } from './order-status-email.js';

/** How many a sweep claims at once, and how many times one is tried before it is given up. */
const BATCH = 20;
export const ATTEMPTS_MAX = 5;
/** How long a claimed row is this sweep's: far longer than a send may take (`MailService`'s timeouts). */
const LEASE_MS = 10 * 60_000;
/** Between sweeps: the one after a move sends at once; this one retries what failed. */
const SWEEP_MS = 60_000;

/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
function wallTimeOf(date: Date): string {
  return date.toISOString().replace('Z', '');
}

/**
 * Pays the e-mails orders' moves owe (`OrderStatusEmail`), apart from the moves (BEELINK-151): right
 * after one commits, and every minute for what failed. A row is claimed before it is sent — `FOR
 * UPDATE SKIP LOCKED`, and a lease far longer than any send — so two sweeps, or two processes, never
 * send it twice; a failed one waits 1, 2, 4, 8 minutes, and after the fifth try it is given up.
 * `sentAt` marks what is done: sent, or no longer worth sending.
 */
@Injectable()
export class OrderStatusMailer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderStatusMailer.name);
  private timer: NodeJS.Timeout | null = null;
  /** One sweep at a time in this process; a call meanwhile asks for one more once it ends. */
  private sweeping = false;
  private again = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => this.dispatch(), SWEEP_MS);
    // A sweep in waiting is no reason for the process to stay up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** Sends what is owed without anyone waiting on it: the move that asked has already answered. */
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
        this.logger.error({ err: error }, 'Could not send the order e-mails');
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
    const claimed = await this.prisma.$queryRaw<{ id: string; attempts: number }[]>`
      UPDATE "order_status_emails"
      SET "attempts" = "attempts" + 1, "nextAttemptAt" = ${wallTimeOf(new Date(now.getTime() + LEASE_MS))}::timestamp
      WHERE "id" IN (
        SELECT "id" FROM "order_status_emails"
        WHERE "sentAt" IS NULL AND "attempts" < ${ATTEMPTS_MAX} AND "nextAttemptAt" <= ${wallTimeOf(now)}::timestamp
        ORDER BY "createdAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "attempts"`;

    let sent = 0;
    for (const row of claimed) if (await this.send(row.id, row.attempts)) sent += 1;
    return sent;
  }

  private async send(id: string, attempts: number): Promise<boolean> {
    const row = await this.prisma.orderStatusEmail.findUnique({
      where: { id },
      select: {
        orderId: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            number: true,
            fulfillment: true,
            store: { select: { name: true, slug: true, routeVocabulary: true } },
            customer: { select: { name: true, user: { select: { email: true, emailVerifiedAt: true } } } },
          },
        },
      },
    });
    const user = row?.order.customer.user;
    // An account gone or unconfirmed since the move, or a later move of the same order already told:
    // nobody to tell, or news gone stale — done, and not tried again.
    const newer = row ? await this.prisma.orderStatusEmail.count({ where: { orderId: row.orderId, createdAt: { gt: row.createdAt }, sentAt: { not: null } } }) : 0;
    if (!row || !user?.emailVerifiedAt || !isNotified(row.status) || newer > 0) {
      await this.prisma.orderStatusEmail.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const { order } = row;
    const words = ROUTE_WORDS[order.store.routeVocabulary];
    const account = `${env.WEB_URL}/${order.store.slug}/${words.account}`;
    const went = await this.mail.sendOrderStatus(
      user.email,
      { name: order.customer.name, shopName: order.store.name, number: order.number, status: row.status, pickup: order.fulfillment === 'PICKUP' },
      `${account}/${words.accountTabs.orders}/${order.number}`,
      // Straight to the box that turns these off, in the shop's own words.
      `${account}/${words.accountTabs.profile}#avisos`,
    );
    if (went) {
      await this.prisma.orderStatusEmail.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    // Not sent: tried again after 1, 2, 4, 8 minutes — the lease given back early — or given up.
    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ orderNumber: order.number, status: row.status }, 'Gave up on an order e-mail');
    else await this.prisma.orderStatusEmail.update({ where: { id }, data: { nextAttemptAt: new Date(Date.now() + 60_000 * 2 ** (attempts - 1)) } });
    return false;
  }
}
