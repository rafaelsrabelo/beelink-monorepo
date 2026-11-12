// Nest
import { Injectable, NotFoundException } from '@nestjs/common';

// Types
import type { PublicAffiliateLink } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { slugify } from '../../shared/slug.js';
import { shopDayOf } from '../reports/report-period.js';
import { StoresService } from '../stores/stores.service.js';
import { UUID, affiliateError } from './affiliates.constants.js';

/** What names a link: the `/name` the address carries, or the id the shop window's cookie keeps. */
export interface AffiliateLinkAsk {
  slug?: string;
  id?: string;
}

const notALink = () => new NotFoundException(affiliateError('AFFILIATE_LINK_NOT_FOUND', 'No affiliate of this shop answers to this link'));

/**
 * An affiliate's link on the shop window (IMPULSEIA-105): who it names, and the visits it brought.
 *
 * A link credits someone only while three things hold at once — the affiliate is `ACTIVE`, the
 * shop's programme is on, and this deployment has links switched on (`AFFILIATE_LINKS_ENABLED`).
 * Any other link of the shop's is still a link: it is answered with nobody, and the shop opens,
 * because a link printed or posted must keep leading somewhere (decision 4 of the epic).
 */
@Injectable()
export class AffiliateLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async link(storeSlug: string, ask: AffiliateLinkAsk): Promise<PublicAffiliateLink> {
    const storeId = await this.stores.publicStoreId(storeSlug);
    const where = whereOf(ask);
    if (!where) throw notALink();

    const row = await this.prisma.affiliate.findFirst({
      where: { storeId, slug: { not: null }, ...where },
      select: { id: true, slug: true, name: true, photoUrl: true, tagline: true, status: true },
    });
    if (!row?.slug) throw notALink();

    const program = await this.prisma.affiliateProgram.findUnique({ where: { storeId }, select: { enabled: true, attributionDays: true } });
    const credits = env.AFFILIATE_LINKS_ENABLED && row.status === 'ACTIVE' && program?.enabled === true;

    return {
      affiliate: credits
        ? { id: row.id, slug: row.slug, name: row.name, photoUrl: row.photoUrl, tagline: row.tagline, attributionDays: program.attributionDays }
        : null,
    };
  }

  /**
   * One more visit through the affiliate's link today, on the shop's clock. One statement, never read
   * first, so visits at the same instant add up; the conditions of `link` are in its `WHERE`, so a link
   * that credits nobody counts nothing — and nothing tells the caller, who has nothing to do about it.
   */
  async visit(storeSlug: string, affiliateId: string, now = new Date()): Promise<void> {
    if (!env.AFFILIATE_LINKS_ENABLED || !UUID.test(affiliateId)) return;

    await this.prisma.$executeRaw`
      INSERT INTO "affiliate_visit_days" ("affiliateId", "storeId", "day", "visits")
      SELECT a."id", a."storeId", ${shopDayOf(now)}::date, 1
      FROM "affiliates" a
      JOIN "stores" s ON s."id" = a."storeId"
      JOIN "affiliate_programs" p ON p."storeId" = a."storeId"
      WHERE s."slug" = ${storeSlug} AND a."id" = ${affiliateId.toLowerCase()}::uuid AND a."status" = 'ACTIVE' AND p."enabled"
      ON CONFLICT ("affiliateId", "day") DO UPDATE SET "visits" = "affiliate_visit_days"."visits" + 1`;
  }
}

/** One of the two, well formed; anything else names no link. The `/name` is read as it is kept, so `/loja/João` finds `joao`. */
function whereOf({ slug, id }: AffiliateLinkAsk): { slug: string } | { id: string } | null {
  if (slug !== undefined && id === undefined) {
    const kept = slugify(slug);
    return kept ? { slug: kept } : null;
  }
  if (id !== undefined && slug === undefined && UUID.test(id)) return { id: id.toLowerCase() };
  return null;
}
