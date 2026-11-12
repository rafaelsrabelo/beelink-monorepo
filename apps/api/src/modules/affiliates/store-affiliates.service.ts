// Nest
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliateStatus, AffiliateStatusDetails, ShopAffiliate, ShopAffiliatePage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { freshInvite } from './affiliate-invites.js';
import { openProgram } from './affiliate-program.js';
import {
  AFFILIATE_INVITE_RESEND_FLOOR_MS,
  AFFILIATE_INVITE_TTL_MS,
  AFFILIATES_PAGE_SIZE,
  UUID,
  affiliateError,
  isForeignKeyViolation,
  isUniqueViolation,
} from './affiliates.constants.js';
import { affiliateInclude, toShopAffiliate, toShopAffiliateSummary } from './affiliates.mapper.js';
import type { AffiliateListQueryDto, CreateAffiliateDto, UpdateAffiliateDto } from './dto/affiliate.dto.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const tableMissing = () => new NotFoundException(affiliateError('COMMISSION_TABLE_NOT_FOUND', 'No such commission table in this shop'));
const affiliateMissing = () => new NotFoundException(affiliateError('AFFILIATE_NOT_FOUND', 'No such affiliate in this shop'));
const statusRefused = (status: AffiliateStatus) =>
  new ConflictException(affiliateError<AffiliateStatusDetails>('AFFILIATE_STATUS_INVALID', `Not allowed while ${status}`, { status }));

/**
 * A shop's affiliates as its owner keeps them (IMPULSEIA-103): invited by e-mail, then paused,
 * resumed or ended — for good. Every move is one conditional write, so two clicks at once never
 * move an affiliate twice; what the condition refused is read after, to say why.
 */
