// Node
import { randomBytes } from 'node:crypto';

// Libs
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Types
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { AsaasConfig } from './asaas.config.js';

// App
import { FakeAsaas } from '../../../../test/support/fake-asaas.js';
import { seal } from '../secret-vault.js';
import { AsaasCharges, AsaasStoreUnavailable, type AsaasChargeOrder } from './asaas-charges.service.js';
import { AsaasRefused, AsaasUnreachable } from './asaas.client.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';

const deployment = vi.hoisted(() => ({ config: null as AsaasConfig | null }));
vi.mock('./asaas.config.js', async (original) => ({ ...(await original<typeof import('./asaas.config.js')>()), asaasConfig: () => deployment.config }));

const order: AsaasChargeOrder = { orderId: 'order-1', payer: { id: 'customer-1', name: 'Bia Cliente', cpf: '52998224725' }, billingType: 'PIX', totalCents: 5990, installments: 1, dueDate: '2026-10-07', description: 'Pedido nº 1 — Lessari' };

interface Connection {
  id: string;
  storeId: string;
  status: string;
  secretSealed: string;
  connectedAt: Date;
  lastError: string | null;
}
type Kept = { customerId: string; providerId: string; cpf: string };

/** One shop's connection and its customers at Asaas, in memory, behind the calls the service makes. */
function build(status: 'CONNECTED' | 'NEEDS_RECONNECT' | null = 'CONNECTED') {
  const config = deployment.config!;
  let connection: Connection | null = status && { id: 'int-1', storeId: STORE, status, connectedAt: new Date('2026-10-01T12:00:00Z'), lastError: null, secretSealed: seal(JSON.stringify({ apiKey: KEY, webhookToken: 't' }), config.vaultKey, { storeId: STORE, provider: 'ASAAS' }) };
  const kept = new Map<string, Kept>();
  const prisma = {
    storeIntegration: {
      findUnique: vi.fn(async () => connection),
      updateMany: vi.fn(async ({ data }: { data: Partial<Connection> }) => {
        if (connection) connection = { ...connection, ...data };
        return { count: connection ? 1 : 0 };
      }),
    },
    asaasCustomer: {
      findUnique: vi.fn(async ({ where }: { where: { customerId: string } }) => kept.get(where.customerId) ?? null),
      upsert: vi.fn(async ({ create }: { create: Kept }) => kept.set(create.customerId, create)),
    },
  } as unknown as PrismaService;
  const asaas = new FakeAsaas();
  const spied = { createCharge: vi.spyOn(asaas, 'createCharge'), charges: vi.spyOn(asaas, 'charges') };
  return { service: new AsaasCharges(prisma, asaas), asaas, kept, spied, connection: () => connection };
}

