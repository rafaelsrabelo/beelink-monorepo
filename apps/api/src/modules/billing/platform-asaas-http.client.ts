// App
import { asaasCall, filled, gone, type AsaasEndpoint, type AsaasMethod } from '../../shared/asaas/asaas-call.js';
import { AsaasOutcomeUnknown, AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../../shared/asaas/asaas-errors.js';
import { centsOf, reaisOf } from '../integrations/asaas/asaas-money.js';
import { PLATFORM_WEBHOOK_EVENTS } from './billing.constants.js';
import {
  PlatformAsaas,
  PlatformAsaasUnconfigured,
  type PlatformCard,
  type PlatformCharge,
  type PlatformCustomer,
  type PlatformCustomerData,
  type PlatformCustomerRequest,
  type PlatformSubscription,
  type PlatformSubscriptionRequest,
  type PlatformWebhook,
  type PlatformWebhookRequest,
} from './platform-asaas.client.js';

/** Where bee-link's own account answers, and the key that opens it. */
export interface PlatformAsaasAccess extends AsaasEndpoint {
  apiKey: string;
}

/** Asaas's page size at its largest. A subscription makes one charge a cycle: five pages are forty years of months. */
const PAGE_SIZE = 100;
const PAGES_MAX = 5;

/** How long the account is left alone after a 429 that named no time. */
const THROTTLE_FALLBACK_MS = 5 * 60_000;

const dayOf = (value: unknown): string | null => (filled(value) && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);

/** A document as Asaas holds it, whichever way it was written there: its digits and capital letters. */
const documentOf = (value: unknown): string => (typeof value === 'string' ? value.replace(/[^0-9a-z]/gi, '').toUpperCase() : '');

/** Field by field: the token Asaas sends beside these two has nowhere to go. */
function cardOf(raw: unknown): PlatformCard | null {
  const card = raw as { creditCardBrand?: unknown; creditCardNumber?: unknown } | null;
  if (!filled(card?.creditCardBrand) || typeof card.creditCardNumber !== 'string' || !/^\d{4}$/.test(card.creditCardNumber)) return null;
  return { brand: card.creditCardBrand, last4: card.creditCardNumber };
}

/** A webhook read leniently, as a shop's is: one Asaas does not say is off is on. Null for one with no id. */
function webhookOf(raw: unknown): PlatformWebhook | null {
  const body = raw as Record<string, unknown> | null;
  if (!filled(body?.id)) return null;
  return { id: body.id, url: filled(body.url) ? body.url : '', enabled: body.enabled !== false, interrupted: body.interrupted === true };
}

/** A refusal with the webhook's token cut out of Asaas's words, should they ever repeat what was sent: they go on to a log. */
const tokenless =
  (token: string) =>
  (error: unknown): never => {
    if (!(error instanceof AsaasRefused)) throw error;
    const cut = (said: string): string => said.split(token).join('[token]');
    throw new AsaasRefused(error.status, error.code === null ? null : cut(error.code), cut(error.reason));
  };

/**
 * A request that makes something, left with no answer. Refused is an answer, and so is a 429: Asaas
 * turned the request away before it did anything. Anything else may have been carried out.
 */
function unansweredIsUnknown(error: unknown): never {
  if (error instanceof AsaasUnreachable && !(error instanceof AsaasThrottled)) throw new AsaasOutcomeUnknown(error.message);
  throw error;
}

/** A customer read leniently; null for one with no id, and for one removed. */
function customerOf(raw: unknown): (PlatformCustomer & { externalReference: string | null }) | null {
  const body = raw as Record<string, unknown> | null;
  if (!filled(body?.id) || body.deleted === true) return null;
  return {
    id: body.id,
    name: filled(body.name) ? body.name : '',
    document: documentOf(body.cpfCnpj),
    email: filled(body.email) ? body.email.trim().toLowerCase() : '',
    externalReference: filled(body.externalReference) ? body.externalReference : null,
  };
}

function subscriptionOf(raw: unknown): PlatformSubscription | null {
  const body = raw as Record<string, unknown> | null;
  if (!filled(body?.id)) return null;
  return {
    id: body.id,
    status: filled(body.status) ? body.status : 'UNKNOWN',
    deleted: body.deleted === true,
    customerId: filled(body.customer) ? body.customer : null,
    valueCents: typeof body.value === 'number' ? centsOf(body.value) : 0,
    cycle: filled(body.cycle) ? body.cycle : 'UNKNOWN',
    billingType: filled(body.billingType) ? body.billingType : 'UNDEFINED',
    nextDueDate: dayOf(body.nextDueDate) ?? '',
    externalReference: filled(body.externalReference) ? body.externalReference : null,
    card: cardOf(body.creditCard),
  };
}

/** A charge read leniently: Asaas asks its clients not to break on a field it adds. Null for one with no id, and for one removed. */
function chargeOf(raw: unknown): PlatformCharge | null {
  const body = raw as Record<string, unknown> | null;
  if (!filled(body?.id) || body.deleted === true) return null;
  return {
    id: body.id,
    status: filled(body.status) ? body.status : 'UNKNOWN',
    billingType: filled(body.billingType) ? body.billingType : 'UNDEFINED',
    valueCents: typeof body.value === 'number' ? centsOf(body.value) : 0,
    dueDate: dayOf(body.dueDate) ?? '',
    paymentDate: dayOf(body.paymentDate),
    confirmedDate: dayOf(body.confirmedDate),
    // It opens in the shopkeeper's browser: nothing but https is kept.
    invoiceUrl: filled(body.invoiceUrl) && body.invoiceUrl.startsWith('https://') ? body.invoiceUrl : null,
    subscriptionId: filled(body.subscription) ? body.subscription : null,
    externalReference: filled(body.externalReference) ? body.externalReference : null,
    card: cardOf(body.creditCard),
  };
}

/**
 * bee-link's own Asaas account over HTTP, through the one request a shop's account is asked by
 * (`shared/asaas/asaas-call.ts`): its ten seconds, its refusals, and its errors that never carry a key.
 *
 * The key lives in a private field no log, `JSON.stringify` or inspection reaches, and no method
 * answers it. A 429 is remembered: until the time Asaas named, the account is not asked at all — its
 * quota is one for every shopkeeper. In this process's memory; another process learns from its own.
 */
export class PlatformAsaasHttpClient extends PlatformAsaas {
  readonly #access: PlatformAsaasAccess | null;
  #throttledUntil: Date | null = null;

  constructor(access: PlatformAsaasAccess | null) {
    super();
    this.#access = access;
  }

  get configured(): boolean {
    return this.#access !== null;
  }

  async customers(externalReference: string): Promise<PlatformCustomer[]> {
    const answer = (await this.call('GET', `/customers?externalReference=${encodeURIComponent(externalReference)}&limit=${PAGE_SIZE}`)) as { data?: unknown } | null;
    // An answer that cannot be read must not pass for "none": a second customer would be made.
    if (!Array.isArray(answer?.data)) throw new AsaasUnreachable('Asaas answered the customers without a list');

    const found: PlatformCustomer[] = [];
    for (const raw of answer.data) {
      const customer = customerOf(raw);
      // Asaas matches the reference whatever its case: only the very same one is bee-link's.
      if (customer?.externalReference !== externalReference) continue;
      found.push({ id: customer.id, name: customer.name, document: customer.document, email: customer.email });
    }
    return found;
  }

  async createCustomer(customer: PlatformCustomerRequest): Promise<string> {
    const answer = (await this.call('POST', '/customers', {
      name: customer.name,
      cpfCnpj: customer.document,
      email: customer.email,
      externalReference: customer.externalReference,
      // bee-link tells the shopkeeper; Asaas's own e-mails and SMS would reach them from a sender they do not know.
      notificationDisabled: true,
    }).catch(unansweredIsUnknown)) as { id?: unknown } | null;
    if (!filled(answer?.id)) throw new AsaasOutcomeUnknown('Asaas answered the customer without an id');
    return answer.id;
  }

  async updateCustomer(id: string, customer: PlatformCustomerData): Promise<void> {
    // Only what is sent changes: the reference and the notifications stay as the creation left them.
    await this.call('PUT', `/customers/${encodeURIComponent(id)}`, { name: customer.name, cpfCnpj: customer.document, email: customer.email });
  }

  async subscriptions(externalReference: string): Promise<PlatformSubscription[]> {
    const answer = (await this.call('GET', `/subscriptions?externalReference=${encodeURIComponent(externalReference)}&limit=${PAGE_SIZE}`)) as { data?: unknown } | null;
    // An answer that cannot be read must not pass for "none": a second subscription would be made.
    if (!Array.isArray(answer?.data)) throw new AsaasUnreachable('Asaas answered the subscriptions without a list');

    const found: PlatformSubscription[] = [];
    for (const raw of answer.data) {
      const subscription = subscriptionOf(raw);
      // Asaas matches the reference whatever its case: only the very same one is this page's.
      if (!subscription || subscription.deleted || subscription.externalReference !== externalReference) continue;
      found.push(subscription);
    }
    return found;
  }

  async createSubscription(request: PlatformSubscriptionRequest): Promise<PlatformSubscription> {
    const answer = await this.call('POST', '/subscriptions', {
      customer: request.customerId,
      // Never a method of bee-link's choosing: the shopkeeper picks a card, Pix or a boleto at Asaas's invoice.
      billingType: 'UNDEFINED',
      value: reaisOf(request.valueCents),
      nextDueDate: request.firstDueDay,
      cycle: request.cycle,
      description: request.description,
      externalReference: request.externalReference,
    }).catch(unansweredIsUnknown);
    const subscription = subscriptionOf(answer);
    if (!subscription) throw new AsaasOutcomeUnknown('Asaas answered the subscription without an id');
    return subscription;
  }

  async removeSubscription(id: string): Promise<void> {
    const answer = (await this.call('DELETE', `/subscriptions/${encodeURIComponent(id)}`).catch((error: unknown) => {
      if (gone(error)) return { deleted: true };
      throw error;
    })) as { deleted?: unknown } | null;
    // Only Asaas saying so is "removed": another would be made beside one that still stands.
    if (answer?.deleted !== true) throw new AsaasUnreachable('Asaas answered the removal without saying it was done');
  }

  async subscription(id: string): Promise<PlatformSubscription | null> {
    const answer = await this.call('GET', `/subscriptions/${encodeURIComponent(id)}`).catch((error: unknown) => {
      if (gone(error)) return undefined;
      throw error;
    });
    if (answer === undefined) return null;
    // Only a 404 is "none such": an answer that cannot be read must not pass for a subscription that is gone.
    const subscription = subscriptionOf(answer);
    if (!subscription) throw new AsaasUnreachable('Asaas answered the subscription without an id');
    return subscription;
  }

  async subscriptionCharges(id: string): Promise<PlatformCharge[]> {
    const found: PlatformCharge[] = [];
    for (let page = 0; page < PAGES_MAX; page += 1) {
      const answer = (await this.call('GET', `/subscriptions/${encodeURIComponent(id)}/payments?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)) as { data?: unknown; hasMore?: unknown } | null;
      if (!Array.isArray(answer?.data)) throw new AsaasUnreachable('Asaas answered the charges without a list');
      for (const raw of answer.data) {
        const charge = chargeOf(raw);
        if (charge) found.push(charge);
      }
      if (answer.hasMore !== true) break;
    }
    return found;
  }

  async webhooks(): Promise<PlatformWebhook[]> {
    const found: PlatformWebhook[] = [];
    for (let page = 0; page < PAGES_MAX; page += 1) {
      const answer = (await this.call('GET', `/webhooks?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`)) as { data?: unknown; hasMore?: unknown } | null;
      // An answer that cannot be read must not pass for "none": a second webhook would be registered.
      if (!Array.isArray(answer?.data)) throw new AsaasUnreachable('Asaas answered the webhooks without a list');
      for (const raw of answer.data) {
        const webhook = webhookOf(raw);
        if (webhook) found.push(webhook);
      }
      if (answer.hasMore !== true) break;
    }
    return found;
  }

  async createWebhook(webhook: PlatformWebhookRequest): Promise<string> {
    const answer = (await this.call('POST', '/webhooks', {
      name: webhook.name,
      url: webhook.url,
      email: webhook.email,
      enabled: true,
      interrupted: false,
      apiVersion: 3,
      authToken: webhook.authToken,
      // In order: a refund must not arrive before the payment it refunds.
      sendType: 'SEQUENTIALLY',
      events: PLATFORM_WEBHOOK_EVENTS,
    }).catch(tokenless(webhook.authToken))) as { id?: unknown } | null;
    if (!filled(answer?.id)) throw new AsaasUnreachable('Asaas answered the webhook without an id');
    return answer.id;
  }

  async resumeWebhook(id: string, authToken: string): Promise<void> {
    await this.call('PUT', `/webhooks/${encodeURIComponent(id)}`, { enabled: true, interrupted: false, authToken }).catch(tokenless(authToken));
  }

  private async call(method: AsaasMethod, path: string, body?: object): Promise<unknown> {
    const access = this.#access;
    if (!access) throw new PlatformAsaasUnconfigured();
    if (this.#throttledUntil && this.#throttledUntil > new Date()) throw new AsaasThrottled("Asaas asked to wait before bee-link's own account is asked again", this.#throttledUntil);
    this.#throttledUntil = null;

    try {
      return await asaasCall(access, access.apiKey, method, path, body);
    } catch (error) {
      if (error instanceof AsaasThrottled) this.#throttledUntil = error.retryAt ?? new Date(Date.now() + THROTTLE_FALLBACK_MS);
      throw error;
    }
  }
}
