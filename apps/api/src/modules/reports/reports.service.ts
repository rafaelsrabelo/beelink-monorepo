// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { SalesByOriginQuery, SalesByOriginReport, SalesOriginKind } from '@harness-monorepo/contracts';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { reportPeriodOf } from './report-period.js';
import { SALE_CONDITION } from './sale-rule.js';

interface OriginRow {
  kind: SalesOriginKind;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  orders: number;
  metaAdOrders: number;
  revenueCents: bigint;
}

/**
 * What a shop sold, read back in groups for its owner. Every read here is one grouped query: the
 * orders are summed where they are, never brought into memory.
 */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /**
   * The period's sales by where their buyers came from (BEELINK-275). Which order is a sale is
   * `SALE_CONDITION`; it counts on the day it was placed, for its total.
   *
   * A sale registered in the panel — its first event is not the customer's — is a line of its own:
   * it never came through the site, and left out the lines would not add up to what the shop sold.
   * The rest group by the three labels as stored; with none of them, a kept Meta ad click still
   * makes a campaign line, and nothing at all is the direct one.
   */
  async salesByOrigin(storeSlug: string, userId: string, query: SalesByOriginQuery): Promise<SalesByOriginReport> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const period = reportPeriodOf(query);

    const rows = await this.prisma.$queryRaw<OriginRow[]>(Prisma.sql`
      SELECT s."kind",
             s."source",
             s."medium",
             s."campaign",
             count(*)::int AS "orders",
             (count(*) FILTER (WHERE s."metaAd"))::int AS "metaAdOrders",
             sum(s."totalCents")::bigint AS "revenueCents"
      FROM (
        SELECT CASE
                 WHEN opened."actor" IS DISTINCT FROM 'CUSTOMER' THEN 'PANEL'
                 WHEN o."originMetaAd" OR o."utmSource" IS NOT NULL OR o."utmMedium" IS NOT NULL OR o."utmCampaign" IS NOT NULL THEN 'CAMPAIGN'
                 ELSE 'DIRECT'
               END AS "kind",
               CASE WHEN opened."actor" = 'CUSTOMER' THEN o."utmSource" END AS "source",
               CASE WHEN opened."actor" = 'CUSTOMER' THEN o."utmMedium" END AS "medium",
               CASE WHEN opened."actor" = 'CUSTOMER' THEN o."utmCampaign" END AS "campaign",
               opened."actor" = 'CUSTOMER' AND o."originMetaAd" AS "metaAd",
               o."totalCents"
        FROM "orders" o
        LEFT JOIN LATERAL (
          SELECT e."actor" FROM "order_events" e WHERE e."orderId" = o."id" ORDER BY e."createdAt" ASC LIMIT 1
        ) opened ON true
        WHERE o."storeId" = ${storeId}::uuid
          AND o."placedAt" >= ${period.start}
          AND o."placedAt" < ${period.end}
          AND ${SALE_CONDITION}
      ) s
      GROUP BY s."kind", s."source", s."medium", s."campaign"
      ORDER BY "revenueCents" DESC, "orders" DESC, s."kind" ASC, s."source" ASC NULLS LAST, s."medium" ASC NULLS LAST, s."campaign" ASC NULLS LAST`);

    const lines = rows.map((row) => ({ ...row, revenueCents: Number(row.revenueCents) }));

    return {
      from: period.from,
      to: period.to,
      rows: lines,
      totals: { orders: lines.reduce((sum, row) => sum + row.orders, 0), revenueCents: lines.reduce((sum, row) => sum + row.revenueCents, 0) },
    };
  }
}
