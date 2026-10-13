// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { courierCityNameOf } from './couriers.constants.js';

/**
 * Pays the e-mail an application is owed (`CourierApplicationNotice`, BEELINK-326): right after the
 * application commits, and every minute for what failed — the claim, the lease and the retries are
 * `OutboxMailer`'s. Who it is for and what it says are read from the application when it goes.
 *
 * An address is told once, by a rule that does not depend on who sent first: of the notices whose
 * applications share an e-mail, only the oldest is ever sent, and any other is done without sending
 * — so two sweeps at once cannot send two. The service and the migration already write one notice an
 * address; this holds for a row written any other way.
 *
 * An application kept with no address (BEELINK-328) is owed nothing, and the service writes it no
 * notice; one that has a notice all the same is done without sending, for there is nowhere to send.
 *
 * Nothing of the application is logged: a notice given up is named by its own id.
 */
@Injectable()
export class CourierApplicationMailer extends OutboxMailer {
  protected readonly logger = new Logger(CourierApplicationMailer.name);
  protected readonly table = 'courier_application_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const notice = await this.prisma.courierApplicationNotice.findUnique({
      where: { id },
      select: { createdAt: true, application: { select: { name: true, email: true, city: true } } },
    });
    // Taken out since it was claimed, with its application: nobody to tell, and no row to mark.
    if (!notice) return false;

    const { name, email, city } = notice.application;
    // Compared as kept, like the list itself (BEELINK-325): the DTO keeps an address trimmed and lower-cased.
    // With no address there is none to compare: asked for one, the list would answer with every application that has none.
    const older = email
      ? await this.prisma.courierApplicationNotice.findFirst({
          where: {
            application: { email },
            OR: [{ createdAt: { lt: notice.createdAt } }, { createdAt: notice.createdAt, id: { lt: id } }],
          },
          select: { id: true },
        })
      : null;
    if (!email || older) {
      await this.prisma.courierApplicationNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const went = await this.mail.sendCourierApplicationReceived(email, { name, city: courierCityNameOf(city) });
    if (went) {
      await this.prisma.courierApplicationNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ noticeId: id }, 'Gave up on a courier application notice');
    else await this.prisma.courierApplicationNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}
