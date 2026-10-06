// Node
import { randomBytes } from 'node:crypto';

// Types
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { AsaasConfig } from './asaas.config.js';

// App
import { AsaasWithoutCharges } from '../../../../test/support/asaas-stub.js';
import { seal } from '../secret-vault.js';
import { AsaasRefused, AsaasUnreachable, type AsaasAccountInfo, type AsaasWebhookRequest, type AsaasWebhookStanding } from './asaas.client.js';
import { AsaasWebhookKeeper } from './asaas-webhook-keeper.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const KEY = '$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjAwMDAwMDAwMDAwMDAwMDAwMDA';
const TOKEN = 'the-token-this-shop-was-given-when-it-connected';
const NOW = new Date('2026-10-06T12:00:00.000Z');
const WEBHOOK_URL = 'https://beelink.biz/api/integrations/asaas/webhook';

/** The deployment, as each test needs it: the module reads `asaasConfig()` where it would read the env. */
const deployment = vi.hoisted(() => ({ config: null as AsaasConfig | null }));
vi.mock('./asaas.config.js', async (original) => ({ ...(await original<typeof import('./asaas.config.js')>()), asaasConfig: () => deployment.config }));

/** Asaas, as far as keeping a webhook goes. */
class FakeAsaas extends AsaasWithoutCharges {
  readonly calls: string[] = [];
  readonly created: { apiKey: string; webhook: AsaasWebhookRequest }[] = [];
  standing: AsaasWebhookStanding | null = { enabled: true, interrupted: false };
  failing: Partial<Record<'account' | 'webhook' | 'resumeWebhook' | 'createWebhook', unknown>> = {};

  private enter(call: 'account' | 'webhook' | 'resumeWebhook' | 'createWebhook'): void {
    this.calls.push(call);
    if (this.failing[call]) throw this.failing[call];
  }

  async account(): Promise<AsaasAccountInfo> {
    this.enter('account');
    return { name: 'Lessari', document: '11222333000181' };
  }

  async createWebhook(_config: AsaasConfig, apiKey: string, webhook: AsaasWebhookRequest): Promise<string> {
    this.enter('createWebhook');
    this.created.push({ apiKey, webhook });
    return 'wh_new';
  }

  async deleteWebhook(): Promise<void> {}

  async webhook(): Promise<AsaasWebhookStanding | null> {
    this.enter('webhook');
    return this.standing;
  }

  async resumeWebhook(): Promise<void> {
    this.enter('resumeWebhook');
    this.standing = { enabled: true, interrupted: false };
  }
}

/** One shop's connection, in memory, behind the calls the keeper makes. */
function build(over: Record<string, unknown> = {}) {
  const config: AsaasConfig = { environment: 'SANDBOX', baseUrl: 'https://api-sandbox.asaas.com/v3', userAgent: 'bee-link', contactEmail: 'contato@beecoders.net', webhookUrl: WEBHOOK_URL, vaultKey: randomBytes(32) };
  deployment.config = config;
  let row: Record<string, unknown> = {
    id: 'int-1',
    storeId: STORE,
    provider: 'ASAAS',
    status: 'CONNECTED',
    webhookId: 'wh_1',
    webhookState: 'REGISTERED',
    webhookCheckedAt: null,
    lastError: null,
    connectedAt: new Date('2026-10-01T12:00:00Z'),
    secretSealed: seal(JSON.stringify({ apiKey: KEY, webhookToken: TOKEN }), config.vaultKey, { storeId: STORE, provider: 'ASAAS' }),
    ...over,
  };
  const states: unknown[] = [];
  const prisma = {
    storeIntegration: {
      findMany: vi.fn(async () => (row.status === 'CONNECTED' ? [row] : [])),
      findUnique: vi.fn(async () => row),
      updateMany: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        row = { ...row, ...data };
        if ('webhookState' in data) states.push(data.webhookState);
        return { count: 1 };
      }),
    },
    store: { findUniqueOrThrow: vi.fn(async () => ({ slug: 'lessari' })) },
  } as unknown as PrismaService;
  const asaas = new FakeAsaas();
  return { keeper: new AsaasWebhookKeeper(prisma, asaas), asaas, config, row: () => row, states };
}