describe('AsaasCharges', () => {
  beforeEach(() => {
    deployment.config = { environment: 'SANDBOX', baseUrl: 'https://api-sandbox.asaas.com/v3', userAgent: 'bee-link (contato@beecoders.net)', contactEmail: 'contato@beecoders.net', webhookUrl: null, vaultKey: randomBytes(32) };
  });

  it("asks Asaas with the shop's own key, opened here and handed to nobody who asked", async () => {
    const { service, spied } = build();

    const charge = await service.create(STORE, order);
    expect(spied.createCharge.mock.calls[0]![1]).toBe(KEY);
    expect(JSON.stringify(charge)).not.toContain('aact');
    expect(JSON.stringify(await service.find(STORE, 'order-1'))).not.toContain('aact');
    expect(spied.charges.mock.calls[0]!.slice(1)).toEqual([KEY, 'order-1']);
  });

  it('finds the customer by CPF before registering one, and keeps the id so the account is asked once', async () => {
    const { service, asaas, kept } = build();

    await service.create(STORE, order);
    expect(asaas.calls).toEqual(['findCustomer', 'createCustomer', 'createCharge']);
    expect(asaas.customers).toMatchObject([{ id: 'cus_1', name: 'Bia Cliente', cpf: '52998224725', externalReference: 'customer-1' }]);
    expect(kept.get('customer-1')).toMatchObject({ providerId: 'cus_1', cpf: '52998224725' });

    asaas.calls.length = 0;
    await service.create(STORE, { ...order, orderId: 'order-2' });
    expect(asaas.calls).toEqual(['createCharge']);
    expect(asaas.requests.map((request) => request.customerId)).toEqual(['cus_1', 'cus_1']);
  });

  it('takes a customer the shop already had at Asaas as they are', async () => {
    const { service, asaas } = build();
    asaas.customers.push({ id: 'cus_theirs', name: 'Beatriz', cpf: '52998224725', externalReference: 'crm-77', deleted: false });

    await service.create(STORE, order);
    expect(asaas.count('createCustomer')).toBe(0);
    expect(asaas.requests[0]).toMatchObject({ customerId: 'cus_theirs' });
  });

  it('looks the customer up again when their CPF changed since the id was kept', async () => {
    const { service, asaas, kept } = build();
    await service.create(STORE, order);

    await service.create(STORE, { ...order, payer: { ...order.payer, cpf: '11144477735' } });
    expect(asaas.count('findCustomer')).toBe(2);
    expect(kept.get('customer-1')).toMatchObject({ providerId: asaas.customers[1]!.id, cpf: '11144477735' });
  });

  /** The shop connected another account, or removed the customer at Asaas: the id kept is of nobody there. */
  it('forgets an id Asaas refuses the charge with, finds the customer again and charges once more', async () => {
    const { service, asaas, kept } = build();
    await service.create(STORE, order);
    asaas.customers[0]!.deleted = true;
    asaas.calls.length = 0;

    const charge = await service.create(STORE, { ...order, orderId: 'order-2' });
    expect(asaas.calls).toEqual(['createCharge', 'findCustomer', 'createCustomer', 'createCharge']);
    expect(charge.externalReference).toBe('order-2');
    expect(kept.get('customer-1')).toMatchObject({ providerId: 'cus_3' });
  });

  it('does not charge twice when the refusal was about the charge, not the customer', async () => {
    const { service, asaas } = build();
    await service.create(STORE, order);
    asaas.calls.length = 0;
    asaas.failing('createCharge', new AsaasRefused(400, 'invalid_value', 'Valor acima do limite.'));

    await expect(service.create(STORE, order)).rejects.toMatchObject({ status: 400, reason: 'Valor acima do limite.' });
    expect(asaas.calls).toEqual(['createCharge', 'findCustomer']);
  });

  it("marks the connection as needing reconnection when Asaas refuses the key, whichever call met it, and says only that the shop is unavailable", async () => {
    for (const call of ['charges', 'createCharge', 'deleteCharge', 'pixQrCode'] as const) {
      const { service, asaas, connection } = build();
      await service.create(STORE, order);
      asaas.failing(call, new AsaasRefused(401, 'invalid_access_token', `A chave ${KEY} é inválida`));

      const ask = { charges: () => service.find(STORE, 'order-1'), createCharge: () => service.create(STORE, order), deleteCharge: () => service.remove(STORE, { id: 'pay_2', installmentId: null }), pixQrCode: () => service.pixQrCode(STORE, 'pay_2') }[call];
      const failure = await ask().catch((error: unknown) => error);
      expect(failure).toBeInstanceOf(AsaasStoreUnavailable);
      expect(String(failure)).not.toContain('aact');
      expect(connection()).toMatchObject({ status: 'NEEDS_RECONNECT' });
    }
  });

  it('leaves the connection as it is on any other refusal and on no answer, and passes them on', async () => {
    const { service, asaas, connection } = build();
    asaas.failing('charges', new AsaasRefused(400, 'invalid_action', 'Não.'));
    await expect(service.find(STORE, 'order-1')).rejects.toBeInstanceOf(AsaasRefused);
    asaas.failing('charges', new AsaasUnreachable('Asaas failed (503)'));
    await expect(service.find(STORE, 'order-1')).rejects.toBeInstanceOf(AsaasUnreachable);
    expect(connection()).toMatchObject({ status: 'CONNECTED' });
  });

  it('asks Asaas nothing for a shop that never connected, one whose key was refused, or a deployment that cannot open a key', async () => {
    for (const status of [null, 'NEEDS_RECONNECT'] as const) {
      const { service, asaas } = build(status);
      await expect(service.find(STORE, 'order-1')).rejects.toBeInstanceOf(AsaasStoreUnavailable);
      expect(asaas.calls).toEqual([]);
    }
    const { service, asaas } = build();
    deployment.config = null;
    await expect(service.create(STORE, order)).rejects.toBeInstanceOf(AsaasStoreUnavailable);
    expect(asaas.calls).toEqual([]);
  });

  it('removes a plan whole, and a charge in full by itself', async () => {
    const { service, asaas } = build();
    await service.create(STORE, { ...order, billingType: 'CREDIT_CARD', installments: 3 });
    await service.create(STORE, { ...order, orderId: 'order-2' });
    asaas.calls.length = 0;

    await service.remove(STORE, { id: asaas.payments[0]!.id, installmentId: asaas.payments[0]!.installmentId });
    await service.remove(STORE, { id: asaas.payments[3]!.id, installmentId: null });
    expect(asaas.calls).toEqual(['deleteInstallment', 'deleteCharge']);
    expect(asaas.standing).toHaveLength(0);
  });
});
