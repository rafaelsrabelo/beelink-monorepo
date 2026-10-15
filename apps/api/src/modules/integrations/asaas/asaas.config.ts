// Types
import type { AsaasEnvironment } from '@harness-monorepo/contracts';

// App
import { ASAAS_BASE_URLS } from '../../../shared/asaas/asaas-environment.js';
import { publicWebhookUrl } from '../../../shared/asaas/asaas-webhook-url.js';
import { env } from '../../../shared/config/env.js';
import { vaultKeyOf } from '../secret-vault.js';

// The key's prefixes are kept beside the addresses, where the boot reads them too; named from here as they always were.
export { ASAAS_KEY_PREFIXES } from '../../../shared/asaas/asaas-environment.js';

/** Where this deployment's Asaas answers, how bee-link names itself there, and where a shop's events go. */
export interface AsaasConfig {
  environment: AsaasEnvironment;
  /** Up to `/v3`, with no slash after it. */
  baseUrl: string;
  /** Asaas refuses a request without one from an account created since June 2024. */
  userAgent: string;
  /** Who Asaas warns about a webhook whose queue it paused. */
  contactEmail: string;
  /** Where Asaas posts a shop's payment events; null when the web is not public https, and then none is registered. */
  webhookUrl: string | null;
  vaultKey: Buffer;
}

/** The web's route that hands Asaas's events to the API (BEELINK-206), the same for every shop: the token says which. */
const WEBHOOK_PATH = '/api/integrations/asaas/webhook';

/** Asaas cannot reach a development machine: a webhook registered there would only pile up failures until it pauses. */
export function publicWebhookUrlOf(webUrl: string): string | null {
  return publicWebhookUrl(webUrl, WEBHOOK_PATH);
}

export const asaasEnvironment = (): AsaasEnvironment => (env.ASAAS_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX');

/** This deployment's Asaas, or null when it has nowhere to seal a key — then no shop can connect here. */
export function asaasConfig(): AsaasConfig | null {
  if (!env.INTEGRATIONS_SECRET_KEY) return null;

  const environment = asaasEnvironment();
  return {
    environment,
    baseUrl: ASAAS_BASE_URLS[environment],
    userAgent: `bee-link (${env.ASAAS_CONTACT_EMAIL})`,
    contactEmail: env.ASAAS_CONTACT_EMAIL,
    webhookUrl: publicWebhookUrlOf(env.WEB_URL),
    vaultKey: vaultKeyOf(env.INTEGRATIONS_SECRET_KEY),
  };
}
