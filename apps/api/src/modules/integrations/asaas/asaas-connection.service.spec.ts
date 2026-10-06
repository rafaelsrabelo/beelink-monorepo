// Node
import { createHash, randomBytes } from 'node:crypto';

// Nest
import type { HttpException } from '@nestjs/common';

// Types
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { StoresService } from '../../stores/stores.service.js';
import type { AsaasConfig } from './asaas.config.js';

// App
import { AsaasWithoutCharges } from '../../../../test/support/asaas-stub.js';
import { open, seal } from '../secret-vault.js';
import { AsaasRefused, AsaasUnreachable, type AsaasAccountInfo, type AsaasWebhookRequest } from './asaas.client.js';
import { AsaasApproval } from './asaas-approval.service.js';
import { AsaasConnectionService } from './asaas-connection.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const SANDBOX_KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';
const PRODUCTION_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';
const OLD_KEY = '$aact_hmlg_111OLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLDOLD';

/** The deployment, as each test needs it: the module reads `asaasConfig()` where it would read the env. */
const deployment = vi.hoisted(() => ({ config: null as AsaasConfig | null }));
vi.mock('./asaas.config.js', async (original) => ({
  ...(await original<typeof import('./asaas.config.js')>()),
  asaasConfig: () => deployment.config,
  asaasEnvironment: () => deployment.config?.environment ?? 'SANDBOX',
}));

function configOf(over: Partial<AsaasConfig> = {}): AsaasConfig {
  return {
    environment: 'SANDBOX',
    baseUrl: 'https://api-sandbox.asaas.com/v3',
    userAgent: 'bee-link (contato@beecoders.net)',
    contactEmail: 'contato@beecoders.net',
    webhookUrl: null,
    vaultKey: randomBytes(32),
    ...over,
  };
}

/** Asaas, as far as a connection can tell: the keys it knows, the webhooks each account holds, and whether it answers. */
class FakeAsaas extends AsaasWithoutCharges {
  readonly keys = new Map<string, AsaasAccountInfo>([[SANDBOX_KEY, { name: 'Lessari', document: '11222333000181' }], [OLD_KEY, { name: 'Conta antiga', document: '12345678909' }]]);
  readonly created: { apiKey: string; webhook: AsaasWebhookRequest }[] = [];
  readonly deleted: { apiKey: string; id: string }[] = [];
  readonly calls: string[] = [];
  refuseWebhooks = false;
  down = false;

  async account(_config: AsaasConfig, apiKey: string): Promise<AsaasAccountInfo> {
    this.calls.push('account');
    if (this.down) throw new AsaasUnreachable('down');
    const account = this.keys.get(apiKey);
    if (!account) throw new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida');
    return account;
  }

  async createWebhook(_config: AsaasConfig, apiKey: string, webhook: AsaasWebhookRequest): Promise<string> {
    this.calls.push('createWebhook');
    if (this.refuseWebhooks) throw new AsaasRefused(400, 'invalid_action', 'Limite de webhooks atingido');
    this.created.push({ apiKey, webhook });
    return `wh_${this.created.length}`;
  }

  async deleteWebhook(_config: AsaasConfig, apiKey: string, id: string): Promise<void> {
    this.calls.push('deleteWebhook');
    if (this.down) throw new AsaasUnreachable('down');
    this.deleted.push({ apiKey, id });
  }
}

type Row = Record<string, unknown> & { id: string; storeId: string; secretSealed: string; webhookId: string | null; connectedAt: Date };

