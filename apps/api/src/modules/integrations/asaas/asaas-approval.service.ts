// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { AsaasAccountApproval } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { open } from '../secret-vault.js';
import { AsaasClient, AsaasRefused } from './asaas.client.js';
import { asaasConfig, type AsaasConfig } from './asaas.config.js';

const PROVIDER = 'ASAAS' as const;

/** What a reading writes on the connection; nothing at all when Asaas did not answer. */
export type ApprovalRead = { accountApproval: AsaasAccountApproval | null; accountApprovalCheckedAt: Date } | Record<string, never>;

/**
 * Whether Asaas approved a shop's account (BEELINK-278). An account still being looked at connects
 * like any other — its key is good — and then has every Pix and card refused, so the approval is
 * read where the connection is made, once a day beside the webhook, when the shopkeeper asks, and
 * when Asaas refuses a charge. `AsaasAcceptance` is what reads it back, for the checkout and the
 * placing of an order alike.
 *
 * Asaas not answering never changes what is kept: only an answer does. An answer in a word bee-link
 * does not know is kept as not known, which switches nothing off.
 */
@Injectable()
export class AsaasApproval {
  private readonly logger = new Logger(AsaasApproval.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasClient,
  ) {}

  /** Asaas asked with a key in hand, for whoever is writing the connection anyway. Never fails. */
  async read(config: AsaasConfig, apiKey: string, storeId: string, now = new Date()): Promise<ApprovalRead> {
    try {
      return { accountApproval: await this.asaas.approval(config, apiKey), accountApprovalCheckedAt: now };
    } catch (error) {
      this.logger.warn({ storeId, reason: reasonOf(error) }, "Could not read whether Asaas approved a shop's account");
      return {};
    }
  }

  /**
   * Asaas asked again of a connected shop, and the answer written. Fails as Asaas did — but for its
   * no to the key itself, which marks the connection as needing to be reconnected, here as everywhere.
   */
  async recheck(storeId: string, now = new Date()): Promise<void> {
    const config = asaasConfig();
    const row = await this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } });
    if (!config || !row || row.status !== 'CONNECTED') return;
    // Only the connection that was asked about: one replaced meanwhile read its own.
    const same = { id: row.id, status: 'CONNECTED' as const, connectedAt: row.connectedAt };
    try {
      const { apiKey } = JSON.parse(open(row.secretSealed, config.vaultKey, { storeId, provider: PROVIDER })) as { apiKey: string };
      const accountApproval = await this.asaas.approval(config, apiKey);
      await this.prisma.storeIntegration.updateMany({ where: same, data: { accountApproval, accountApprovalCheckedAt: now } });
      if (accountApproval !== row.accountApproval) this.logger.warn({ storeId, was: row.accountApproval, is: accountApproval }, "A shop's Asaas account changed its approval");
    } catch (error) {
      if (!(error instanceof AsaasRefused) || error.status !== 401) throw error;
      await this.prisma.storeIntegration.updateMany({ where: same, data: { status: 'NEEDS_RECONNECT', lastError: error.message } });
      this.logger.warn({ storeId, reason: error.message }, 'Asaas refused the key of a shop: its connection needs reconnecting');
    }
  }

  /** `recheck`, for whoever has something else to answer — a charge Asaas just refused. Never fails. */
  async hear(storeId: string): Promise<void> {
    await this.recheck(storeId).catch((error: unknown) => this.logger.warn({ storeId, reason: reasonOf(error) }, "Could not read whether Asaas approved a shop's account"));
  }
}

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown failure');