describe('AsaasWebhookKeeper (BEELINK-206)', () => {
  it('reads a webhook that sends, and writes that it was looked at', async () => {
    const { keeper, asaas, row } = build();

    expect(await keeper.checkDue(NOW)).toBe(1);

    expect(asaas.calls).toEqual(['webhook']);
    expect(row()).toMatchObject({ webhookState: 'REGISTERED', webhookCheckedAt: NOW, status: 'CONNECTED' });
  });

  it('sets a queue Asaas interrupted going again, saying it was paused on the way', async () => {
    const { keeper, asaas, row, states } = build();
    asaas.standing = { enabled: true, interrupted: true };

    await keeper.checkDue(NOW);

    expect(asaas.calls).toEqual(['webhook', 'resumeWebhook']);
    expect(states).toEqual(['PAUSED', 'REGISTERED']);
    expect(row()).toMatchObject({ webhookState: 'REGISTERED', webhookCheckedAt: NOW });
  });

  it('leaves it paused, for the panel to show, when Asaas does not take the resuming', async () => {
    const { keeper, asaas, row } = build();
    asaas.standing = { enabled: false, interrupted: false };
    asaas.failing.resumeWebhook = new AsaasUnreachable('Asaas failed (503)');

    await keeper.checkDue(NOW);

    expect(row()).toMatchObject({ webhookState: 'PAUSED', webhookCheckedAt: NOW, status: 'CONNECTED' });
  });

  it('registers again, with the token the shop already has, a webhook removed at Asaas or never registered', async () => {
    const removed = build();
    removed.asaas.standing = null;
    await removed.keeper.checkDue(NOW);
    expect(removed.asaas.created).toEqual([{ apiKey: KEY, webhook: { name: 'bee-link (lessari)', url: WEBHOOK_URL, email: 'contato@beecoders.net', authToken: TOKEN } }]);
    expect(removed.row()).toMatchObject({ webhookId: 'wh_new', webhookState: 'REGISTERED', lastError: null });

    const never = build({ webhookId: null, webhookState: 'ERROR', lastError: 'Asaas failed (503)' });
    await never.keeper.checkDue(NOW);
    expect(never.asaas.calls).toEqual(['createWebhook']);
    expect(never.row()).toMatchObject({ webhookId: 'wh_new', webhookState: 'REGISTERED', lastError: null });
  });

  it('marks the connection to be reconnected when Asaas refuses the key, on the daily look and on a probe', async () => {
    const refusal = new AsaasRefused(401, 'invalid_access_token', 'A chave de API fornecida é inválida');
    const daily = build();
    daily.asaas.failing.webhook = refusal;
    await daily.keeper.checkDue(NOW);
    expect(daily.row()).toMatchObject({ status: 'NEEDS_RECONNECT', lastError: refusal.message });

    const probed = build();
    probed.asaas.failing.account = refusal;
    await probed.keeper.probe(STORE);
    expect(probed.row()).toMatchObject({ status: 'NEEDS_RECONNECT' });

    // A key that still opens is another key of the account that stopped: nothing changes.
    const fine = build();
    await fine.keeper.probe(STORE);
    expect(fine.row()).toMatchObject({ status: 'CONNECTED' });
    // No answer is not a refusal: whoever asked tries again.
    const silent = build();
    silent.asaas.failing.account = new AsaasUnreachable('Asaas failed (503)');
    await expect(silent.keeper.probe(STORE)).rejects.toBeInstanceOf(AsaasUnreachable);
    expect(silent.row()).toMatchObject({ status: 'CONNECTED' });
  });

  it('does nothing where no key can be opened', async () => {
    const { keeper, asaas } = build();
    deployment.config = null;

    expect(await keeper.checkDue(NOW)).toBe(0);
    await keeper.probe(STORE);
    expect(asaas.calls).toEqual([]);
  });
});