/** One shop's `store_integrations`, in memory, behind the calls the service makes. */
function build(existing: Row | null = null) {
  let row = existing;
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    storeIntegration: {
      findUnique: vi.fn(async () => row),
      upsert: vi.fn(async ({ create, update }: { create: Record<string, unknown>; update: Record<string, unknown> }) => {
        row = (row ? { ...row, ...update } : { id: 'int-1', status: 'CONNECTED', ...create }) as Row;
        return row;
      }),
      delete: vi.fn(async () => {
        row = null;
      }),
    },
  };
  const prisma = { ...tx, $transaction: vi.fn(async (work: (client: typeof tx) => unknown) => work(tx)) } as unknown as PrismaService;
  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;
  const asaas = new FakeAsaas();
  return { service: new AsaasConnectionService(prisma, stores, asaas, new AsaasApproval(prisma, asaas)), asaas, tx, row: () => row };
}

/** What a connection made with `apiKey` left in the row, sealed for this shop. */
function connectedRow(config: AsaasConfig, apiKey: string, webhookId: string | null): Row {
  return { id: 'int-1', storeId: STORE, status: 'CONNECTED', webhookId, connectedAt: new Date('2026-10-01T12:00:00Z'), secretSealed: seal(JSON.stringify({ apiKey, webhookToken: 'old-token' }), config.vaultKey, { storeId: STORE, provider: 'ASAAS' }) };
}

const sealedIn = (config: AsaasConfig, row: Row | null) => JSON.parse(open(row!.secretSealed, config.vaultKey, { storeId: STORE, provider: 'ASAAS' })) as { apiKey: string; webhookToken: string };
const codeOf = (error: unknown) => ((error as HttpException).getResponse() as { errorCode: string }).errorCode;
const statusOf = (error: unknown) => (error as HttpException).getStatus();

