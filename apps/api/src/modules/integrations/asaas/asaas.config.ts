// Types
import type { AsaasEnvironment } from '@harness-monorepo/contracts';

// App
import { env } from '../../../shared/config/env.js';
import { vaultKeyOf } from '../secret-vault.js';

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

const BASE_URLS: Record<AsaasEnvironment, string> = {
  SANDBOX: 'https://api-sandbox.asaas.com/v3',
  PRODUCTION: 'https://api.asaas.com/v3',
};

/** A key says which Asaas it is for in its first characters; one with neither is an older key, and Asaas itself decides. */
export const ASAAS_KEY_PREFIXES: Record<AsaasEnvironment, string> = {
  SANDBOX: '$aact_hmlg_',
  PRODUCTION: '$aact_prod_',
};

/** The web's route that hands Asaas's events to the API (BEELINK-206), the same for every shop: the token says which. */
const WEBHOOK_PATH = '/api/integrations/asaas/webhook';

const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|\[::1\])$|\.localhost$/;

/** Asaas cannot reach a development machine: a webhook registered there would only pile up failures until it pauses. */
export function publicWebhookUrlOf(webUrl: string): string | null {
  const web = new URL(webUrl);
  if (web.protocol !== 'https:' || LOOPBACK.test(web.hostname)) return null;
  return new URL(WEBHOOK_PATH, web).toString();
}

export const asaasEnvironment = (): AsaasEnvironment => (env.ASAAS_ENV === 'production' ? 'PRODUCTION' : 'SANDBOX');

/** This deployment's Asaas, or null when it has nowhere to seal a key — then no shop can connect here. */
export function asaasConfig(): AsaasConfig | null {
  if (!env.INTEGRATIONS_SECRET_KEY) return null;

  const environment = asaasEnvironment();
  return {
    environment,
    baseUrl: BASE_URLS[environment],
    userAgent: `bee-link (${env.ASAAS_CONTACT_EMAIL})`,
    contactEmail: env.ASAAS_CONTACT_EMAIL,
    webhookUrl: publicWebhookUrlOf(env.WEB_URL),
    vaultKey: vaultKeyOf(env.INTEGRATIONS_SECRET_KEY),
  };
}
