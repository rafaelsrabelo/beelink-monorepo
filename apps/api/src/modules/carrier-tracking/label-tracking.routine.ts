// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { melhorEnvioConfig, MelhorEnvioClient } from '../integrations/melhor-envio/melhor-envio.client.js';
import { MelhorEnvioService } from '../integrations/melhor-envio/melhor-envio.service.js';
import { CarrierTracking } from './carrier-tracking.service.js';

/** Between passes: a parcel moves in hours, and the webhook is the fast way. */
const PASS_MS = 30 * 60 * 1000;
/** Labels asked about per pass; the rest wait for the next one. */
const BATCH = 50;
/** A label generated a moment ago has nothing to tell yet. */
const SETTLE_MS = 10 * 60 * 1000;

/**
 * Asks Melhor Envio after the labels the webhook may have missed (BEELINK-188) — one that never
 * arrived, five retries spent while bee-link was down: every half hour, the generated labels of
 * orders not yet delivered nor cancelled, the oldest first. What it learns goes through the same door
 * as the webhook, so a fact both reach is applied once.
 */
@Injectable()
export class LabelTrackingRoutine implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LabelTrackingRoutine.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly connection: MelhorEnvioService,
    private readonly melhorEnvio: MelhorEnvioClient,
    private readonly tracking: CarrierTracking,
  ) {}

  onModuleInit(): void {
    // A suite checks when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), PASS_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  /** One pass: answers how many labels it asked about. One shop's failure is its own; the others still go. */
  async checkDue(now: Date): Promise<number> {
    const config = melhorEnvioConfig();
    if (!config) return 0;

    const due = await this.prisma.orderLabel.findMany({
      where: { status: 'GENERATED', generatedAt: { lte: new Date(now.getTime() - SETTLE_MS) }, order: { status: { notIn: ['DELIVERED', 'CANCELLED'] } } },
      orderBy: { generatedAt: 'asc' },
      take: BATCH,
      select: { storeId: true, providerId: true },
    });
    for (const label of due) {
      try {
        const token = await this.connection.accessTokenFor(label.storeId);
        const answer = await this.melhorEnvio.tracking(config, token, label.providerId);
        await this.tracking.apply({ labelId: label.providerId, status: answer.status, trackingCode: answer.trackingCode, trackingUrl: null });
      } catch (error) {
        this.logger.warn({ err: error, labelId: label.providerId }, 'Could not check a label at Melhor Envio');
      }
    }
    return due.length;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.checkDue(new Date());
    } finally {
      this.running = false;
    }
  }
}
