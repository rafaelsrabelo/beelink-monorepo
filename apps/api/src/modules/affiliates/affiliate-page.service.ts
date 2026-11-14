// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { AffiliatePageOverview, PublicAffiliatePage } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { affiliatePageBlockOf, announcedRateOf, liveAffiliatePageOf } from './affiliate-page-live.js';
import { contentJsonOf, toAffiliatePageSettings } from './affiliate-page.mapper.js';
import { openProgram } from './affiliate-program.js';
import { tableFor } from './affiliate-records.js';
import { affiliateError } from './affiliates.constants.js';
import type { AffiliatePageDto } from './dto/affiliate-page.dto.js';

export const affiliatePageClosed = () => new NotFoundException(affiliateError('AFFILIATE_PAGE_CLOSED', 'This shop takes no affiliate applications now'));

/**
 * A shop's "Seja afiliado" page (plan 2026-11-14--afiliados-candidatura-publica): as its owner sets
 * and writes it, and as a visitor reads it. The page announces a table the shop shares — another
 * affiliate's own commission is nobody else's — and a table deleted hands it back to the default one.
 */
@Injectable()
export class AffiliatePageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async overview(storeSlug: string, userId: string): Promise<AffiliatePageOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.overviewOf(storeId);
  }

  /** The whole of it. The programme is opened with it, so the page has a default table to announce. */
  async save(storeSlug: string, userId: string, dto: AffiliatePageDto): Promise<AffiliatePageOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await openProgram(this.prisma, storeId);
    if (dto.tableId !== null) await tableFor(this.prisma, storeId, dto.tableId, null);

    const data = {
      open: dto.open,
      homeBanner: dto.placements.homeBanner,
      footerLink: dto.placements.footerLink,
      topStrip: dto.placements.topStrip,
      tableId: dto.tableId,
      approval: dto.approval,
      content: contentJsonOf(dto.content),
    };
    await this.prisma.affiliatePage.upsert({ where: { storeId }, create: { storeId, ...data }, update: data });
    return this.overviewOf(storeId);
  }

  /** What a visitor reads, while the page is theirs to see. */
  async publicPage(storeSlug: string): Promise<PublicAffiliatePage> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const live = await liveAffiliatePageOf(this.prisma, storeId, env.AFFILIATE_LINKS_ENABLED);
    if (!live) throw affiliatePageClosed();
    return { content: live.content, rateBps: live.rateBps, terms: live.terms };
  }

  private async overviewOf(storeId: string): Promise<AffiliatePageOverview> {
    const [page, program, pendingApplications] = await Promise.all([
      this.prisma.affiliatePage.findUnique({ where: { storeId }, include: { table: { select: { defaultRateBps: true } } } }),
      this.prisma.affiliateProgram.findUnique({ where: { storeId }, select: { enabled: true } }),
      this.prisma.affiliateApplication.count({ where: { storeId, status: 'PENDING' } }),
    ]);
    return {
      page: toAffiliatePageSettings(page),
      blockedBy: affiliatePageBlockOf(page?.open ?? false, program?.enabled ?? false, env.AFFILIATE_LINKS_ENABLED),
      rateBps: await announcedRateOf(this.prisma, storeId, page?.table?.defaultRateBps ?? null),
      pendingApplications,
    };
  }
}
