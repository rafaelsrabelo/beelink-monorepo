// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { dayOfDateColumn } from '../billing/billing-dates.js';

/**
 * Pays the e-mail a payout owes its affiliate (`AffiliatePayoutNotice`, IMPULSEIA-108) — the claim,
 * the lease and the retries are `OutboxMailer`'s. To the e-mail the affiliate was invited at, which is
 * their account's; what it says is the payout as it was recorded, which is never edited.
 */
@Injectable()
export class AffiliatePayoutMailer extends OutboxMailer {
  protected readonly logger = new Logger(AffiliatePayoutMailer.name);
  protected readonly table = 'affiliate_payout_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const notice = await this.prisma.affiliatePayoutNotice.findUnique({
      where: { id },
      select: {
        payout: {
          select: {
            amountCents: true,
            paidOn: true,
            method: true,
            note: true,
            store: { select: { name: true, slug: true } },
            affiliate: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!notice) return false;

    const { payout } = notice;
    const went = await this.mail.sendAffiliatePayout(
      payout.affiliate.email,
      { name: payout.affiliate.name, shopName: payout.store.name, amountCents: payout.amountCents, paidOn: dayOfDateColumn(payout.paidOn), method: payout.method, note: payout.note },
      payout.store.slug,
    );
    if (went) {
      await this.prisma.affiliatePayoutNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ noticeId: id }, "Gave up on an affiliate's payout notice");
    else await this.prisma.affiliatePayoutNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
