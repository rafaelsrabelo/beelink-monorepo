// Types
import type { AsaasAccountApproval } from '@harness-monorepo/contracts';

// App
import { AsaasClient, type AsaasCharge, type AsaasPixQrCode, type AsaasRefundsRead, type AsaasWebhookStanding } from '../../src/modules/integrations/asaas/asaas.client.js';

/**
 * The charging half of the Asaas port, and the keeping of a webhook, for a suite that is about the connection or the settings and
 * asks Asaas for no charge: each call fails loudly, so one that starts charging is told to stand a
 * fake Asaas that answers it (`fake-asaas.ts`). Every connect and every daily look asks whether
 * the account is approved (BEELINK-278), so that one is answered: `approved` is what, and an `Error`
 * there is Asaas not answering it.
 */
export abstract class AsaasWithoutCharges extends AsaasClient {
  approved: AsaasAccountApproval | null | Error = 'APPROVED';
  approvalsAsked = 0;

  async approval(): Promise<AsaasAccountApproval | null> {
    this.approvalsAsked += 1;
    if (this.approved instanceof Error) throw this.approved;
    return this.approved;
  }

  private unasked(call: string): never {
    throw new Error(`This suite's Asaas was not expected to be asked for ${call}`);
  }

  async webhook(): Promise<AsaasWebhookStanding | null> {
    return this.unasked('webhook');
  }

  async resumeWebhook(): Promise<void> {
    return this.unasked('resumeWebhook');
  }

  async findCustomer(): Promise<string | null> {
    return this.unasked('findCustomer');
  }

  async createCustomer(): Promise<string> {
    return this.unasked('createCustomer');
  }

  async charges(): Promise<AsaasCharge[]> {
    return this.unasked('charges');
  }

  async charge(): Promise<AsaasCharge | null> {
    return this.unasked('charge');
  }

  async createCharge(): Promise<AsaasCharge> {
    return this.unasked('createCharge');
  }

  async deleteCharge(): Promise<void> {
    return this.unasked('deleteCharge');
  }

  async deleteInstallment(): Promise<void> {
    return this.unasked('deleteInstallment');
  }

  async pixQrCode(): Promise<AsaasPixQrCode> {
    return this.unasked('pixQrCode');
  }

  async refund(): Promise<AsaasRefundsRead> {
    return this.unasked('refund');
  }

  async refundsOf(): Promise<AsaasRefundsRead | null> {
    return this.unasked('refundsOf');
  }
}
