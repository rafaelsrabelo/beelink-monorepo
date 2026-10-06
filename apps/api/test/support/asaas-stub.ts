// App
import { AsaasClient, type AsaasCharge, type AsaasPixQrCode } from '../../src/modules/integrations/asaas/asaas.client.js';

/**
 * The charging half of the Asaas port, for a suite that is about the connection or the settings and
 * asks Asaas for no charge: each call fails loudly, so one that starts charging is told to stand a
 * fake Asaas that answers it (`fake-asaas.ts`).
 */
export abstract class AsaasWithoutCharges extends AsaasClient {
  private unasked(call: string): never {
    throw new Error(`This suite's Asaas was not expected to be asked for ${call}`);
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
}
