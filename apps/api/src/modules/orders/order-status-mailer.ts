// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { isNotified } from './order-status-email.js';
import { toCustomerDelivery } from './order-tracking.js';

/**
 * Pays the e-mails orders' moves owe (`OrderStatusEmail`), apart from the moves (BEELINK-151): right
 * after one commits, and every minute for what failed — the claim, the lease and the retries are
 * `OutboxMailer`'s.
 */
@Injectable()
export class OrderStatusMailer extends OutboxMailer {
  protected readonly logger = new Logger(OrderStatusMailer.name);
  protected readonly table = 'order_status_emails';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
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
            delivery: true,
            cashbackCredit: { select: { status: true, remainingCents: true, expiresAt: true } },
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
    // Read now, not at the move: a delivery undone since is told of without credit it no longer gave.
    const lot = order.cashbackCredit;
    const cashback = row.status === 'DELIVERED' && lot?.status === 'AVAILABLE' && lot.remainingCents > 0 ? { amountCents: lot.remainingCents, expiresAt: lot.expiresAt } : null;
    // Read when it goes, too (BEELINK-258): a code told between the move and the send rides along; one told later is read on the order.
    const shipment = row.status === 'OUT_FOR_DELIVERY' && order.delivery?.kind === 'CARRIER' ? toCustomerDelivery(order.delivery) : null;
    const account = `${env.WEB_URL}/${order.store.slug}/${words.account}`;
    const went = await this.mail.sendOrderStatus(
      user.email,
      { name: order.customer.name, shopName: order.store.name, number: order.number, status: row.status, pickup: order.fulfillment === 'PICKUP', cashback, shipment },
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
    else await this.prisma.orderStatusEmail.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
