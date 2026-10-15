// App
import {
  PlatformAsaas,
  type PlatformCharge,
  type PlatformCustomer,
  type PlatformCustomerData,
  type PlatformCustomerRequest,
  type PlatformSubscription,
  type PlatformSubscriptionRequest,
  type PlatformWebhook,
  type PlatformWebhookRequest,
} from '../../src/modules/billing/platform-asaas.client.js';
import { AsaasOutcomeUnknown, AsaasRefused } from '../../src/shared/asaas/asaas-errors.js';

type Call = 'customers' | 'createCustomer' | 'updateCustomer' | 'subscriptions' | 'createSubscription' | 'removeSubscription' | 'subscription' | 'subscriptionCharges' | 'webhooks' | 'createWebhook' | 'resumeWebhook';

/** A webhook as the account keeps it: with the token it was registered with, which no read gives back. */
interface FakeWebhook extends PlatformWebhook {
  authToken: string;
  name: string;
}

interface FakeCustomer extends PlatformCustomerRequest {
  id: string;
  deleted: boolean;
}

interface FakeCharge extends PlatformCharge {
  deleted: boolean;
}

/** The two ways a charge only waits: what a removal takes with the subscription. */
const WAITING = ['PENDING', 'OVERDUE'];

/**
 * bee-link's own Asaas account, in memory, as far as a shopkeeper's customer and a page's subscription
 * go — and as the sandbox was seen to behave on 13/10/2026.
 *
 * Customers: it takes two under one reference, lists only those not removed, changes one by its id,
 * and refuses to change one that was removed (a 400) or that never existed (a 404).
 *
 * Subscriptions: it takes two under one reference too, and lists only those not removed. One is made
 * `ACTIVE`, with no way of paying, and with its first charge at once — `PENDING`, due on the day
 * asked, with an invoice — while the `nextDueDate` it answers is already the charge after. Removing
 * one marks it removed and `INACTIVE`, takes its waiting charges and keeps the paid ones; removing it
 * again changes nothing. It refuses to make one for a customer that was removed, by its catch-all
 * code, and removing a customer removes its subscriptions.
 *
 * Webhooks (BEELINK-221): it keeps them with their token, which a read never gives back, and holds
 * another product's beside bee-link's.
 *
 * A test steers it: `failing` makes the next call of a kind throw, `before` runs ahead of one (to
 * hold it open, or to change the world meanwhile), and `unanswered` / `unansweredSubscriptions` are
 * creations Asaas carried out and never answered. `remove` is somebody deleting the customer at
 * Asaas's own panel; `pay` is the shopkeeper paying at the invoice — any status Asaas gives a charge,
 * `refund` the money given back.
 */
export class FakePlatformAsaas extends PlatformAsaas {
  configured = true;
  readonly calls: Call[] = [];
  readonly held: FakeCustomer[] = [];
  readonly subscriptionsHeld: PlatformSubscription[] = [];
  readonly charges: FakeCharge[] = [];
  /** What `createSubscription` was asked, in order. */
  readonly asked: PlatformSubscriptionRequest[] = [];
  readonly webhooksHeld: FakeWebhook[] = [];
  /** How many customer creations to come are made and then not answered. */
  unanswered = 0;
  /** The same, of subscriptions. */
  unansweredSubscriptions = 0;
  /** How many subscriptions to come are made with their first charge not there yet. */
  chargeless = 0;
  /** Subscriptions the search by reference does not bring, though they stand: a list that lags. */
  readonly unlisted = new Set<string>();
  private readonly failures = new Map<Call, unknown[]>();
  private readonly hooks = new Map<Call, () => unknown>();
  private sequence = 0;

  reset(): void {
    this.configured = true;
    this.calls.length = 0;
    this.held.length = 0;
    this.subscriptionsHeld.length = 0;
    this.charges.length = 0;
    this.asked.length = 0;
    this.webhooksHeld.length = 0;
    this.unanswered = 0;
    this.unansweredSubscriptions = 0;
    this.chargeless = 0;
    this.unlisted.clear();
    this.failures.clear();
    this.hooks.clear();
  }

  /** The next call of this kind throws `error`, having done nothing. */
  failing(call: Call, error: unknown): void {
    this.failures.set(call, [...(this.failures.get(call) ?? []), error]);
  }