@Injectable()
export class StoreAffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly mail: MailService,
  ) {}

  /** `INVITED`, and the invite e-mailed. The programme need not be on: a list can be made before it opens. */
  async create(storeSlug: string, userId: string, dto: CreateAffiliateDto): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await openProgram(this.prisma, storeId);
    await this.tableOf(storeId, dto.tableId);

    const invite = freshInvite(new Date());
    let row;
    try {
      row = await this.prisma.affiliate.create({
        data: { storeId, name: dto.name, email: dto.email, phone: dto.phone ?? null, note: dto.note ?? null, tableId: dto.tableId, invite: { create: invite.columns } },
        include: affiliateInclude,
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(affiliateError('AFFILIATE_EMAIL_TAKEN', 'Another affiliate of this shop has that e-mail'));
      // The table went in between: it was this shop's when read.
      if (isForeignKeyViolation(error)) throw tableMissing();
      throw error;
    }

    await this.sendInvite(storeId, row.name, row.email, invite.token);
    return toShopAffiliate(row);
  }

  async list(storeSlug: string, userId: string, query: AffiliateListQueryDto): Promise<ShopAffiliatePage> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? AFFILIATES_PAGE_SIZE;
    const where: Prisma.AffiliateWhereInput = { storeId, ...(query.status ? { status: query.status } : {}) };

    const [rows, total] = await Promise.all([
      this.prisma.affiliate.findMany({ where, include: affiliateInclude, orderBy: [{ invitedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.affiliate.count({ where }),
    ]);
    return { affiliates: rows.map(toShopAffiliateSummary), total, page, pageSize };
  }

  async read(storeSlug: string, userId: string, affiliateId: string): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return toShopAffiliate(await this.affiliateOf(storeId, affiliateId));
  }

  /** The table and the note. Another table applies to orders placed from then on. */
  async update(storeSlug: string, userId: string, affiliateId: string, dto: UpdateAffiliateDto): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.affiliateOf(storeId, affiliateId);
    if (dto.tableId !== undefined) await this.tableOf(storeId, dto.tableId);

    try {
      const row = await this.prisma.affiliate.update({
        where: { id: current.id },
        data: { ...(dto.tableId !== undefined ? { tableId: dto.tableId } : {}), ...(dto.note !== undefined ? { note: dto.note } : {}) },
        include: affiliateInclude,
      });
      return toShopAffiliate(row);
    } catch (error) {
      if (isForeignKeyViolation(error)) throw tableMissing();
      throw error;
    }
  }

  /** A new link, working a week from now; the one before stops. At most once a minute. */
  async resend(storeSlug: string, userId: string, affiliateId: string): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.affiliateOf(storeId, affiliateId);
    if (current.status !== 'INVITED') throw statusRefused(current.status);

    const now = new Date();
    const invite = freshInvite(now);
    // The floor is the write's own condition: two sends at once, one goes.
    const written = await this.prisma.affiliateInvite.updateMany({
      where: { affiliateId: current.id, usedAt: null, sentAt: { lte: new Date(now.getTime() - AFFILIATE_INVITE_RESEND_FLOOR_MS) }, affiliate: { status: 'INVITED' } },
      data: invite.columns,
    });
    if (written.count === 0) {
      const again = await this.affiliateOf(storeId, affiliateId);
      if (again.status !== 'INVITED') throw statusRefused(again.status);
      throw new ConflictException(affiliateError('AFFILIATE_INVITE_RECENTLY_SENT', 'The invite went out less than a minute ago'));
    }

    await this.sendInvite(storeId, current.name, current.email, invite.token);
    return toShopAffiliate(await this.affiliateOf(storeId, affiliateId));
  }

  /** An invite nobody accepted leaves nothing behind: the row goes, and the e-mail may be invited again. */
  async cancel(storeSlug: string, userId: string, affiliateId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.affiliateOf(storeId, affiliateId);
    const removed = await this.prisma.affiliate.deleteMany({ where: { id: current.id, status: 'INVITED' } });
    if (removed.count === 0) throw statusRefused((await this.affiliateOf(storeId, affiliateId)).status);
  }

  /** No new order is credited; those already credited run their course. */
  pause(storeSlug: string, userId: string, affiliateId: string): Promise<ShopAffiliate> {
    return this.move(storeSlug, userId, affiliateId, ['ACTIVE'], { status: 'PAUSED' });
  }

  resume(storeSlug: string, userId: string, affiliateId: string): Promise<ShopAffiliate> {
    return this.move(storeSlug, userId, affiliateId, ['PAUSED'], { status: 'ACTIVE' });
  }

  /** For good. Their history stays theirs to read, and their `/name` stays theirs: a link of theirs credits nobody. */
  end(storeSlug: string, userId: string, affiliateId: string): Promise<ShopAffiliate> {
    return this.move(storeSlug, userId, affiliateId, ['ACTIVE', 'PAUSED'], { status: 'ENDED', endedAt: new Date() });
  }

  private async move(storeSlug: string, userId: string, affiliateId: string, from: AffiliateStatus[], data: Prisma.AffiliateUpdateManyMutationInput): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.affiliateOf(storeId, affiliateId);
    const moved = await this.prisma.affiliate.updateMany({ where: { id: current.id, status: { in: from } }, data });
    const after = await this.affiliateOf(storeId, affiliateId);
    if (moved.count === 0) throw statusRefused(after.status);
    return toShopAffiliate(after);
  }

  /**
   * What the shop window shows of them, taken off by the shop (IMPULSEIA-107, addendum D): the window
   * is the shop's, so it may remove their photo or their phrase. Putting them there is the affiliate's,
   * in their own area (AF8).
   */
  async clear(storeSlug: string, userId: string, affiliateId: string, field: 'photoUrl' | 'tagline'): Promise<ShopAffiliate> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.affiliateOf(storeId, affiliateId);
    const row = await this.prisma.affiliate.update({ where: { id: current.id }, data: { [field]: null }, include: affiliateInclude });
    return toShopAffiliate(row);
  }

  private async sendInvite(storeId: string, name: string, email: string, token: string): Promise<void> {
    const store = await this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { name: true } });
    await this.mail.sendAffiliateInvite(email, { name, shopName: store.name, days: AFFILIATE_INVITE_TTL_MS / DAY_MS }, token);
  }

  /** An affiliate of this shop's; another shop's, or none at all, is one answer. */
  private async affiliateOf(storeId: string, affiliateId: string) {
    const row = UUID.test(affiliateId) ? await this.prisma.affiliate.findFirst({ where: { id: affiliateId, storeId }, include: affiliateInclude }) : null;
    if (!row) throw affiliateMissing();
    return row;
  }

  private async tableOf(storeId: string, tableId: string): Promise<void> {
    const row = UUID.test(tableId) ? await this.prisma.commissionTable.findFirst({ where: { id: tableId, storeId }, select: { id: true } }) : null;
    if (!row) throw tableMissing();
  }
}
