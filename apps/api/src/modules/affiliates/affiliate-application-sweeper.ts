// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AFFILIATE_APPLICATION_TTL_MS } from './affiliate-page.constants.js';

const SWEEP_MS = 6 * 60 * 60 * 1000;

/**
 * The applications decided 90 days ago (plan 2026-11-14): a stranger's name, e-mail and phone are not
 * kept for nothing — an approval's affiliate holds what it needed, and a refusal needs nothing. One
 * waiting is kept until the shop decides it.
 */
@Injectable()
export class AffiliateApplicationSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AffiliateApplicationSweeper.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit(): void {
    // A suite sweeps when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      this.sweep(new Date()).catch((error: unknown) => this.logger.error({ err: error }, 'Could not sweep the decided affiliate applications'));
    }, SWEEP_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One sweep at `now`. Answers how many applications were deleted. */
  async sweep(now: Date): Promise<number> {
    const { count } = await this.prisma.affiliateApplication.deleteMany({
      where: { status: { not: 'PENDING' }, decidedAt: { lte: new Date(now.getTime() - AFFILIATE_APPLICATION_TTL_MS) } },
    });
    return count;
  }
}
