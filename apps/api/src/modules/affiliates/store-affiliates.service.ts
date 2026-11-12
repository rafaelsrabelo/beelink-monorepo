// Nest
import { ConflictException, Injectable } from '@nestjs/common';

// Types
import type { AffiliateStatus, ShopAffiliate, ShopAffiliatePage } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { MailService } from '../../shared/mail/mail.service.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { AffiliateDocumentsService } from './affiliate-documents.service.js';
import { freshInvite } from './affiliate-invites.js';
import { affiliateOf, sendInvite, statusRefused } from './affiliate-records.js';
import { AFFILIATE_INVITE_RESEND_FLOOR_MS, AFFILIATES_PAGE_SIZE, affiliateError } from './affiliates.constants.js';
import { affiliateInclude, toShopAffiliate, toShopAffiliateSummary } from './affiliates.mapper.js';
import type { AffiliateListQueryDto } from './dto/affiliate.dto.js';

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
    private readonly documents: AffiliateDocumentsService,
  ) {}

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

    await sendInvite(this.prisma, this.mail, storeId, current, invite.token);
    return toShopAffiliate(await this.affiliateOf(storeId, affiliateId));
  }

  /**
   * An invite nobody accepted leaves nothing behind: the row goes — and with it their own table and
   * their document's row — the e-mail may be invited again, and the document's photos are deleted at
   * Cloudinary, best effort (12/11/2026).
   */
  async cancel(storeSlug: string, userId: string, affiliateId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const current = await this.affiliateOf(storeId, affiliateId);
    const files = await this.documents.filesOf(current.id);
    const removed = await this.prisma.affiliate.deleteMany({ where: { id: current.id, status: 'INVITED' } });
    if (removed.count === 0) throw statusRefused((await this.affiliateOf(storeId, affiliateId)).status);
    await this.documents.discard(files);
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

  private affiliateOf(storeId: string, affiliateId: string) {
    return affiliateOf(this.prisma, storeId, affiliateId);
  }
}
