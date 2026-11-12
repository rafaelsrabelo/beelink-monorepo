// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';

/**
 * Pays the e-mails an affiliate's sales owe (`AffiliateSaleNotice`, IMPULSEIA-106) — the claim, the
 * lease and the retries are `OutboxMailer`'s, on its own clock. What it says is read when it goes:
 * the order and its commission as they are then. To the e-mail the affiliate was invited at, which is
 * their account's.
 */
@Injectable()
export class AffiliateSaleMailer extends OutboxMailer {
  protected readonly logger = new Logger(AffiliateSaleMailer.name);
  protected readonly table = 'affiliate_sale_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const notice = await this.prisma.affiliateSaleNotice.findUnique({
      where: { id },
      select: {
        kind: true,
        order: {
          select: {
            number: true,
            customer: { select: { name: true } },
            store: { select: { name: true } },
            items: { orderBy: { position: 'asc' }, select: { productName: true, variantLabel: true, quantity: true } },
            affiliateCommission: { select: { commissionCents: true, zeroReason: true, affiliate: { select: { name: true, email: true } } } },
            affiliateEntries: { where: { kind: 'REVERSED' }, select: { id: true }, take: 1 },
          },
        },
      },
    });
    const order = notice?.order;
    const commission = order?.affiliateCommission;
    // An own purchase owes no e-mail, and an order with no commission has nothing to say: done.
    if (!notice || !order || !commission || commission.zeroReason !== null) {
      await this.prisma.affiliateSaleNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const content = {
      name: commission.affiliate.name,
      shopName: order.store.name,
      number: order.number,
      customerName: order.customer.name,
      commissionCents: commission.commissionCents,
    };
    const went =
      notice.kind === 'SALE'
        ? await this.mail.sendAffiliateSale(commission.affiliate.email, { ...content, items: order.items.map((item) => `${item.quantity}× ${item.productName}${item.variantLabel ? ` (${item.variantLabel})` : ''}`) })
        : // Taken back off the statement means it had fallen due: the next payment is short by it.
          await this.mail.sendAffiliateSaleCancelled(commission.affiliate.email, { ...content, wasAvailable: order.affiliateEntries.length > 0 });
    if (went) {
      await this.prisma.affiliateSaleNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ noticeId: id }, "Gave up on an affiliate's sale notice");
    else await this.prisma.affiliateSaleNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
