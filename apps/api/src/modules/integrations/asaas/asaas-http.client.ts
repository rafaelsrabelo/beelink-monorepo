// Nest
import { Injectable } from '@nestjs/common';

// App
import {
  ASAAS_WEBHOOK_EVENTS,
  AsaasClient,
  AsaasOutcomeUnknown,
  AsaasRefused,
  AsaasUnreachable,
  type AsaasAccountInfo,
  type AsaasCharge,
  type AsaasChargeRequest,
  type AsaasCustomerRequest,
  type AsaasPixQrCode,
  type AsaasWebhookRequest,
} from './asaas.client.js';
import type { AsaasConfig } from './asaas.config.js';
import { centsOf, reaisOf } from './asaas-money.js';

const TIMEOUT_MS = 10_000;

const filled = (value: unknown): value is string => typeof value === 'string' && value.trim() !== '';

/** Asaas's refusal as `{ errors: [{ code, description }] }`: its first error, or nothing to go on. */
function refusalOf(answer: unknown): { code: string | null; reason: string } {
  const errors = (answer as { errors?: unknown } | null)?.errors;
  const first = (Array.isArray(errors) ? errors[0] : null) as { code?: unknown; description?: unknown } | null;
  return { code: filled(first?.code) ? first.code : null, reason: filled(first?.description) ? first.description : 'no reason given' };
}

/** Why no answer came, by the failure's name and code alone: fetch's own words repeat a header it could not send — the key. */
function failureOf(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown failure';
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === 'string' ? `${error.name}, ${code}` : error.name;
}

/** Asaas's page size at its largest, and how many pages of one order's charges are read: twelve instalments a try leaves room for dozens of tries. */
const PAGE_SIZE = 100;
const PAGES_MAX = 5;

const gone = (error: unknown) => error instanceof AsaasRefused && error.status === 404;

/** A charge read leniently: Asaas asks its clients not to break on a field it adds. Null when it has no id to be known by. */
function chargeOf(raw: unknown): AsaasCharge | null {
  const body = raw as Record<string, unknown> | null;
  if (!filled(body?.id)) return null;
  return {
    id: body.id,
    status: filled(body.status) ? body.status : 'UNKNOWN',
    deleted: body.deleted === true,
    billingType: filled(body.billingType) ? body.billingType : 'UNDEFINED',
    valueCents: typeof body.value === 'number' ? centsOf(body.value) : 0,
    dueDate: filled(body.dueDate) ? body.dueDate.slice(0, 10) : '',
    // It opens in the customer's browser: nothing but https is kept.
    invoiceUrl: filled(body.invoiceUrl) && body.invoiceUrl.startsWith('https://') ? body.invoiceUrl : null,
    installmentId: filled(body.installment) ? body.installment : null,
    installmentNumber: typeof body.installmentNumber === 'number' ? body.installmentNumber : null,
    externalReference: filled(body.externalReference) ? body.externalReference : null,
  };
}

/** `2022-06-24 23:59:59`, with no zone: Asaas's clock is Brasília's. */
function brasiliaInstantOf(value: unknown): Date | null {
  const match = filled(value) ? /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/.exec(value) : null;
  return match ? new Date(`${match[1]}T${match[2]}-03:00`) : null;
}

/**
 * Asaas over HTTP: `access_token` carries the shop's key, and the `User-Agent` names bee-link, which
 * Asaas requires. A 4xx is Asaas's no; a 5xx, a 429, a network failure or ten seconds of silence is not knowing.
 */