describe('AsaasConnectionService', () => {
  beforeEach(() => {
    deployment.config = configOf();
  });

  describe('connecting', () => {
    it("refuses a key from the other environment by its prefix, before Asaas is asked or the shop's row is touched", async () => {
      const { service, asaas, tx } = build();
      const sandbox = await service.connect('lessari', 'owner', { apiKey: PRODUCTION_KEY }).catch((error: unknown) => error);
      expect([statusOf(sandbox), codeOf(sandbox)]).toEqual([400, 'INTEGRATION_KEY_WRONG_ENVIRONMENT']);

      deployment.config = configOf({ environment: 'PRODUCTION', baseUrl: 'https://api.asaas.com/v3' });
      const production = await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY }).catch((error: unknown) => error);
      expect(codeOf(production)).toBe('INTEGRATION_KEY_WRONG_ENVIRONMENT');
      expect(String((production as HttpException).message)).toContain('$aact_prod_');

      expect(asaas.calls).toEqual([]);
      expect(tx.storeIntegration.upsert).not.toHaveBeenCalled();
    });

    it("says a key Asaas refuses is not a key, one it places in another environment is the wrong one, and no answer is no answer — keeping nothing", async () => {
      const { service, asaas, tx } = build();

      const refused = await service.connect('lessari', 'owner', { apiKey: '$aact_hmlg_unknown-key-0000000000' }).catch((error: unknown) => error);
      expect([statusOf(refused), codeOf(refused)]).toEqual([400, 'INTEGRATION_KEY_INVALID']);

      vi.spyOn(asaas, 'account').mockRejectedValueOnce(new AsaasRefused(401, 'invalid_environment', 'A chave não pertence a este ambiente'));
      expect(codeOf(await service.connect('lessari', 'owner', { apiKey: '$aact_YTU5YTE0M2M2N2I4MTliNzk0YTI5N2U5MzdjNWZmNDQ' }).catch((error: unknown) => error))).toBe('INTEGRATION_KEY_WRONG_ENVIRONMENT');

      asaas.down = true;
      const down = await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY }).catch((error: unknown) => error);
      expect([statusOf(down), codeOf(down)]).toEqual([502, 'INTEGRATION_UNREACHABLE']);

      expect(tx.storeIntegration.upsert).not.toHaveBeenCalled();
      expect(asaas.calls).not.toContain('createWebhook');
    });

    it('skips the webhook on a web Asaas cannot reach, and seals the key with a fresh token whose hash finds the shop', async () => {
      const { service, asaas, row } = build();

      const connection = await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY });

      expect(connection).toEqual({ available: true, environment: 'SANDBOX', status: 'CONNECTED', account: { name: 'Lessari', document: '**.222.333/0001-**' }, webhook: 'SKIPPED', approval: 'APPROVED', approvalCheckedAt: expect.any(String), connectedAt: expect.any(String) });
      expect(JSON.stringify(connection)).not.toContain(SANDBOX_KEY);
      expect(asaas.calls).toEqual(['account']);

      const sealed = sealedIn(deployment.config!, row());
      expect(sealed.apiKey).toBe(SANDBOX_KEY);
      expect(sealed.webhookToken.length).toBeGreaterThanOrEqual(32);
      expect(row()).toMatchObject({ webhookId: null, webhookState: 'SKIPPED', webhookTokenHash: createHash('sha256').update(sealed.webhookToken).digest('hex') });
      expect(row()!.secretSealed).not.toContain('aact');
    });

    it("registers the webhook at the shop's account on a public web, with the token it seals", async () => {
      deployment.config = configOf({ webhookUrl: 'https://beelink.biz/api/integrations/asaas/webhook' });
      const { service, asaas, row } = build();

      expect((await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY })).webhook).toBe('REGISTERED');

      expect(asaas.created).toEqual([{ apiKey: SANDBOX_KEY, webhook: { name: 'bee-link (lessari)', url: 'https://beelink.biz/api/integrations/asaas/webhook', email: 'contato@beecoders.net', authToken: expect.stringMatching(/^\S{32,255}$/) } }]);
      expect(asaas.created[0]!.webhook.authToken).toBe(sealedIn(deployment.config!, row()).webhookToken);
      expect(row()).toMatchObject({ webhookId: 'wh_1', webhookState: 'REGISTERED', lastError: null });
    });

    /** The key is good: the payments are still found by the reconciliation, and connecting again tries once more. */
    it('keeps the connection when Asaas refuses the webhook, with the webhook in error', async () => {
      deployment.config = configOf({ webhookUrl: 'https://beelink.biz/api/integrations/asaas/webhook' });
      const { service, asaas, row } = build();
      asaas.refuseWebhooks = true;

      const connection = await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY });

      expect(connection).toMatchObject({ status: 'CONNECTED', webhook: 'ERROR' });
      expect(row()).toMatchObject({ webhookId: null, webhookState: 'ERROR', lastError: expect.stringContaining('Limite de webhooks') });
      expect(sealedIn(deployment.config!, row()).apiKey).toBe(SANDBOX_KEY);
    });

    it('replaces everything on a new key: the old webhook goes, with the old key, before the new one is registered', async () => {
      deployment.config = configOf({ webhookUrl: 'https://beelink.biz/api/integrations/asaas/webhook' });
      const { service, asaas, row, tx } = build(connectedRow(deployment.config, OLD_KEY, 'wh_old'));

      await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY });

      expect(asaas.deleted).toEqual([{ apiKey: OLD_KEY, id: 'wh_old' }]);
      expect(asaas.calls).toEqual(['account', 'deleteWebhook', 'createWebhook']);
      const sealed = sealedIn(deployment.config, row());
      expect(sealed.apiKey).toBe(SANDBOX_KEY);
      expect(sealed.webhookToken).not.toBe('old-token');
      expect(row()).toMatchObject({ webhookId: 'wh_1', accountName: 'Lessari' });
      expect(tx.$executeRaw).toHaveBeenCalled();
    });

    it('connects the new key even when the old webhook cannot be removed', async () => {
      const { service, asaas, row } = build(connectedRow(deployment.config!, OLD_KEY, 'wh_old'));
      vi.spyOn(asaas, 'deleteWebhook').mockRejectedValueOnce(new AsaasUnreachable('down'));

      expect((await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY })).status).toBe('CONNECTED');
      expect(sealedIn(deployment.config!, row()).apiKey).toBe(SANDBOX_KEY);
    });

    it("keeps whether Asaas approved the account, and connects all the same when it has not or does not say (BEELINK-278)", async () => {
      const waiting = build();
      waiting.asaas.approved = 'AWAITING_APPROVAL';
      expect(await waiting.service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY })).toMatchObject({ status: 'CONNECTED', approval: 'AWAITING_APPROVAL', approvalCheckedAt: expect.any(String) });
      expect(waiting.row()).toMatchObject({ accountApproval: 'AWAITING_APPROVAL', accountApprovalCheckedAt: expect.any(Date) });

      // Not known is written as such over what a key replaced had been read as.
      const silent = build({ ...connectedRow(deployment.config!, OLD_KEY, null), accountApproval: 'REJECTED', accountApprovalCheckedAt: new Date('2026-10-01T12:00:00Z') });
      silent.asaas.approved = new AsaasUnreachable('Asaas failed (503)');
      expect(await silent.service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY })).toMatchObject({ status: 'CONNECTED', approval: null, approvalCheckedAt: null });
      expect(silent.row()).toMatchObject({ accountApproval: null, accountApprovalCheckedAt: null });
    });

    it('refuses to connect where there is nowhere to seal a key, and says so when read', async () => {
      deployment.config = null;
      const { service, asaas } = build();

      const refused = await service.connect('lessari', 'owner', { apiKey: SANDBOX_KEY }).catch((error: unknown) => error);
      expect([statusOf(refused), codeOf(refused)]).toEqual([503, 'INTEGRATION_UNAVAILABLE']);
      expect(asaas.calls).toEqual([]);
      expect(await service.connection('lessari', 'owner')).toEqual({ available: false, environment: 'SANDBOX', status: 'DISCONNECTED', account: null, webhook: null, approval: null, approvalCheckedAt: null, connectedAt: null });
    });
  });

  it('reads the connection without the key or the token', async () => {
    const { service } = build({ ...connectedRow(deployment.config!, SANDBOX_KEY, 'wh_1'), accountName: 'Lessari', accountDocument: '***.456.789-**', webhookState: 'REGISTERED' });

    const connection = await service.connection('lessari', 'owner');

    expect(connection).toEqual({ available: true, environment: 'SANDBOX', status: 'CONNECTED', account: { name: 'Lessari', document: '***.456.789-**' }, webhook: 'REGISTERED', approval: null, approvalCheckedAt: null, connectedAt: '2026-10-01T12:00:00.000Z' });
    expect(JSON.stringify(connection)).not.toMatch(/aact|old-token/);
  });

  describe('disconnecting', () => {
    it("removes the webhook from the shop's account with the key it was made with, then the key", async () => {
      const { service, asaas, row } = build(connectedRow(deployment.config!, SANDBOX_KEY, 'wh_1'));

      await service.disconnect('lessari', 'owner');

      expect(asaas.deleted).toEqual([{ apiKey: SANDBOX_KEY, id: 'wh_1' }]);
      expect(row()).toBeNull();
    });

    it("lets go of the key even when Asaas does not answer, and asks nothing when no webhook was registered", async () => {
      const unanswered = build(connectedRow(deployment.config!, SANDBOX_KEY, 'wh_1'));
      unanswered.asaas.down = true;
      await unanswered.service.disconnect('lessari', 'owner');
      expect(unanswered.row()).toBeNull();

      const skipped = build(connectedRow(deployment.config!, SANDBOX_KEY, null));
      await skipped.service.disconnect('lessari', 'owner');
      expect(skipped.asaas.calls).toEqual([]);
      expect(skipped.row()).toBeNull();
    });

    it('does nothing for a shop that was never connected', async () => {
      const { service, asaas, tx } = build();

      await service.disconnect('lessari', 'owner');

      expect(asaas.calls).toEqual([]);
      expect(tx.storeIntegration.delete).not.toHaveBeenCalled();
    });
  });
});
