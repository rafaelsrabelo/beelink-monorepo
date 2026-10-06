// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { open } from '../secret-vault.js';
import { AsaasClient, AsaasRefused, AsaasThrottled, type AsaasBillingType, type AsaasCharge, type AsaasPixQrCode, type AsaasRefundsRead, type AsaasRefundTarget } from './asaas.client.js';
import { asaasConfig, type AsaasConfig } from './asaas.config.js';

const PROVIDER = 'ASAAS' as const;

/** The shop cannot be reached at Asaas: it never connected, its key was refused, or this deployment cannot open one. */
export class AsaasStoreUnavailable extends Error {}

/** How long a shop is left alone after a 429 that named no time. */
const THROTTLE_FALLBACK_MS = 5 * 60_000;

/** Who a charge is for: the shop's own record of the customer. */
export interface AsaasPayer {
  /** bee-link's id of the customer's record. */
  id: string;
  name: string;
  /** Digits only. */
  cpf: string;
}

export interface AsaasChargeOrder {
  /** bee-link's id of the order: the charge's `externalReference`. */
  orderId: string;
  payer: AsaasPayer;
  billingType: AsaasBillingType;
  totalCents: number;
  installments: number;
  /** `YYYY-MM-DD`, Brasília's calendar. */
  dueDate: string;
  description: string;
}

type Work<T> = (config: AsaasConfig, apiKey: string) => Promise<T>;

/**
 * A shop's charges at its own Asaas account (BEELINK-204), by the shop's id: the one place the key is
 * opened to charge, so nothing that asks takes or is answered a key (gate `api/asaas-secret-in-asaas`).
 * Asaas refusing the key itself — a 401, whichever call met it — marks the connection as needing
 * to be reconnected, which the panel already shows, and is said as `AsaasStoreUnavailable`. Any other
 * refusal, and no answer at all, reach the caller as the port's own errors: Asaas's words, never the key.
 *
 * A 429 is remembered (BEELINK-206): until the time Asaas named, the shop's account is not asked at
 * all, and every call answers `AsaasThrottled` at once. In this process's memory — another process
 * learns from its own 429.
 */
@Injectable()
export class AsaasCharges {
  private readonly logger = new Logger(AsaasCharges.name);
  private readonly throttledUntil = new Map<string, Date>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: AsaasClient,
  ) {}

  /** Every charge the account holds for the order, removed ones left out: each instalment of a plan is one. */
  find(storeId: string, orderId: string): Promise<AsaasCharge[]> {
    return this.withKey(storeId, (config, apiKey) => this.asaas.charges(config, apiKey, orderId));
  }

  /** One charge as it stands now; null when the account has none such — removed long ago, or another account's. */
  read(storeId: string, id: string): Promise<AsaasCharge | null> {
    return this.withKey(storeId, (config, apiKey) => this.asaas.charge(config, apiKey, id));
  }

  /**
   * A charge for the order, made for the customer as the account knows them. An id kept from before
   * may be of an account the shop has left since, or of a customer removed there: when Asaas refuses
   * the charge made with one, it is forgotten, the customer is looked for again and the charge tried
   * once more — whatever code the refusal came with.
   */
  create(storeId: string, order: AsaasChargeOrder): Promise<AsaasCharge> {
    return this.withKey(storeId, async (config, apiKey) => {
      const known = await this.prisma.asaasCustomer.findUnique({ where: { customerId: order.payer.id } });
      const kept = known?.cpf === order.payer.cpf ? known.providerId : null;
      const charge = (customerId: string) =>
        this.asaas.createCharge(config, apiKey, {
          customerId,
          billingType: order.billingType,
          totalCents: order.totalCents,
          installments: order.installments,
          dueDate: order.dueDate,
          description: order.description,
          externalReference: order.orderId,
        });

      if (!kept) return charge(await this.customerOf(config, apiKey, order.payer));
      try {
        return await charge(kept);
      } catch (error) {
        if (!(error instanceof AsaasRefused) || error.status === 401) throw error;
        const fresh = await this.customerOf(config, apiKey, order.payer);
        // The same customer again: the refusal was about the charge.
        if (fresh === kept) throw error;
        return charge(fresh);
      }
    });
  }

  /** The charge taken out of the account — the whole plan, when it is one — so it can no longer be paid. Refused when Asaas will not remove it. */
  remove(storeId: string, charge: { id: string; installmentId: string | null }): Promise<void> {
    return this.withKey(storeId, (config, apiKey) =>
      charge.installmentId ? this.asaas.deleteInstallment(config, apiKey, charge.installmentId) : this.asaas.deleteCharge(config, apiKey, charge.id),
    );
  }

  /** Money given back from a charge, or from a whole plan (BEELINK-208): the amount is always said. Answers its refunds as they stand then. */
  refund(storeId: string, charge: AsaasRefundTarget, valueCents: number, description: string): Promise<AsaasRefundsRead> {
    return this.withKey(storeId, (config, apiKey) => this.asaas.refund(config, apiKey, charge, { valueCents, description }));
  }

  /** The refunds of a charge, or of a plan, as the account holds them now; null when it has none such. */
  refundsOf(storeId: string, charge: AsaasRefundTarget): Promise<AsaasRefundsRead | null> {
    return this.withKey(storeId, (config, apiKey) => this.asaas.refundsOf(config, apiKey, charge));
  }

  pixQrCode(storeId: string, id: string): Promise<AsaasPixQrCode> {
    return this.withKey(storeId, (config, apiKey) => this.asaas.pixQrCode(config, apiKey, id));
  }

  /** The customer at the account: found by CPF, else registered — Asaas takes duplicates, so it is asked first. The id is kept. */
  private async customerOf(config: AsaasConfig, apiKey: string, payer: AsaasPayer): Promise<string> {
    const providerId =
      (await this.asaas.findCustomer(config, apiKey, payer.cpf)) ?? (await this.asaas.createCustomer(config, apiKey, { name: payer.name, cpf: payer.cpf, externalReference: payer.id }));
    const data = { providerId, cpf: payer.cpf };
    await this.prisma.asaasCustomer.upsert({ where: { customerId: payer.id }, create: { customerId: payer.id, ...data }, update: data });
    return providerId;
  }

  private async withKey<T>(storeId: string, work: Work<T>): Promise<T> {
    const config = asaasConfig();
    const row = await this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } });
    if (!config || !row || row.status !== 'CONNECTED') throw new AsaasStoreUnavailable('The shop has no Asaas account in good standing');
    const wait = this.throttledUntil.get(storeId);
    if (wait && wait > new Date()) throw new AsaasThrottled('Asaas asked to wait before the shop is asked again', wait);
    this.throttledUntil.delete(storeId);

    const { apiKey } = JSON.parse(open(row.secretSealed, config.vaultKey, { storeId, provider: PROVIDER })) as { apiKey: string };
    try {
      return await work(config, apiKey);
    } catch (error) {
      if (error instanceof AsaasThrottled) this.throttledUntil.set(storeId, error.retryAt ?? new Date(Date.now() + THROTTLE_FALLBACK_MS));
      if (!(error instanceof AsaasRefused) || error.status !== 401) throw error;
      // Only the connection that was refused: one replaced meanwhile holds another key.
      await this.prisma.storeIntegration.updateMany({ where: { id: row.id, status: 'CONNECTED', connectedAt: row.connectedAt }, data: { status: 'NEEDS_RECONNECT', lastError: error.message } });
      this.logger.warn({ storeId, reason: error.message }, 'Asaas refused the key of a shop: its connection needs reconnecting');
      throw new AsaasStoreUnavailable('Asaas refused the key of the shop');
    }
  }
}
