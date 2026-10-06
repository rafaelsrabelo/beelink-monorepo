// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { holdsMoney } from './payment-status.js';
import { isOnlineMethod } from './payment-terms.js';

/**
 * Pays the e-mail a payment approved owes its customer (`OrderPaidNotice`, BEELINK-207), apart from
 * whatever heard Asaas say so: right after that commits, and every minute for what failed — the
 * claim, the lease and the retries are `OutboxMailer`'s. Whether it was owed at all was decided
 * when the payment was written; what it says is read when it goes.
 */
@Injectable()
export class OrderPaidMailer extends OutboxMailer {
  protected readonly logger = new Logger(OrderPaidMailer.name);
  protected readonly table = 'order_paid_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const row = await this.prisma.orderPaidNotice.findUnique({
      where: { id },
      select: {
        order: {
          select: {
            number: true,
            status: true,
            payments: { select: { status: true, method: true, installments: true, amountCents: true } },
            store: { select: { name: true, slug: true, routeVocabulary: true } },
            customer: { select: { name: true, user: { select: { email: true, emailVerifiedAt: true } } } },
          },
        },
      },
    });
    const order = row?.order;
    const user = order?.customer.user;
    const paid = order?.payments.find((payment) => holdsMoney(payment.status));
    // An account gone or unconfirmed since, an order cancelled since, or money gone back whole since:
    // nobody to tell, or nothing true to say — done, and not tried again.
    if (!order || !user?.emailVerifiedAt || !paid || !isOnlineMethod(paid.method) || order.status === 'CANCELLED') {
      await this.prisma.orderPaidNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const words = ROUTE_WORDS[order.store.routeVocabulary];
    const account = `${env.WEB_URL}/${order.store.slug}/${words.account}`;
    const went = await this.mail.sendPaymentApproved(
      user.email,
      { name: order.customer.name, shopName: order.store.name, number: order.number, amountCents: paid.amountCents, method: paid.method, installments: paid.installments },
      `${account}/${words.accountTabs.orders}/${order.number}`,
      // Straight to the box that turns these off, in the shop's own words.
      `${account}/${words.accountTabs.profile}#avisos`,
    );
    if (went) {
      await this.prisma.orderPaidNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ orderNumber: order.number }, 'Gave up on a payment approved e-mail');
    else await this.prisma.orderPaidNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
