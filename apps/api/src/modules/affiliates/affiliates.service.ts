// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { AffiliateProgramOverview } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { brasiliaDayOf } from '../billing/billing-dates.js';
import { StoresService } from '../stores/stores.service.js';
import { payoutPeriodsOfMonth } from './affiliate-payout-calendar.js';
import { openProgram } from './affiliate-program.js';
import { toAffiliateProgram, toCommissionTableSummary } from './affiliates.mapper.js';
import type { AffiliateProgramDto } from './dto/affiliate-program.dto.js';

/** A shop's affiliate programme as its owner keeps it (IMPULSEIA-101): the rules, and its tables listed. */
@Injectable()
export class AffiliatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async overview(storeSlug: string, userId: string): Promise<AffiliateProgramOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.overviewOf(storeId);
  }

  /** The whole of the rules. The terms' version goes up only when their text changes. */
  async save(storeSlug: string, userId: string, dto: AffiliateProgramDto): Promise<AffiliateProgramOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await openProgram(this.prisma, storeId);

    await this.prisma.$transaction(async (tx) => {
      // The row held while the text is compared: two saves at once each count against what the other wrote.
      const [held] = await tx.$queryRaw<{ termsText: string | null }[]>`
        SELECT "termsText" FROM "affiliate_programs" WHERE "storeId" = ${storeId}::uuid FOR UPDATE`;
      const termsChanged = held?.termsText !== dto.termsText;
      await tx.affiliateProgram.update({
        where: { storeId },
        data: {
          enabled: dto.enabled,
          attributionDays: dto.attributionDays,
          payoutDelayDays: dto.payoutDelayDays,
          termsText: dto.termsText,
          ...(termsChanged ? { termsVersion: { increment: 1 } } : {}),
        },
      });
    });

    return this.overviewOf(storeId);
  }

  private async overviewOf(storeId: string): Promise<AffiliateProgramOverview> {
    const program = await openProgram(this.prisma, storeId);
    const tables = await this.prisma.commissionTable.findMany({
      where: { storeId },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      // Ended affiliates are no one's to move: a table with only those is deleted, and they go to the default one.
      include: { _count: { select: { rates: true, affiliates: { where: { status: { not: 'ENDED' } } } } } },
    });

    return {
      program: toAffiliateProgram(program),
      tables: tables.map(toCommissionTableSummary),
      periods: payoutPeriodsOfMonth(brasiliaDayOf(new Date()), program.payoutDelayDays),
      linksLive: env.AFFILIATE_LINKS_ENABLED,
    };
  }
}
