// Node
import { createHash, randomBytes } from 'node:crypto';

// Nest
import { BadGatewayException, BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { AsaasConnection, AsaasConnectPayload, IntegrationWebhookState } from '@harness-monorepo/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import type { StoreIntegrationModel } from '../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { integrationError } from '../integrations.constants.js';
import { open, seal } from '../secret-vault.js';
import { AsaasClient, AsaasRefused, AsaasUnreachable } from './asaas.client.js';
import { ASAAS_KEY_PREFIXES, asaasConfig, asaasEnvironment, type AsaasConfig } from './asaas.config.js';
import { maskedDocumentOf } from './masked-document.js';

const PROVIDER = 'ASAAS' as const;

/** What the sealed field holds for Asaas: the shop's key, and the token its webhook sends back. */
interface SealedAsaas {
  apiKey: string;
  webhookToken: string;
}

/** What registering the webhook came to. */
interface Webhook {
  id: string | null;
  state: IntegrationWebhookState;
  error: string | null;
}

/**
 * The two calls made under the lock, at ten seconds each — and as long again waiting for a connect
 * of the same shop that holds it.
 */
const LOCKED_TIMEOUT_MS = 45_000;

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

function connectionOf(row: StoreIntegrationModel | null): AsaasConnection {
  return {
    available: asaasConfig() !== null,
    environment: asaasEnvironment(),
    status: row?.status ?? 'DISCONNECTED',
    account: row ? { name: row.accountName ?? '', document: row.accountDocument } : null,
    webhook: row?.webhookState ?? null,
    connectedAt: row?.connectedAt.toISOString() ?? null,
  };
}

/**
 * A shop's own Asaas account (BEELINK-202), connected with the API key its owner pastes: the key is
 * checked against Asaas, sealed with a fresh webhook token for this shop alone, and opened only in
 * this folder (gate `api/asaas-secret-in-asaas`). The webhook Asaas sends the shop's payment events
 * to is registered at the shop's account here, and removed again when the key is replaced or the
 * shop disconnects. Nothing the key opens is answered back: the panel sees whose account it is.
 */
@Injectable()
export class AsaasConnectionService {
  private readonly logger = new Logger(AsaasConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly asaas: AsaasClient,
  ) {}

  async connection(storeSlug: string, userId: string): Promise<AsaasConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return connectionOf(await this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } }));
  }

  /**
   * Connect, or replace what was connected. The key is checked before anything already there is
   * touched: a mistyped key leaves the shop as it was. Then, under the shop's lock — two clicks at
   * once would each register a webhook, and one would be left sending a token nobody holds — the
   * old webhook goes and the new one is registered.
   */
  async connect(storeSlug: string, userId: string, { apiKey }: AsaasConnectPayload): Promise<AsaasConnection> {
    const config = this.config();
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    this.refuseOtherEnvironment(config, apiKey);
    const account = await this.asaas.account(config, apiKey).catch((error: unknown) => this.refused(config, error));

    const row = await this.exclusively(storeId, async (tx) => {
      const previous = await tx.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } });
      if (previous) await this.removeWebhook(config, previous);

      const webhookToken = randomBytes(32).toString('base64url');
      const webhook = await this.register(config, apiKey, webhookToken, storeSlug, storeId);
      const secret: SealedAsaas = { apiKey, webhookToken };
      const data = {
        status: 'CONNECTED' as const,
        secretSealed: seal(JSON.stringify(secret), config.vaultKey, { storeId, provider: PROVIDER }),
        accountName: account.name,
        accountDocument: maskedDocumentOf(account.document),
        webhookId: webhook.id,
        webhookState: webhook.state,
        webhookTokenHash: sha256(webhookToken),
        lastError: webhook.error,
        connectedAt: new Date(),
      };
      return tx.storeIntegration.upsert({
        where: { storeId_provider: { storeId, provider: PROVIDER } },
        create: { storeId, provider: PROVIDER, ...data },
        update: data,
      });
    });
    return connectionOf(row);
  }

  /**
   * The webhook comes out of the shop's account, then the key out of bee-link. Asaas failing to
   * remove the webhook never keeps the key here: the shopkeeper asked bee-link to let go of it.
   */
  async disconnect(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const config = asaasConfig();

    await this.exclusively(storeId, async (tx) => {
      const row = await tx.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } });
      if (!row) return;
      if (config) await this.removeWebhook(config, row);
      await tx.storeIntegration.delete({ where: { id: row.id } });
    });
  }

  /** The prefix says which Asaas a key is for; one for the other is refused before Asaas is asked. */
  private refuseOtherEnvironment(config: AsaasConfig, apiKey: string): void {
    const production = config.environment === 'PRODUCTION';
    if (!apiKey.startsWith(ASAAS_KEY_PREFIXES[production ? 'SANDBOX' : 'PRODUCTION'])) return;
    throw this.wrongEnvironment(config);
  }

  private wrongEnvironment(config: AsaasConfig): BadRequestException {
    const expected = ASAAS_KEY_PREFIXES[config.environment];
    const message = config.environment === 'PRODUCTION' ? `This is a sandbox key; this deployment takes production keys (${expected}…)` : `This is a production key; this deployment takes sandbox keys (${expected}…)`;
    return new BadRequestException(integrationError('INTEGRATION_KEY_WRONG_ENVIRONMENT', message));
  }

  /** Asaas's no on the key, said as one the panel can act on: another environment, or no key at all. */
  private refused(config: AsaasConfig, error: unknown): never {
    if (error instanceof AsaasRefused && error.code === 'invalid_environment') throw this.wrongEnvironment(config);
    if (error instanceof AsaasRefused) throw new BadRequestException(integrationError('INTEGRATION_KEY_INVALID', 'Asaas refused this key'));
    if (error instanceof AsaasUnreachable) throw new BadGatewayException(integrationError('INTEGRATION_UNREACHABLE', 'Asaas did not answer'));
    throw error;
  }

  /**
   * The webhook registered at the shop's account — or not, on a web Asaas cannot reach. A refusal
   * (an account already holding ten) or no answer leaves the connection standing with the webhook in
   * error: the reconciliation still finds the payments, and connecting again tries once more.
   */
  private async register(config: AsaasConfig, apiKey: string, authToken: string, storeSlug: string, storeId: string): Promise<Webhook> {
    if (!config.webhookUrl) return { id: null, state: 'SKIPPED', error: null };
    try {
      const id = await this.asaas.createWebhook(config, apiKey, { name: `bee-link (${storeSlug})`, url: config.webhookUrl, email: config.contactEmail, authToken });
      return { id, state: 'REGISTERED', error: null };
    } catch (error) {
      if (!(error instanceof AsaasRefused) && !(error instanceof AsaasUnreachable)) throw error;
      this.logger.warn({ storeId, reason: error.message }, 'Could not register the Asaas webhook');
      return { id: null, state: 'ERROR', error: error.message };
    }
  }

  /** Never fails: a webhook left behind sends a token nobody recognizes any more, and its queue pauses on its own. */
  private async removeWebhook(config: AsaasConfig, row: StoreIntegrationModel): Promise<void> {
    if (!row.webhookId) return;
    try {
      const { apiKey } = JSON.parse(open(row.secretSealed, config.vaultKey, { storeId: row.storeId, provider: PROVIDER })) as SealedAsaas;
      await this.asaas.deleteWebhook(config, apiKey, row.webhookId);
    } catch (error) {
      this.logger.warn({ storeId: row.storeId, webhookId: row.webhookId, reason: error instanceof Error ? error.message : 'Unknown failure' }, 'Could not remove an Asaas webhook');
    }
  }

  /** One connect or disconnect at a time per shop, held while Asaas is asked: a lock of its own, so nothing else about the shop waits. */
  private exclusively<T>(storeId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`asaas:${storeId}`}, 0))`;
        return work(tx);
      },
      { timeout: LOCKED_TIMEOUT_MS },
    );
  }

  private config(): AsaasConfig {
    const config = asaasConfig();
    if (!config) throw new ServiceUnavailableException(integrationError('INTEGRATION_UNAVAILABLE', 'Asaas is not set up here'));
    return config;
  }
}