  /** What a hook answers is not read: it is awaited, so one that returns a promise holds the call until it settles. */
  before(call: Call, hook: (() => unknown) | null): void {
    if (hook) this.hooks.set(call, hook);
    else this.hooks.delete(call);
  }

  count(call: Call): number {
    return this.calls.filter((made) => made === call).length;
  }

  /** The customers still standing — not removed. */
  get standing(): FakeCustomer[] {
    return this.held.filter((customer) => !customer.deleted);
  }

  /** The subscriptions still standing — not removed. */
  get standingSubscriptions(): PlatformSubscription[] {
    return this.subscriptionsHeld.filter((subscription) => !subscription.deleted);
  }

  /** A customer put there by something other than this run: a request that died after Asaas made it. */
  plant(customer: PlatformCustomerRequest): string {
    this.sequence += 1;
    const id = `cus_fake${String(this.sequence).padStart(8, '0')}`;
    this.held.push({ id, ...customer, deleted: false });
    return id;
  }

  /** A customer removed, and its subscriptions with it. */
  remove(id: string): void {
    const found = this.held.find((customer) => customer.id === id);
    if (!found) throw new Error(`The fake Asaas holds no customer ${id}`);
    found.deleted = true;
    for (const subscription of this.subscriptionsHeld) {
      if (subscription.customerId === id) this.take(subscription);
    }
  }

  /** A subscription put there as Asaas makes one, by something other than this run when a test calls it. */
  plantSubscription(request: PlatformSubscriptionRequest, { charged = true } = {}): PlatformSubscription {
    this.sequence += 1;
    const subscription: PlatformSubscription = {
      id: `sub_fake${String(this.sequence).padStart(8, '0')}`,
      status: 'ACTIVE',
      deleted: false,
      customerId: request.customerId,
      valueCents: request.valueCents,
      cycle: request.cycle,
      billingType: 'UNDEFINED',
      // Already the charge after the first, as the sandbox answered: the first due day is not read from here.
      nextDueDate: `${Number(request.firstDueDay.slice(0, 4)) + 1}${request.firstDueDay.slice(4)}`,
      externalReference: request.externalReference,
      card: null,
    };
    this.subscriptionsHeld.push(subscription);
    if (charged) this.charge(subscription.id, request.firstDueDay);
    return subscription;
  }

  /** A charge Asaas makes for a subscription: waiting, with its invoice. */
  charge(subscriptionId: string, dueDate: string): FakeCharge {
    const subscription = this.subscriptionsHeld.find((each) => each.id === subscriptionId);
    if (!subscription) throw new Error(`The fake Asaas holds no subscription ${subscriptionId}`);
    this.sequence += 1;
    const code = `fake${String(this.sequence).padStart(8, '0')}`;
    const charge: FakeCharge = {
      id: `pay_${code}`,
      status: 'PENDING',
      billingType: 'UNDEFINED',
      valueCents: subscription.valueCents,
      dueDate,
      paymentDate: null,
      confirmedDate: null,
      invoiceUrl: `https://sandbox.asaas.com/i/${code}`,
      subscriptionId,
      externalReference: subscription.externalReference,
      card: null,
      deleted: false,
    };
    this.charges.push(charge);
    return charge;
  }

  /** The shopkeeper paid at the invoice: the subscription's earliest charge takes this status — and, told, how it was paid. */
  pay(subscriptionId: string, status = 'CONFIRMED', change: Partial<PlatformCharge> = {}): FakeCharge {
    const [first] = this.charges.filter((charge) => charge.subscriptionId === subscriptionId && !charge.deleted).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    if (!first) throw new Error(`The fake Asaas holds no charge of ${subscriptionId}`);
    Object.assign(first, { status, ...change });
    return first;
  }

  /** The given back: Asaas leaves the subscription standing. */
  refund(chargeId: string, status = 'REFUNDED'): void {
    const found = this.charges.find((charge) => charge.id === chargeId);
    if (!found) throw new Error(`The fake Asaas holds no charge ${chargeId}`);
    found.status = status;
  }

  async webhooks(): Promise<PlatformWebhook[]> {
    await this.enter('webhooks');
    return this.webhooksHeld.map(({ id, url, enabled, interrupted }) => ({ id, url, enabled, interrupted }));
  }

