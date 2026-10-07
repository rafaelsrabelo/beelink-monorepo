// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { CountedFunnelStep, StoreFunnelQuery, StoreFunnelReport } from '@harness-monorepo/contracts';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { COUNTED_FUNNEL_STEPS, FUNNEL_RETENTION_MONTHS } from './funnel-steps.js';
import { reportPeriodOf, shopDayOf, startOfShopDay } from './report-period.js';
import { SALE_CONDITION } from './sale-rule.js';

/**
 * A shop's funnel (BEELINK-276): the steps its shop window counts, and its orders at the end.
 *
 * What is kept of a visit is a number — per shop, per day on the shop's clock, per step. Nothing
 * here receives, reads or stores who the visitor is: no identifier, no address, no browser. That is
 * the whole reason it may count every visit at every shop with nobody's consent asked, and the
 * reason a step counts events and never people.
 */
@Injectable()
export class FunnelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /**
   * One more of `step` at the shop today. A single statement — the row is created or raised where
   * it is, never read first — so requests at the same instant, and API processes side by side, add
   * up. A slug that is no shop, or a site that sells nothing, selects no row and counts nothing;
   * neither is told to the caller, which has nothing to do about it.
   */
  async count(storeSlug: string, step: CountedFunnelStep, now = new Date()): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "store_funnel_days" ("storeId", "day", "step", "count")
      SELECT s."id", ${shopDayOf(now)}::date, ${step}::"FunnelStep", 1
      FROM "stores" s
      WHERE s."slug" = ${storeSlug} AND s."type" = 'ECOMMERCE'
      ON CONFLICT ("storeId", "day", "step") DO UPDATE SET "count" = "store_funnel_days"."count" + 1`;
  }

  /**
   * The period's funnel, for the shop's owner. The counted steps are the days' counters summed.
   *
   * The purchase is the sales (`SALE_CONDITION`, the rule "sales by origin" reads) whose first event
   * is the customer's — placed on the shop window — on the day they were placed. A sale registered
   * in the panel never walked the funnel and is said apart. Both are read from the first day this
   * shop counted anything: before it there is no visit to set a purchase against, and a rate over
   * nothing would read as a shop where everyone buys.
   */
  async funnel(storeSlug: string, userId: string, query: StoreFunnelQuery): Promise<StoreFunnelReport> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const period = reportPeriodOf(query);

    const [counted, [first]] = await Promise.all([
      this.prisma.$queryRaw<{ step: CountedFunnelStep; count: bigint }[]>`
        SELECT "step", sum("count")::bigint AS "count"
        FROM "store_funnel_days"
        WHERE "storeId" = ${storeId}::uuid AND "day" >= ${period.from}::date AND "day" <= ${period.to}::date
        GROUP BY "step"`,
      this.prisma.$queryRaw<{ since: string | null }[]>`
        SELECT to_char(min("day"), 'YYYY-MM-DD') AS "since" FROM "store_funnel_days" WHERE "storeId" = ${storeId}::uuid`,
    ]);
    const countingSince = first?.since ?? null;
    const sales = await this.sales(storeId, countingSince, period);

    return {
      from: period.from,
      to: period.to,
      steps: [
        ...COUNTED_FUNNEL_STEPS.map((step) => ({ step, count: Number(counted.find((row) => row.step === step)?.count ?? 0) })),
        { step: 'PURCHASE' as const, count: sales.placed },
      ],
      panelSales: sales.registered,
      countingSince,
      retentionMonths: FUNNEL_RETENTION_MONTHS,
    };
  }

  /** The period's sales from the first counted day on: those placed from the cart, and those registered in the panel. */
  private async sales(storeId: string, countingSince: string | null, period: { start: Date; end: Date }): Promise<{ placed: number; registered: number }> {
    const since = countingSince ? startOfShopDay(countingSince) : null;
    if (!since || since >= period.end) return { placed: 0, registered: 0 };
    const start = since > period.start ? since : period.start;

    const [row] = await this.prisma.$queryRaw<{ placed: number; registered: number }[]>(Prisma.sql`
      SELECT (count(*) FILTER (WHERE opened."actor" = 'CUSTOMER'))::int AS "placed",
             (count(*) FILTER (WHERE opened."actor" IS DISTINCT FROM 'CUSTOMER'))::int AS "registered"
      FROM "orders" o
      LEFT JOIN LATERAL (
        SELECT e."actor" FROM "order_events" e WHERE e."orderId" = o."id" ORDER BY e."createdAt" ASC LIMIT 1
      ) opened ON true
      WHERE o."storeId" = ${storeId}::uuid
        AND o."placedAt" >= ${start}
        AND o."placedAt" < ${period.end}
        AND ${SALE_CONDITION}`);

    return row ?? { placed: 0, registered: 0 };
  }
}
