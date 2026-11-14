// Nest
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateApplicationDecidedDetails, AffiliateApplicationStatus, ShopAffiliateApplication, ShopAffiliateApplicationPage } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { applicantTableId, inviteApplicantWithin, type Applicant } from './affiliate-applicant-invite.js';
import { liveAffiliatePageOf } from './affiliate-page-live.js';
import { applicationInclude, toShopAffiliateApplication } from './affiliate-page.mapper.js';
import { affiliatePageClosed } from './affiliate-page.service.js';
import { AFFILIATE_APPLICATIONS_PAGE_SIZE } from './affiliate-page.constants.js';
import { emailTaken, sendInvite, tableMissing, takenBy } from './affiliate-records.js';
import { UUID, affiliateError, isForeignKeyViolation, isUniqueViolation } from './affiliates.constants.js';
import type { AffiliateApplicationApprovalDto, AffiliateApplicationDto, AffiliateApplicationQueryDto } from './dto/affiliate-page.dto.js';

/** What an application keeps besides its e-mail. */
type ApplicationFields = Omit<Applicant, 'email'> & { extraQuestion: string | null; extraAnswer: string | null };

const applicationMissing = () => new NotFoundException(affiliateError('AFFILIATE_APPLICATION_NOT_FOUND', 'No such application in this shop'));
const decided = (status: AffiliateApplicationStatus) =>
  new ConflictException(affiliateError<AffiliateApplicationDecidedDetails>('AFFILIATE_APPLICATION_DECIDED', `The application is already ${status}`, { status }));

/**
 * The applications a shop's page takes (plan 2026-11-14--afiliados-candidatura-publica). A visitor's
 * form is answered the same whatever became of it — kept, merged into the one waiting, ignored for an
 * e-mail already the shop's affiliate or a robot's — so it tells nobody who is there. An approval is
 * the shop's own invite: the affiliate and the application's decision in one transaction, the e-mail
 * after it.
 */
@Injectable()
export class AffiliateApplicationsService {
  private readonly logger = new Logger(AffiliateApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly mail: MailService,
  ) {}

  async submit(storeSlug: string, dto: AffiliateApplicationDto): Promise<void> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const live = await liveAffiliatePageOf(this.prisma, storeId, env.AFFILIATE_LINKS_ENABLED);
    if (!live) throw affiliatePageClosed();
    // The field no person sees: a robot filled it.
    if (dto.website) return;
    if (await takenBy(this.prisma, storeId, { email: dto.email }, null)) return;

