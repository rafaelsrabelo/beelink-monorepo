// Nest
import { Injectable } from '@nestjs/common';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { asaasConfig } from './asaas.config.js';
import { ASAAS_SETTINGS_DEFAULTS } from './asaas-settings.service.js';

/** What a shop takes right now: whether its Asaas can charge at all, and the ways its owner chose. */
export interface AsaasAcceptanceOf {
  /** A connection in good standing, in a deployment that can open its key. False, the shop sells as before Asaas. */
  connected: boolean;
  /** Since when this connection stands: a charge made before it belongs to a key replaced since. */
  connectedAt: Date | null;
  pix: boolean;
  card: boolean;
  maxInstallments: number;
  /** Paying on delivery or at pickup. Only means anything while `connected`. */
  offline: boolean;
}

/**
 * A shop's connection and its accepted ways read together (BEELINK-204), for whoever places or
 * charges an order: by the shop's id, with no owner asked — the caller already found the shop.
 * A connection that needs reconnecting is not one: the shop cannot be paid online until it is mended.
 */
@Injectable()
export class AsaasAcceptance {
  constructor(private readonly prisma: PrismaService) {}

  async of(storeId: string): Promise<AsaasAcceptanceOf> {
    const [connection, settings] = await Promise.all([
      this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: 'ASAAS' } }, select: { status: true, connectedAt: true } }),
      this.prisma.asaasSettings.findUnique({ where: { storeId } }),
    ]);
    const { pix, card, maxInstallments, offline } = settings ?? ASAAS_SETTINGS_DEFAULTS;
    const connected = asaasConfig() !== null && connection?.status === 'CONNECTED';
    return { connected, connectedAt: connected ? connection.connectedAt : null, pix, card, maxInstallments, offline };
  }
}
