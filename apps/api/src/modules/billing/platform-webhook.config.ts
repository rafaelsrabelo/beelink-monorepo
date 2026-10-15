// Node
import { createHash, timingSafeEqual } from 'node:crypto';

// App
import { publicWebhookUrl } from '../../shared/asaas/asaas-webhook-url.js';
import { env } from '../../shared/config/env.js';
import { PLATFORM_WEBHOOK_PATH } from './billing.constants.js';

/*
  bee-link's own Asaas webhook as this deployment was set up for it (BEELINK-221), and the one read
  of `ASAAS_PLATFORM_WEBHOOK_TOKEN` in the API (gate `api/platform-webhook-token-in-billing`): the
  token is handed to Asaas when the webhook is registered, and compared with what a delivery carries.
  Nothing logs or answers it.
*/

/** Where Asaas posts the events of bee-link's own account: the web's route, on a public https address; null where Asaas could not reach it. */
export const platformWebhookUrl = (): string | null => publicWebhookUrl(env.WEB_URL, PLATFORM_WEBHOOK_PATH);

/** The token the webhook is registered with; null when this deployment was given none — then none is registered, and every delivery is refused. */
export const platformWebhookToken = (): string | null => env.ASAAS_PLATFORM_WEBHOOK_TOKEN ?? null;

const digestOf = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

/**
 * Whether a delivery carries this deployment's token. Compared in constant time, over digests of one
 * length: a guess learns neither the token nor its length from how long the answer took.
 */
export function carriesPlatformToken(given: string | undefined): boolean {
  const kept = platformWebhookToken();
  if (!kept || typeof given !== 'string' || given === '') return false;
  return timingSafeEqual(digestOf(given), digestOf(kept));
}
