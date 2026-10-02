// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';

/**
 * Pays the e-mails expiring credit owes (`CashbackExpiryNotice`, BEELINK-241) — the claim, the lease
 * and the retries are `OutboxMailer`'s. What it says is read when it goes: the lot as it is then.
 */
@Injectable()
export class CashbackExpiryMailer extends OutboxMailer {
  protected readonly logger = new Logger(CashbackExpiryMailer.name);
  protected readonly table = 'cashback_expiry_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const row = await this.prisma.cashbackExpiryNotice.findUnique({
      where: { id },
      select: {
        credit: {
          select: {
            status: true,
            remainingCents: true,
            expiresAt: true,
            customer: { select: { name: true, notifyCashback: true, user: { select: { email: true, emailVerifiedAt: true } } } },
            store: { select: { name: true, slug: true, routeVocabulary: true } },
          },
        },
      },
    });
    const credit = row?.credit;
    const user = credit?.customer.user;
    // Spent, taken back or expired since, the notice turned off, or an account gone or unconfirmed:
    // nothing true to say, or nobody to say it to — done, and not tried again.
    const live = credit?.status === 'AVAILABLE' && credit.remainingCents > 0 && credit.expiresAt !== null && credit.expiresAt > new Date();
    if (!credit || !live || !credit.expiresAt || !credit.customer.notifyCashback || !user?.emailVerifiedAt) {
      await this.prisma.cashbackExpiryNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const { store } = credit;
    const words = ROUTE_WORDS[store.routeVocabulary];
    const home = `${env.WEB_URL}/${store.slug}`;
    const went = await this.mail.sendCashbackExpiring(
      user.email,
      { name: credit.customer.name, shopName: store.name, amountCents: credit.remainingCents, expiresAt: credit.expiresAt },
      home,
      // Straight to the box that turns these off, in the shop's own words.
      `${home}/${words.account}/${words.accountTabs.profile}#avisos`,
    );
    if (went) {
      await this.prisma.cashbackExpiryNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ noticeId: id }, 'Gave up on a cashback expiry notice');
    else await this.prisma.cashbackExpiryNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
