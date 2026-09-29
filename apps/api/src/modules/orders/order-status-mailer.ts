// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { isNotified } from './order-status-email.js';

/** How many a sweep claims at once, and how many times one is tried before it is left. */
const BATCH = 20;
const ATTEMPTS_MAX = 5;
/** Between sweeps: the one after a move sends at once; this one retries what failed. */
const SWEEP_MS = 60_000;

/**
 * Pays the e-mails orders' moves owe (`OrderStatusEmail`), apart from the moves (BEELINK-151): right
 * after one commits, and every minute for what failed, each try pushing the next one further off —
 * 1, 2, 4, 8 minutes — until the fifth. A row is claimed before it is sent (`FOR UPDATE SKIP LOCKED`),
 * so two sweeps, or two processes, never send one twice; `sentAt` marks what went.
 */
@Injectable()
export class OrderStatusMailer implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderStatusMailer.name);
  private timer: NodeJS.Timeout | null = null;

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
    this.flush().catch((error: unknown) => this.logger.error({ err: error }, 'Could not send the order e-mails'));
  }

  /** Claims what is owed and due, sends each, and answers how many went. */
  async flush(): Promise<number> {
    // This process's clock, not the database's: Prisma writes these columns from here, as UTC wall
    // time, and a database clock a moment behind would leave a row written just now not yet due.
    const now = new Date().toISOString().replace('Z', '');
    const claimed = await this.prisma.$queryRaw<{ id: string }[]>`
      UPDATE "order_status_emails"
      SET "attempts" = "attempts" + 1,
          "nextAttemptAt" = ${now}::timestamp + interval '1 minute' * power(2, "attempts")
      WHERE "id" IN (
        SELECT "id" FROM "order_status_emails"
        WHERE "sentAt" IS NULL AND "nextAttemptAt" <= ${now}::timestamp AND "attempts" < ${ATTEMPTS_MAX}
        ORDER BY "createdAt"
        LIMIT ${BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id"`;

    let sent = 0;
    for (const { id } of claimed) if (await this.send(id)) sent += 1;
    return sent;
  }

  private async send(id: string): Promise<boolean> {
    const row = await this.prisma.orderStatusEmail.findUnique({
      where: { id },
      select: {
        status: true,
        order: {
          select: {
            number: true,
            fulfillment: true,
            store: { select: { name: true, slug: true, routeVocabulary: true } },
            customer: { select: { name: true, user: { select: { email: true } } } },
          },
        },
      },
    });
    const email = row?.order.customer.user?.email;
    // An account deleted since the move: nobody left to tell, and nothing to try again.
    if (!row || !email || !isNotified(row.status)) {
      await this.prisma.orderStatusEmail.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const { order } = row;
    const words = ROUTE_WORDS[order.store.routeVocabulary];
    const url = `${env.WEB_URL}/${order.store.slug}/${words.account}/${words.accountTabs.orders}/${order.number}`;
    const went = await this.mail.sendOrderStatus(
      email,
      { name: order.customer.name, shopName: order.store.name, number: order.number, status: row.status, pickup: order.fulfillment === 'PICKUP' },
      url,
    );
    if (went) await this.prisma.orderStatusEmail.update({ where: { id }, data: { sentAt: new Date() } });
    return went;
  }
}