    const asked = live.content.askExtraQuestion;
    const fields: ApplicationFields = { name: dto.name, phone: dto.phone, extraQuestion: asked ? live.content.extraQuestion : null, extraAnswer: asked ? dto.extraAnswer : null };
    if (live.approval === 'AUTO') return this.inviteAtOnce(storeId, dto.email, fields, live.tableId);
    await this.keepPending(storeId, dto.email, fields);
  }

  async list(storeSlug: string, userId: string, query: AffiliateApplicationQueryDto): Promise<ShopAffiliateApplicationPage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? AFFILIATE_APPLICATIONS_PAGE_SIZE;
    const where = { storeId, ...(query.status ? { status: query.status } : {}) };
    const [rows, total, pendingCount] = await Promise.all([
      this.prisma.affiliateApplication.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize, include: applicationInclude }),
      this.prisma.affiliateApplication.count({ where }),
      this.prisma.affiliateApplication.count({ where: { storeId, status: 'PENDING' } }),
    ]);
    return { applications: rows.map(toShopAffiliateApplication), total, page, pageSize, pendingCount };
  }

  /** The table named, else the one the page announces, else the default one. */
  async approve(storeSlug: string, userId: string, applicationId: string, dto: AffiliateApplicationApprovalDto): Promise<ShopAffiliateApplication> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const application = await this.applicationOf(storeId, applicationId);
    if (application.status !== 'PENDING') throw decided(application.status);
    const page = await this.prisma.affiliatePage.findUnique({ where: { storeId }, select: { tableId: true } });
    const tableId = await applicantTableId(this.prisma, storeId, dto.tableId ?? page?.tableId ?? null);
    if (await takenBy(this.prisma, storeId, { email: application.email }, null)) throw emailTaken();

    let token: string;
    try {
      token = await this.prisma.$transaction(async (tx) => {
        const invited = await inviteApplicantWithin(tx, storeId, application, tableId);
        const claimed = await tx.affiliateApplication.updateMany({
          where: { id: application.id, status: 'PENDING' },
          data: { status: 'APPROVED', decidedAt: new Date(), affiliateId: invited.affiliateId },
        });
        if (claimed.count === 0) {
          const now = await tx.affiliateApplication.findUnique({ where: { id: application.id }, select: { status: true } });
          throw now ? decided(now.status) : applicationMissing();
        }
        return invited.token;
      });
    } catch (error) {
      // Invited by the shop's own form in between, or the table deleted since it was read.
      if (isUniqueViolation(error)) throw emailTaken();
      if (isForeignKeyViolation(error)) throw tableMissing();
      throw error;
    }

    await sendInvite(this.prisma, this.mail, storeId, application, token);
    return toShopAffiliateApplication(await this.prisma.affiliateApplication.findUniqueOrThrow({ where: { id: application.id }, include: applicationInclude }));
  }

  /** Turned down, and the person is not told. */
  async refuse(storeSlug: string, userId: string, applicationId: string): Promise<ShopAffiliateApplication> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const application = await this.applicationOf(storeId, applicationId);
    const moved = await this.prisma.affiliateApplication.updateMany({ where: { id: application.id, status: 'PENDING' }, data: { status: 'REFUSED', decidedAt: new Date() } });
    const row = await this.prisma.affiliateApplication.findUnique({ where: { id: application.id }, include: applicationInclude });
    if (!row) throw applicationMissing();
    if (moved.count === 0) throw decided(row.status);
    return toShopAffiliateApplication(row);
  }

  private async applicationOf(storeId: string, applicationId: string) {
    const row = UUID.test(applicationId) ? await this.prisma.affiliateApplication.findFirst({ where: { id: applicationId, storeId } }) : null;
    if (!row) throw applicationMissing();
    return row;
  }

  /** One application waiting per e-mail: a second form replaces what the first said. */
  private async keepPending(storeId: string, email: string, fields: ApplicationFields): Promise<void> {
    const merged = await this.prisma.affiliateApplication.updateMany({ where: { storeId, email, status: 'PENDING' }, data: fields });
    if (merged.count > 0) return;
    try {
      await this.prisma.affiliateApplication.create({ data: { storeId, email, ...fields } });
    } catch (error) {
      // The same e-mail's form twice at once: the second is the first's update.
      if (!isUniqueViolation(error)) throw error;
      await this.prisma.affiliateApplication.updateMany({ where: { storeId, email, status: 'PENDING' }, data: fields });
    }
  }

  /**
   * "Convidar na hora": the application is approved as it arrives, on the table the page announces. An
   * application already waiting from before is the one approved. The visitor is answered as any other
   * — an e-mail that did not go is the shop's to send again, from the affiliate's record.
   */
  private async inviteAtOnce(storeId: string, email: string, fields: ApplicationFields, pageTableId: string | null): Promise<void> {
    const tableId = await applicantTableId(this.prisma, storeId, pageTableId);
    let token: string;
    try {
      token = await this.prisma.$transaction(async (tx) => {
        const invited = await inviteApplicantWithin(tx, storeId, { name: fields.name, email, phone: fields.phone }, tableId);
        const decision = { ...fields, status: 'APPROVED' as const, decidedAt: new Date(), affiliateId: invited.affiliateId };
        const waiting = await tx.affiliateApplication.updateMany({ where: { storeId, email, status: 'PENDING' }, data: decision });
        if (waiting.count === 0) await tx.affiliateApplication.create({ data: { storeId, email, ...decision } });
        return invited.token;
      });
    } catch (error) {
      // Invited in between, by the shop or by a twin of this form: nothing more to do.
      if (isUniqueViolation(error)) return;
      throw error;
    }

    try {
      await sendInvite(this.prisma, this.mail, storeId, { name: fields.name, email }, token);
    } catch (error) {
      this.logger.warn({ err: error, storeId }, "An application's invite was made and its e-mail did not go: the shop can send it again");
    }
  }
}
