// Nest
import { Injectable } from '@nestjs/common';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { funnelCutoffDay } from './funnel-steps.js';
import { shopDayOf } from './report-period.js';

/**
 * What the clock does to the funnel's counters (BEELINK-276), and to the visits through affiliates'
 * links (IMPULSEIA-105): a day older than thirteen months is deleted. It has no timer of its own —
 * the payments' routine calls it every minute, and it works once per day of the shop's clock in each
 * process. Two processes delete the same rows; the second finds none.
 */
@Injectable()
export class FunnelRetention {
  private prunedOn: string | null = null;

  constructor(private readonly prisma: PrismaService) {}

  /** Prunes if today was not pruned yet by this process. Answers how many rows went. */
  async pruneDue(now: Date): Promise<number> {
    const today = shopDayOf(now);
    if (this.prunedOn === today) return 0;

    const gone = await this.prune(now);
    // Marked only once the delete went through: a failed one is tried again the next minute.
    this.prunedOn = today;
    return gone;
  }

  /**
   * Deletes every counter of a day before the first one still kept at `now`: the funnel's, and the
   * visits through affiliates' links (IMPULSEIA-105), which are the same kind of number and kept as long.
   */
  async prune(now: Date): Promise<number> {
    const cutoff = funnelCutoffDay(now);
    const [steps, visits] = await this.prisma.$transaction([
      this.prisma.$executeRaw`DELETE FROM "store_funnel_days" WHERE "day" < ${cutoff}::date`,
      this.prisma.$executeRaw`DELETE FROM "affiliate_visit_days" WHERE "day" < ${cutoff}::date`,
    ]);
    return steps + visits;
  }
}
