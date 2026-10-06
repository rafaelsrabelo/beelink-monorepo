// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { IntegrationWebhookState } from '@harness-monorepo/contracts';
import type { StoreIntegrationModel } from '../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { open } from '../secret-vault.js';
import { AsaasClient, AsaasRefused } from './asaas.client.js';
import { asaasConfig, type AsaasConfig } from './asaas.config.js';

const PROVIDER = 'ASAAS' as const;

/** Between two looks at one shop's webhook: a paused queue holds its events for fourteen days, and a key idles for three months before Asaas disables it. */
export const WEBHOOK_CHECK_EVERY_MS = 24 * 60 * 60 * 1000;
/** Shops looked at per pass; the rest wait for the next one. */
const BATCH = 20;

interface Sealed {
  apiKey: string;
  webhookToken: string;
}

/**
 * Keeps a shop's webhook sending and its key alive (BEELINK-206). Once a day per connected shop it
 * reads the webhook at the shop's account: a queue Asaas interrupted — fifteen failures in a row —
 * is set going again, and what Asaas held meanwhile is then sent; a webhook that was never
 * registered, or was removed there by hand, is registered again with the token the shop already
 * has. The call is also the key's use: Asaas disables one left idle for three months. A key Asaas
 * refuses marks the connection as needing to be reconnected, here as everywhere.
 */
@Injectable()
export class AsaasWebhookKeeper {
  private readonly logger = new Logger(AsaasWebhookKeeper.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasClient,
  ) {}

  /** One pass: the connected shops not looked at for a day, the longest-unseen first. Answers how many it looked at. One shop's failure is its own. */
  async checkDue(now: Date): Promise<number> {
    const config = asaasConfig();
    if (!config) return 0;
    const due = await this.prisma.storeIntegration.findMany({
      where: { provider: PROVIDER, status: 'CONNECTED', OR: [{ webhookCheckedAt: null }, { webhookCheckedAt: { lte: new Date(now.getTime() - WEBHOOK_CHECK_EVERY_MS) } }] },
      orderBy: [{ webhookCheckedAt: { sort: 'asc', nulls: 'first' } }, { connectedAt: 'asc' }],
      take: BATCH,
    });
    for (const row of due) await this.check(config, row, now);
    return due.length;
  }

  /**
   * The shop's key tried once, on news that a key of its account stopped working: the event names
   * the key by an id bee-link does not hold, so Asaas is asked. A 401 marks the connection.
   */
  async probe(storeId: string): Promise<void> {
    const config = asaasConfig();
    const row = await this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } });
    if (!config || !row || row.status !== 'CONNECTED') return;
    try {
      await this.asaas.account(config, this.sealedOf(config, row).apiKey);
    } catch (error) {
      if (!(await this.refusedKey(row, error))) throw error;
    }
  }

  private async check(config: AsaasConfig, row: StoreIntegrationModel, now: Date): Promise<void> {
    try {
      const sealed = this.sealedOf(config, row);
      const state = await this.standing(config, row, sealed);
      // Only the connection that was looked at: one replaced meanwhile registered its own webhook.
      await this.prisma.storeIntegration.updateMany({ where: { id: row.id, connectedAt: row.connectedAt }, data: { webhookCheckedAt: now, ...state } });
    } catch (error) {
      if (await this.refusedKey(row, error)) return;
      // Looked at, though nothing was learned: the next look is tomorrow's, not the next pass's.
      await this.prisma.storeIntegration.updateMany({ where: { id: row.id, connectedAt: row.connectedAt }, data: { webhookCheckedAt: now } });
      this.logger.warn({ storeId: row.storeId, reason: error instanceof Error ? error.message : 'Unknown failure' }, "Could not check a shop's Asaas webhook");
    }
  }

  /** Where the webhook stands after this look, with whatever was mended. */
  private async standing(config: AsaasConfig, row: StoreIntegrationModel, sealed: Sealed): Promise<{ webhookId?: string | null; webhookState: IntegrationWebhookState; lastError?: string | null }> {
    const standing = row.webhookId ? await this.asaas.webhook(config, sealed.apiKey, row.webhookId) : null;
    if (!standing) {
      if (!config.webhookUrl) {
        // No webhook to look at: the account is read, so the key is used all the same.
        await this.asaas.account(config, sealed.apiKey);
        return { webhookState: 'SKIPPED' };
      }
      const store = await this.prisma.store.findUniqueOrThrow({ where: { id: row.storeId }, select: { slug: true } });
      const id = await this.asaas.createWebhook(config, sealed.apiKey, { name: `bee-link (${store.slug})`, url: config.webhookUrl, email: config.contactEmail, authToken: sealed.webhookToken });
      this.logger.warn({ storeId: row.storeId }, "A shop's Asaas webhook was missing, and was registered again");
      return { webhookId: id, webhookState: 'REGISTERED', lastError: null };
    }
    if (!standing.interrupted && standing.enabled) return { webhookState: 'REGISTERED' };

    this.logger.warn({ storeId: row.storeId, webhookId: row.webhookId }, "A shop's Asaas webhook had stopped sending");
    // Written first: should the resuming fail, the panel shows why payments are slow to confirm.
    await this.prisma.storeIntegration.updateMany({ where: { id: row.id, connectedAt: row.connectedAt }, data: { webhookState: 'PAUSED' } });
    await this.asaas.resumeWebhook(config, sealed.apiKey, row.webhookId!);
    return { webhookState: 'REGISTERED' };
  }

  /** Asaas's no to the key itself: the connection is marked, and the answer is true. Anything else is not this. */
  private async refusedKey(row: StoreIntegrationModel, error: unknown): Promise<boolean> {
    if (!(error instanceof AsaasRefused) || error.status !== 401) return false;
    await this.prisma.storeIntegration.updateMany({ where: { id: row.id, status: 'CONNECTED', connectedAt: row.connectedAt }, data: { status: 'NEEDS_RECONNECT', lastError: error.message } });
    this.logger.warn({ storeId: row.storeId, reason: error.message }, 'Asaas refused the key of a shop: its connection needs reconnecting');
    return true;
  }

  private sealedOf(config: AsaasConfig, row: StoreIntegrationModel): Sealed {
    return JSON.parse(open(row.secretSealed, config.vaultKey, { storeId: row.storeId, provider: PROVIDER })) as Sealed;
  }
}
