// Nest
import { Injectable } from '@nestjs/common';

// App
import { ASAAS_WEBHOOK_EVENTS, AsaasClient, AsaasRefused, AsaasUnreachable, type AsaasAccountInfo, type AsaasWebhookRequest } from './asaas.client.js';
import type { AsaasConfig } from './asaas.config.js';

const TIMEOUT_MS = 10_000;

const filled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Asaas's refusal as `{ errors: [{ code, description }] }`: its first error, or nothing to go on. */
function refusalOf(answer: unknown): { code: string | null; reason: string } {
  const errors = (answer as { errors?: unknown } | null)?.errors;
  const first = (Array.isArray(errors) ? errors[0] : null) as { code?: unknown; description?: unknown } | null;
  return { code: filled(first?.code) ? first.code : null, reason: filled(first?.description) ? first.description : 'no reason given' };
}

/**
 * Asaas over HTTP: `access_token` carries the shop's key, and the `User-Agent` names bee-link, which
 * Asaas requires. A 4xx is Asaas's no; a 5xx, a network failure or ten seconds of silence is not knowing.
 */
@Injectable()
export class AsaasHttpClient extends AsaasClient {
  async account(config: AsaasConfig, apiKey: string): Promise<AsaasAccountInfo> {
    const body = (await this.call(config, apiKey, 'GET', '/myAccount/commercialInfo/')) as Record<string, unknown> | null;
    // A company is known by its trading name; a person, or a company that gave none, by the name on file.
    const name = [body?.tradingName, body?.companyName, body?.name].find(filled);
    if (!name) throw new AsaasUnreachable('Asaas answered the account request without a name');

    const digits = typeof body?.cpfCnpj === 'string' ? body.cpfCnpj.replace(/\D/g, '') : '';
    return { name: name.trim(), document: digits || null };
  }

  async createWebhook(config: AsaasConfig, apiKey: string, webhook: AsaasWebhookRequest): Promise<string> {
    const answer = (await this.call(config, apiKey, 'POST', '/webhooks', {
      name: webhook.name,
      url: webhook.url,
      email: webhook.email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: webhook.authToken,
      // In order: a refund must not arrive before the payment it refunds.
      sendType: 'SEQUENTIALLY',
      events: ASAAS_WEBHOOK_EVENTS,
    })) as { id?: unknown } | null;
    if (!filled(answer?.id)) throw new AsaasUnreachable('Asaas answered the webhook without an id');
    return answer.id;
  }

  async deleteWebhook(config: AsaasConfig, apiKey: string, id: string): Promise<void> {
    await this.call(config, apiKey, 'DELETE', `/webhooks/${encodeURIComponent(id)}`).catch((error: unknown) => {
      if (error instanceof AsaasRefused && error.status === 404) return;
      throw error;
    });
  }

  private async call(config: AsaasConfig, apiKey: string, method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': config.userAgent, access_token: apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    };
    if (body) init.body = JSON.stringify(body);

    const response = await fetch(`${config.baseUrl}${path}`, init).catch((error: unknown) => {
      throw new AsaasUnreachable(error instanceof Error ? error.message : 'Asaas did not answer');
    });

    const answer: unknown = await response.json().catch(() => null);
    if (response.status >= 500) throw new AsaasUnreachable(`Asaas failed (${response.status})`);
    if (!response.ok) {
      const { code, reason } = refusalOf(answer);
      // Asaas's words, never the request's — and the key cut out should they ever echo it.
      throw new AsaasRefused(response.status, code, apiKey ? reason.split(apiKey).join('[key]') : reason);
    }
    return answer;
  }
}