  async createWebhook(webhook: PlatformWebhookRequest): Promise<string> {
    await this.enter('createWebhook');
    this.sequence += 1;
    const id = `wh_fake${String(this.sequence).padStart(8, '0')}`;
    this.webhooksHeld.push({ id, url: webhook.url, name: webhook.name, authToken: webhook.authToken, enabled: true, interrupted: false });
    return id;
  }

  async resumeWebhook(id: string, authToken: string): Promise<void> {
    await this.enter('resumeWebhook');
    const found = this.webhooksHeld.find((webhook) => webhook.id === id);
    if (!found) throw new AsaasRefused(404, null, 'no reason given');
    Object.assign(found, { enabled: true, interrupted: false, authToken });
  }

  async customers(externalReference: string): Promise<PlatformCustomer[]> {
    await this.enter('customers');
    return this.standing.filter((customer) => customer.externalReference === externalReference).map(({ id, name, document, email }) => ({ id, name, document, email }));
  }

  async createCustomer(customer: PlatformCustomerRequest): Promise<string> {
    await this.enter('createCustomer');
    const id = this.plant(customer);
    if (this.unanswered > 0) {
      this.unanswered -= 1;
      throw new AsaasOutcomeUnknown('Asaas did not answer (TimeoutError)');
    }
    return id;
  }

  async updateCustomer(id: string, customer: PlatformCustomerData): Promise<void> {
    await this.enter('updateCustomer');
    const found = this.held.find((each) => each.id === id);
    if (!found) throw new AsaasRefused(404, null, 'no reason given');
    if (found.deleted) throw new AsaasRefused(400, 'invalid_object', 'O cliente não pode ser atualizado: Cliente excluído, não é possível fazer alterações.');
    Object.assign(found, customer);
  }

  async subscriptions(externalReference: string): Promise<PlatformSubscription[]> {
    await this.enter('subscriptions');
    return this.standingSubscriptions.filter((subscription) => subscription.externalReference === externalReference && !this.unlisted.has(subscription.id)).map((subscription) => ({ ...subscription }));
  }

  async createSubscription(request: PlatformSubscriptionRequest): Promise<PlatformSubscription> {
    await this.enter('createSubscription');
    this.asked.push(request);
    const customer = this.held.find((each) => each.id === request.customerId);
    if (!customer) throw new AsaasRefused(400, 'invalid_customer', 'Cliente inválido ou não informado.');
    if (customer.deleted) throw new AsaasRefused(400, 'invalid_object', 'Não é possível criar uma cobrança para um cliente removido.');

    const charged = this.chargeless === 0;
    if (!charged) this.chargeless -= 1;
    const subscription = this.plantSubscription(request, { charged });
    if (this.unansweredSubscriptions > 0) {
      this.unansweredSubscriptions -= 1;
      throw new AsaasOutcomeUnknown('Asaas did not answer (TimeoutError)');
    }
    return { ...subscription };
  }

  async removeSubscription(id: string): Promise<void> {
    await this.enter('removeSubscription');
    const found = this.subscriptionsHeld.find((each) => each.id === id);
    // One the account never held is a 404, which the port reads as removed already.
    if (found) this.take(found);
  }

  async subscription(id: string): Promise<PlatformSubscription | null> {
    await this.enter('subscription');
    const found = this.subscriptionsHeld.find((each) => each.id === id);
    return found ? { ...found } : null;
  }

  async subscriptionCharges(id: string): Promise<PlatformCharge[]> {
    await this.enter('subscriptionCharges');
    return this.charges.filter((charge) => charge.subscriptionId === id && !charge.deleted).map(({ deleted: _deleted, ...charge }) => charge);
  }

  private take(subscription: PlatformSubscription): void {
    subscription.deleted = true;
    subscription.status = 'INACTIVE';
    for (const charge of this.charges) {
      if (charge.subscriptionId === subscription.id && WAITING.includes(charge.status)) charge.deleted = true;
    }
  }

  private async enter(call: Call): Promise<void> {
    this.calls.push(call);
    await this.hooks.get(call)?.();
    const queued = this.failures.get(call);
    if (queued?.length) throw queued.shift();
  }
}
