// App
import {
  PlatformAsaas,
  type PlatformCharge,
  type PlatformCustomer,
  type PlatformCustomerData,
  type PlatformCustomerRequest,
  type PlatformSubscription,
} from '../../src/modules/billing/platform-asaas.client.js';
import { AsaasOutcomeUnknown, AsaasRefused } from '../../src/shared/asaas/asaas-errors.js';

type Call = 'customers' | 'createCustomer' | 'updateCustomer' | 'subscription' | 'subscriptionCharges';

interface FakeCustomer extends PlatformCustomerRequest {
  id: string;
  deleted: boolean;
}

/**
 * bee-link's own Asaas account, in memory, as far as a shopkeeper's customer goes — and as the
 * sandbox was seen to behave on 13/10/2026: it takes two customers under one reference, lists only
 * those not removed, changes one by its id, and refuses to change one that was removed (a 400) or
 * that never existed (a 404).
 *
 * A test steers it: `failing` makes the next call of a kind throw, `before` runs ahead of one (to
 * hold it open, or to change the world meanwhile), and `unanswered` is a creation Asaas carried out
 * and never answered. `remove` is somebody deleting the customer at Asaas's own panel.
 */
export class FakePlatformAsaas extends PlatformAsaas {
  configured = true;
  readonly calls: Call[] = [];
  readonly held: FakeCustomer[] = [];
  /** How many creations to come are made and then not answered. */
  unanswered = 0;
  private readonly failures = new Map<Call, unknown[]>();
  private readonly hooks = new Map<Call, () => Promise<void> | void>();
  private sequence = 0;

  reset(): void {
    this.configured = true;
    this.calls.length = 0;
    this.held.length = 0;
    this.unanswered = 0;
    this.failures.clear();
    this.hooks.clear();
  }

  /** The next call of this kind throws `error`, having done nothing. */
  failing(call: Call, error: unknown): void {
    this.failures.set(call, [...(this.failures.get(call) ?? []), error]);
  }

  before(call: Call, hook: (() => Promise<void> | void) | null): void {
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

  /** A customer put there by something other than this run: a request that died after Asaas made it. */
  plant(customer: PlatformCustomerRequest): string {
    this.sequence += 1;
    const id = `cus_fake${String(this.sequence).padStart(8, '0')}`;
    this.held.push({ id, ...customer, deleted: false });
    return id;
  }

  remove(id: string): void {
    const found = this.held.find((customer) => customer.id === id);
    if (!found) throw new Error(`The fake Asaas holds no customer ${id}`);
    found.deleted = true;
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

  async subscription(): Promise<PlatformSubscription | null> {
    return this.unasked('subscription');
  }

  async subscriptionCharges(): Promise<PlatformCharge[]> {
    return this.unasked('subscriptionCharges');
  }

  private unasked(call: Call): never {
    throw new Error(`This suite's Asaas was not expected to be asked for ${call}`);
  }

  private async enter(call: Call): Promise<void> {
    this.calls.push(call);
    await this.hooks.get(call)?.();
    const queued = this.failures.get(call);
    if (queued?.length) throw queued.shift();
  }
}
