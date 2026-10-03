// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { CarrierGap } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { carrierGapOf } from './carrier-readiness.js';

/**
 * Which of a shop's products a carrier cannot quote (BEELINK-184), for the catalogue to say without
 * reading the integration's tables itself. Asked only of a shop that ships by carrier — connected, or
 * connected and asked to reconnect: it chose carriers, and what is missing still matters.
 */
@Injectable()
export class CarrierGapsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Null for a shop with no Melhor Envio; else what each product given lacks, the complete ones left out. */
  async gapsOf(storeId: string, productIds: readonly string[]): Promise<Record<string, CarrierGap> | null> {
    const [connections, settings] = await Promise.all([
      this.prisma.storeIntegration.count({ where: { storeId, provider: 'MELHOR_ENVIO' } }),
      this.prisma.melhorEnvioSettings.findUnique({ where: { storeId }, select: { packageWeightGrams: true } }),
    ]);
    if (connections === 0) return null;
    if (productIds.length === 0) return {};

    // Saved all four or none: the weight stands for the parcel.
    const hasDefaultPackage = settings?.packageWeightGrams != null;
    // The variants a customer can pick: an archived or switched-off one is never quoted.
    const variants = await this.prisma.productVariant.findMany({
      where: { productId: { in: [...productIds] }, archivedAt: null, isActive: true },
      select: { productId: true, weightGrams: true, lengthMm: true, widthMm: true, heightMm: true },
    });

    const gaps: Record<string, CarrierGap> = {};
    for (const productId of productIds) {
      const gap = carrierGapOf(variants.filter((variant) => variant.productId === productId), hasDefaultPackage);
      if (gap) gaps[productId] = gap;
    }
    return gaps;
  }
}
