// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { PLATFORM_WEBHOOK_NAME, WEBHOOK_LOOK_EVERY_MS, WEBHOOK_LOOK_RETRY_MS } from './billing.constants.js';
import { PlatformAsaas } from './platform-asaas.client.js';
import { platformWebhookToken, platformWebhookUrl } from './platform-webhook.config.js';

/** What a look at bee-link's own webhook came to. */
export type WebhookStanding = 'SKIPPED' | 'STANDING' | 'REGISTERED' | 'RESUMED';

/**
 * Keeps bee-link's own Asaas webhook registered and sending (BEELINK-221), as `AsaasWebhookKeeper`
 * does a shop's: only where this deployment charges, has the key and the token, and a web Asaas can
 * reach. It looks among the account's webhooks for its own address before it registers one — the
 * account is shared — and one found off or with its queue interrupted is set going again, with the
 * token handed anew: Asaas never gives a token back, so one changed in the environment only reaches
 * it this way. Once a day in this process; an hour after a look that failed.
 */
@Injectable()
export class PlatformWebhookKeeper {
  private readonly logger = new Logger(PlatformWebhookKeeper.name);
  private nextLookAt = 0;

  constructor(private readonly asaas: PlatformAsaas) {}

  /** The look, when its turn came: the first pass after the boot, and then once a day. */
  async checkDue(now: Date): Promise<WebhookStanding | null> {
    if (now.getTime() < this.nextLookAt) return null;
    this.nextLookAt = now.getTime() + WEBHOOK_LOOK_EVERY_MS;
    try {
      return await this.keep();
    } catch (error) {
      this.nextLookAt = now.getTime() + WEBHOOK_LOOK_RETRY_MS;
      throw error;
    }
  }

  async keep(): Promise<WebhookStanding> {
    const url = platformWebhookUrl();
    const authToken = platformWebhookToken();
    if (!env.BILLING_ENFORCED || !this.asaas.configured || !url || !authToken) return 'SKIPPED';

    const standing = (await this.asaas.webhooks()).find((webhook) => webhook.url === url) ?? null;
    if (!standing) {
      await this.asaas.createWebhook({ name: PLATFORM_WEBHOOK_NAME, url, email: env.ASAAS_CONTACT_EMAIL, authToken });
      this.logger.log("bee-link's own Asaas webhook was registered");
      return 'REGISTERED';
    }
    if (standing.enabled && !standing.interrupted) return 'STANDING';

    await this.asaas.resumeWebhook(standing.id, authToken);
    this.logger.warn({ webhookId: standing.id, enabled: standing.enabled, interrupted: standing.interrupted }, "bee-link's own Asaas webhook had stopped sending, and was set going again");
    return 'RESUMED';
  }
}
