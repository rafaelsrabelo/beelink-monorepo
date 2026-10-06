// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { AsaasAccountApproval, IntegrationStatus } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { asaasConfig } from './asaas.config.js';
import { ASAAS_SETTINGS_DEFAULTS } from './asaas-settings.service.js';

/** What a shop takes right now: whether its Asaas can charge at all, and the ways its owner chose. */
export interface AsaasAcceptanceOf {
  /**
   * A connection in good standing, of an account Asaas was not read to hold unapproved (BEELINK-278),
   * in a deployment that can open its key. False, the shop sells as before Asaas.
   */
  connected: boolean;
  /**
   * Since when the key in hand stands, approved account or not: a charge made before it belongs to a
   * key replaced since. Null only when no key can be used at all.
   */
  connectedAt: Date | null;
  pix: boolean;
  card: boolean;
  maxInstallments: number;
  /** Paying on delivery or at pickup. Only means anything while `connected`. */
  offline: boolean;
}

/**
 * Whether a connection charges: its key in good standing, and its account not read as unapproved.
 * An approval never read, or that Asaas did not answer, is not a no — every shop connected before
 * BEELINK-278 has none, and must go on being paid.
 */
export function chargesOnline(connection: { status: Exclude<IntegrationStatus, 'DISCONNECTED'>; accountApproval: AsaasAccountApproval | null } | null): boolean {
  return connection?.status === 'CONNECTED' && (connection.accountApproval === null || connection.accountApproval === 'APPROVED');
}

/**
 * A shop's connection and its accepted ways read together (BEELINK-204), for whoever places or
 * charges an order: by the shop's id, with no owner asked — the caller already found the shop.
 * A connection that needs reconnecting is not one, and neither is an account Asaas has not approved
 * (BEELINK-278), which Asaas refuses every Pix and card of: the shop cannot be paid online until it
 * is mended, and the checkout and the placing of an order both go by this one reading.
 */
@Injectable()
export class AsaasAcceptance {
  constructor(private readonly prisma: PrismaService) {}

  async of(storeId: string): Promise<AsaasAcceptanceOf> {
    const [connection, settings] = await Promise.all([
      this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: 'ASAAS' } }, select: { status: true, connectedAt: true, accountApproval: true } }),
      this.prisma.asaasSettings.findUnique({ where: { storeId } }),
    ]);
    const { pix, card, maxInstallments, offline } = settings ?? ASAAS_SETTINGS_DEFAULTS;
    const keyed = asaasConfig() !== null && connection?.status === 'CONNECTED';
    return { connected: keyed && chargesOnline(connection), connectedAt: keyed ? connection.connectedAt : null, pix, card, maxInstallments, offline };
  }
}
