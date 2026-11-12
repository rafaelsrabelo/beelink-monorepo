// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { CloudinaryPrivateAssets } from '../uploads/cloudinary-private-assets.js';
import { DOCUMENT_UPLOAD_TTL_MS } from './affiliates.constants.js';

const SWEEP_MS = 30 * 60 * 1000;
const SWEEP_BATCH = 50;

/**
 * The photos of documents nobody named (12/11/2026): an invite filled in and abandoned leaves them
 * waiting, and a document's photo is not to be kept for nothing. Past a day, each is deleted at
 * Cloudinary and then its row; one Cloudinary did not delete keeps its row, for the next sweep.
 */
@Injectable()
export class AffiliateDocumentSweeper implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AffiliateDocumentSweeper.name);
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly assets: CloudinaryPrivateAssets,
  ) {}

  onModuleInit(): void {
    // A suite sweeps when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), SWEEP_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      await this.sweep(new Date());
    } catch (error) {
      this.logger.error({ err: error }, "Could not sweep the affiliates' waiting photos");
    } finally {
      this.sweeping = false;
    }
  }

  /** One sweep at `now`. Answers how many photos were deleted. */
  async sweep(now: Date): Promise<number> {
    const stale = await this.prisma.affiliateDocumentUpload.findMany({
      where: { createdAt: { lte: new Date(now.getTime() - DOCUMENT_UPLOAD_TTL_MS) } },
      orderBy: { createdAt: 'asc' },
      take: SWEEP_BATCH,
      select: { id: true, publicId: true },
    });
    let deleted = 0;
    for (const upload of stale) {
      // With no account configured there is nothing at Cloudinary to delete, only the row.
      const gone = !this.assets.config() || (await this.assets.destroy(upload.publicId));
      if (!gone) continue;
      await this.prisma.affiliateDocumentUpload.deleteMany({ where: { id: upload.id } });
      deleted += 1;
    }
    return deleted;
  }
}
