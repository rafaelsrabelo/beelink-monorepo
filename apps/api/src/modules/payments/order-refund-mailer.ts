// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { isOnlineMethod } from './payment-terms.js';

/**
 * Pays the e-mail a refund owes its customer (`OrderRefundNotice`, BEELINK-208), apart from whatever
 * heard Asaas take it: right after that commits, and every minute for what failed — the claim, the
 * lease and the retries are `OutboxMailer`'s. Whether it was owed at all was decided when the refund
 * was written; what it says — on its way, or concluded — is read when it goes.
 */
@Injectable()
export class OrderRefundMailer extends OutboxMailer {
  protected readonly logger = new Logger(OrderRefundMailer.name);
  protected readonly table = 'order_refund_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const row = await this.prisma.orderRefundNotice.findUnique({
      where: { id },
      select: {
        refund: {
          select: {
            amountCents: true,
            status: true,
            providerId: true,
            order: {
              select: {
                number: true,
                paymentMethod: true,
                payments: { select: { providerId: true, amountCents: true, method: true } },
                strayPayments: { select: { providerId: true, amountCents: true, method: true } },
                store: { select: { name: true, slug: true, routeVocabulary: true } },
                customer: { select: { name: true, user: { select: { email: true, emailVerifiedAt: true } } } },
              },
            },
          },
        },
      },
    });
    const refund = row?.refund;
    const order = refund?.order;
    const user = order?.customer.user;
    const charge = order ? [...order.payments, ...order.strayPayments].find((each) => each.providerId === refund!.providerId) : undefined;
    // An account gone or unconfirmed since, or a refund Asaas cancelled since: nobody to tell, or
    // nothing true to say — done, and not tried again.
    if (!refund || !order || !user?.emailVerifiedAt || !charge || !isOnlineMethod(charge.method) || (refund.status !== 'PROCESSING' && refund.status !== 'DONE')) {
      await this.prisma.orderRefundNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const words = ROUTE_WORDS[order.store.routeVocabulary];
    const account = `${env.WEB_URL}/${order.store.slug}/${words.account}`;
    const went = await this.mail.sendPaymentRefunded(
      user.email,
      { name: order.customer.name, shopName: order.store.name, number: order.number, amountCents: refund.amountCents, paidCents: charge.amountCents, method: charge.method, done: refund.status === 'DONE' },
      `${account}/${words.accountTabs.orders}/${order.number}`,
      `${account}/${words.accountTabs.profile}#avisos`,
    );
    if (went) {
      await this.prisma.orderRefundNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ orderNumber: order.number }, 'Gave up on a payment refunded e-mail');
    else await this.prisma.orderRefundNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
