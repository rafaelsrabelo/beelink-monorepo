// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { dayOfDateColumn } from './billing-dates.js';
import { toPlan } from './billing.mapper.js';
import { PLAN_ON_SALE } from './billing.constants.js';
import { noticeLinesOf } from './charging-notice.js';
import { LOCK_COLUMNS } from './page-lock.js';

/**
 * Pays the e-mail that tells a shopkeeper the day charging starts (`ChargingNotice`, BEELINK-297):
 * every minute, rows the command `charging-notice.js send` wrote — the claim, the lease and the retries
 * are `OutboxMailer`'s, so the API sends each once though the command ran apart from it. Who it is for,
 * the pages that lock and on what day, and what each cycle costs are read when it goes; a notice whose
 * pages no longer lock — exempted, paid, or gone since — is done without sending.
 *
 * Nothing of the shopkeeper is logged: a notice given up is named by its own id.
 */
@Injectable()
export class ChargingNoticeMailer extends OutboxMailer {
  protected readonly logger = new Logger(ChargingNoticeMailer.name);
  protected readonly table = 'charging_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const notice = await this.prisma.chargingNotice.findUnique({
      where: { id },
      select: {
        switchOnDay: true,
        user: { select: { name: true, email: true, stores: { select: { name: true, slug: true, subscription: { select: LOCK_COLUMNS } }, orderBy: [{ createdAt: 'asc' }, { slug: 'asc' }] } } },
      },
    });
    // Taken out since it was claimed, with its account: nobody to tell, and no row to mark.
    if (!notice) return false;

    const switchOnDay = dayOfDateColumn(notice.switchOnDay);
    const pages = noticeLinesOf(notice.user.stores, switchOnDay);
    if (pages.length === 0) {
      await this.prisma.chargingNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const plan = await this.prisma.plan.findUnique({ where: { slug: PLAN_ON_SALE } });
    const host = new URL(env.WEB_URL).host;
    const went =
      plan !== null &&
      (await this.mail.sendChargingNotice(notice.user.email, {
        name: notice.user.name,
        switchOnDay,
        cycles: toPlan(plan).cycles.map(({ months, priceCents }) => ({ months, priceCents })),
        pages: pages.map((page) => ({ name: page.name, address: `${host}/${page.slug}`, freeUntil: page.freeUntil, locksOn: page.locksOn })),
      }));
    if (went) {
      await this.prisma.chargingNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ noticeId: id }, 'Gave up on a charging notice');
    else await this.prisma.chargingNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
