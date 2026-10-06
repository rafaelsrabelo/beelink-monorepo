// App
import {
  AsaasClient,
  AsaasRefused,
  type AsaasAccountInfo,
  type AsaasCharge,
  type AsaasChargeRequest,
  type AsaasCustomerRequest,
  type AsaasPixQrCode,
} from '../../src/modules/integrations/asaas/asaas.client.js';
import type { AsaasConfig } from '../../src/modules/integrations/asaas/asaas.config.js';

type Call = 'findCustomer' | 'createCustomer' | 'charges' | 'charge' | 'createCharge' | 'deleteCharge' | 'deleteInstallment' | 'pixQrCode';

interface FakeCustomer extends AsaasCustomerRequest {
  id: string;
  deleted: boolean;
}

const PAID = new Set(['CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH']);

/**
 * One Asaas account, in memory, as far as charging an order goes: it keeps customers and charges,
 * splits a plan into one charge per instalment, lists by `externalReference` without the removed
 * ones, and refuses to remove a charge already paid — what the documentation says the real one does.
 * A test steers it: `failing` makes the next call of a kind throw, `before` runs ahead of one (to
 * hold it open, or to change the world meanwhile), and `pay` is the customer paying.
 */
export class FakeAsaas extends AsaasClient {
  readonly calls: Call[] = [];
  readonly requests: AsaasChargeRequest[] = [];
  readonly customers: FakeCustomer[] = [];
  readonly payments: AsaasCharge[] = [];
  /** When a Pix code ends; null leaves it to the charge's due day. */
  pixExpiresAt: Date | null = null;
  private readonly failures = new Map<Call, unknown[]>();
  private readonly hooks = new Map<Call, () => Promise<void> | void>();
  private sequence = 0;

  reset(): void {
    this.calls.length = 0;
    this.requests.length = 0;
    this.customers.length = 0;
    this.payments.length = 0;
    this.pixExpiresAt = null;
    this.failures.clear();
    this.hooks.clear();
  }

  /** The next call of this kind throws `error` — after doing its work, when `afterwards`: a charge made that nobody heard of. */
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

  /** The charges still standing — not removed. */
  get standing(): AsaasCharge[] {
    return this.payments.filter((payment) => !payment.deleted);
  }

  pay(id: string, status = 'RECEIVED'): void {
    this.payment(id).status = status;
  }

  payment(id: string): AsaasCharge {
    const found = this.payments.find((payment) => payment.id === id);
    if (!found) throw new Error(`The fake Asaas holds no charge ${id}`);
    return found;
  }

  async account(): Promise<AsaasAccountInfo> {
    return { name: 'Lessari', document: '11222333000181' };
  }

  async createWebhook(): Promise<string> {
    return 'wh_1';
  }

  async deleteWebhook(): Promise<void> {}

  async findCustomer(_config: AsaasConfig, _apiKey: string, cpf: string): Promise<string | null> {
    await this.enter('findCustomer');
    return this.customers.find((customer) => customer.cpf === cpf && !customer.deleted)?.id ?? null;
  }

  async createCustomer(_config: AsaasConfig, _apiKey: string, customer: AsaasCustomerRequest): Promise<string> {
    await this.enter('createCustomer');
    const id = `cus_${(this.sequence += 1)}`;
    this.customers.push({ ...customer, id, deleted: false });
    return id;
  }

  async charges(_config: AsaasConfig, _apiKey: string, externalReference: string): Promise<AsaasCharge[]> {
    await this.enter('charges');
    return this.standing.filter((payment) => payment.externalReference === externalReference).map((payment) => ({ ...payment }));
  }

  async charge(_config: AsaasConfig, _apiKey: string, id: string): Promise<AsaasCharge | null> {
    await this.enter('charge');
    const found = this.payments.find((payment) => payment.id === id);
    return found ? { ...found } : null;
  }

  async createCharge(_config: AsaasConfig, _apiKey: string, request: AsaasChargeRequest): Promise<AsaasCharge> {
    await this.enter('createCharge');
    if (!this.customers.some((customer) => customer.id === request.customerId && !customer.deleted)) throw new AsaasRefused(400, 'invalid_customer', 'Customer inválido ou não informado.');
    this.requests.push(request);

    const installmentId = request.installments > 1 ? `ins_${(this.sequence += 1)}` : null;
    const each = Math.floor(request.totalCents / request.installments);
    const made = Array.from({ length: request.installments }, (_, index): AsaasCharge => ({
      id: `pay_${(this.sequence += 1)}`,
      status: 'PENDING',
      deleted: false,
      billingType: request.billingType,
      // The rounding goes on the last instalment, as Asaas puts it.
      valueCents: index === request.installments - 1 ? request.totalCents - each * (request.installments - 1) : each,
      dueDate: request.dueDate,
      invoiceUrl: `https://sandbox.asaas.com/i/${this.sequence}`,
      installmentId,
      installmentNumber: installmentId ? index + 1 : null,
      externalReference: request.externalReference,
    }));
    this.payments.push(...made);
    this.throwAfter('createCharge');
    return { ...made[0]! };
  }

  async deleteCharge(_config: AsaasConfig, _apiKey: string, id: string): Promise<void> {
    await this.enter('deleteCharge');
    this.remove(this.payments.filter((payment) => payment.id === id));
  }

  async deleteInstallment(_config: AsaasConfig, _apiKey: string, id: string): Promise<void> {
    await this.enter('deleteInstallment');
    this.remove(this.payments.filter((payment) => payment.installmentId === id));
  }

  async pixQrCode(_config: AsaasConfig, _apiKey: string, id: string): Promise<AsaasPixQrCode> {
    await this.enter('pixQrCode');
    this.payment(id);
    return { payload: `00020126580014br.gov.bcb.pix-${id}`, encodedImage: Buffer.from(`qr-${id}`).toString('base64'), expiresAt: this.pixExpiresAt };
  }

  private remove(found: AsaasCharge[]): void {
    if (found.some((payment) => PAID.has(payment.status))) throw new AsaasRefused(400, 'invalid_action', 'Não é possível remover uma cobrança já recebida.');
    for (const payment of found) payment.deleted = true;
  }

  /** The call counted, its hook run, and a failure queued for it thrown — unless it is one that happens after the work. */
  private async enter(call: Call): Promise<void> {
    this.calls.push(call);
    await this.hooks.get(call)?.();
    const next = this.failures.get(call)?.[0];
    if (next === undefined || (next as { afterwards?: boolean }).afterwards) return;
    this.failures.get(call)!.shift();
    throw next;
  }

  private throwAfter(call: Call): void {
    const next = this.failures.get(call)?.[0] as { afterwards?: boolean; error?: unknown } | undefined;
    if (!next?.afterwards) return;
    this.failures.get(call)!.shift();
    throw next.error;
  }
}

/** A failure that happens once the fake did what was asked: the answer was lost on the way back. */
export const afterwards = (error: unknown) => ({ afterwards: true, error });