@Injectable()
export class AsaasHttpClient extends AsaasClient {
  async account(config: AsaasConfig, apiKey: string): Promise<AsaasAccountInfo> {
    const body = (await this.call(config, apiKey, 'GET', '/myAccount/commercialInfo/')) as Record<string, unknown> | null;
    // A company is known by its trading name; a person, or a company that gave none, by the name on file.
    const name = [body?.tradingName, body?.companyName, body?.name].find(filled);
    if (!name) throw new AsaasUnreachable('Asaas answered the account request without a name');

    // Letters are kept: a CNPJ issued since July 2026 may hold them in its first twelve places.
    const document = typeof body?.cpfCnpj === 'string' ? body.cpfCnpj.replace(/[^0-9a-z]/gi, '').toUpperCase() : '';
    return { name: name.trim(), document: document || null };
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

  async findCustomer(config: AsaasConfig, apiKey: string, cpf: string): Promise<string | null> {
    const answer = (await this.call(config, apiKey, 'GET', `/customers?cpfCnpj=${encodeURIComponent(cpf)}&limit=${PAGE_SIZE}`)) as { data?: unknown } | null;
    const customers = (Array.isArray(answer?.data) ? answer.data : []) as { id?: unknown; deleted?: unknown }[];
    const standing = customers.find((customer) => filled(customer.id) && customer.deleted !== true);
    return (standing?.id as string | undefined) ?? null;
  }

  async createCustomer(config: AsaasConfig, apiKey: string, customer: AsaasCustomerRequest): Promise<string> {
    const answer = (await this.call(config, apiKey, 'POST', '/customers', {
      name: customer.name,
      cpfCnpj: customer.cpf,
      externalReference: customer.externalReference,
      // bee-link tells the customer; Asaas's own e-mails and SMS are charged to the shop.
      notificationDisabled: true,
    })) as { id?: unknown } | null;
    if (!filled(answer?.id)) throw new AsaasUnreachable('Asaas answered the customer without an id');
    return answer.id;
  }

  async charges(config: AsaasConfig, apiKey: string, externalReference: string): Promise<AsaasCharge[]> {
    const found: AsaasCharge[] = [];
    for (let page = 0; page < PAGES_MAX; page += 1) {
      const query = `externalReference=${encodeURIComponent(externalReference)}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`;
      const answer = (await this.call(config, apiKey, 'GET', `/payments?${query}`)) as { data?: unknown; hasMore?: unknown } | null;
      if (!Array.isArray(answer?.data)) throw new AsaasUnreachable('Asaas answered the charges without a list');
      for (const raw of answer.data) {
        const charge = chargeOf(raw);
        if (charge && !charge.deleted) found.push(charge);
      }
      if (answer.hasMore !== true) break;
    }
    return found;
  }

  async charge(config: AsaasConfig, apiKey: string, id: string): Promise<AsaasCharge | null> {
    const answer = await this.call(config, apiKey, 'GET', `/payments/${encodeURIComponent(id)}`).catch((error: unknown) => {
      if (gone(error)) return null;
      throw error;
    });
    return chargeOf(answer);
  }

  async createCharge(config: AsaasConfig, apiKey: string, charge: AsaasChargeRequest): Promise<AsaasCharge> {
    const answer = await this.call(config, apiKey, 'POST', '/payments', {
      customer: charge.customerId,
      billingType: charge.billingType,
      // In full, the value; split, the count and the total — Asaas works the instalment out and puts the rounding on the last.
      ...(charge.installments > 1 ? { installmentCount: charge.installments, totalValue: reaisOf(charge.totalCents) } : { value: reaisOf(charge.totalCents) }),
      dueDate: charge.dueDate,
      description: charge.description.slice(0, 500),
      externalReference: charge.externalReference,
    }).catch((error: unknown) => {
      // Refused is an answer. Anything else left a request that may have been carried out.
      if (error instanceof AsaasUnreachable) throw new AsaasOutcomeUnknown(error.message);
      throw error;
    });
    const created = chargeOf(answer);
    if (!created) throw new AsaasOutcomeUnknown('Asaas answered the charge without an id');
    return created;
  }

  async deleteCharge(config: AsaasConfig, apiKey: string, id: string): Promise<void> {
    await this.call(config, apiKey, 'DELETE', `/payments/${encodeURIComponent(id)}`).catch((error: unknown) => {
      if (!gone(error)) throw error;
    });
  }

  async deleteInstallment(config: AsaasConfig, apiKey: string, id: string): Promise<void> {
    await this.call(config, apiKey, 'DELETE', `/installments/${encodeURIComponent(id)}`).catch((error: unknown) => {
      if (!gone(error)) throw error;
    });
  }

  async pixQrCode(config: AsaasConfig, apiKey: string, id: string): Promise<AsaasPixQrCode> {
    const answer = (await this.call(config, apiKey, 'GET', `/payments/${encodeURIComponent(id)}/pixQrCode`)) as Record<string, unknown> | null;
    if (!filled(answer?.payload) || !filled(answer.encodedImage)) throw new AsaasUnreachable('Asaas answered the Pix code without a code');
    return { payload: answer.payload, encodedImage: answer.encodedImage, expiresAt: brasiliaInstantOf(answer.expirationDate) };
  }

  private async call(config: AsaasConfig, apiKey: string, method: 'GET' | 'POST' | 'DELETE', path: string, body?: object): Promise<unknown> {
    const init: RequestInit = {
      method,
      headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': config.userAgent, access_token: apiKey },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    };
    if (body) init.body = JSON.stringify(body);

    const response = await fetch(`${config.baseUrl}${path}`, init).catch((error: unknown) => {
      throw new AsaasUnreachable(`Asaas did not answer (${failureOf(error)})`);
    });

    const answer: unknown = await response.json().catch(() => null);
    // Too many requests decides nothing about the key either: later, the same call may pass.
    if (response.status >= 500 || response.status === 429) throw new AsaasUnreachable(`Asaas failed (${response.status})`);
    if (!response.ok) {
      const { code, reason } = refusalOf(answer);
      // Asaas's words, never the request's — and the key cut out should they ever echo it.
      throw new AsaasRefused(response.status, code, apiKey ? reason.split(apiKey).join('[key]') : reason);
    }
    return answer;
  }
}
