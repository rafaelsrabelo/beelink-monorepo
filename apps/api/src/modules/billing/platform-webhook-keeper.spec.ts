// App
import { FakePlatformAsaas } from '../../../test/support/fake-platform-asaas.js';
import { AsaasUnreachable } from '../../shared/asaas/asaas-errors.js';
import { PlatformWebhookKeeper } from './platform-webhook-keeper.js';

const URL = 'https://beelink.biz/api/billing/asaas/webhook';
const TOKEN = 'nX0bq3l8V7mYkU2sA9cR4tE6wZ1pH5jD0fG8iK3oL2M=';
const NOW = new Date('2026-10-14T12:00:00.000Z');
const HOUR = 3_600_000;

/** The deployment, as each test needs it: the keeper reads these where it would read the environment. */
const deployment = vi.hoisted(() => ({ enforced: true, url: null as string | null, token: null as string | null }));
vi.mock('./platform-webhook.config.js', () => ({ platformWebhookUrl: () => deployment.url, platformWebhookToken: () => deployment.token }));
vi.mock('../../shared/config/env.js', async (original) => {
  const { env } = await original<typeof import('../../shared/config/env.js')>();
  return { env: new Proxy(env, { get: (target, key) => (key === 'BILLING_ENFORCED' ? deployment.enforced : Reflect.get(target, key)) }) };
});

describe("keeping bee-link's own Asaas webhook (BEELINK-221)", () => {
  const asaas = new FakePlatformAsaas();
  let keeper: PlatformWebhookKeeper;

  beforeEach(() => {
    asaas.reset();
    Object.assign(deployment, { enforced: true, url: URL, token: TOKEN });
    keeper = new PlatformWebhookKeeper(asaas);
  });

  it('registers it when the account has none at its address — beside the webhooks of whatever else the account serves', async () => {
    asaas.webhooksHeld.push({ id: 'other', url: 'https://other.test/hook', name: 'Another product', authToken: 'theirs', enabled: true, interrupted: false });

    expect(await keeper.keep()).toBe('REGISTERED');

    expect(asaas.calls).toEqual(['webhooks', 'createWebhook']);
    expect(asaas.webhooksHeld.at(-1)).toMatchObject({ url: URL, name: 'bee-link (assinaturas)', authToken: TOKEN, enabled: true, interrupted: false });
    expect(asaas.webhooksHeld.find((webhook) => webhook.id === 'other')).toMatchObject({ authToken: 'theirs', enabled: true });
  });

  it('leaves alone one that stands and sends, and registers no second', async () => {
    await keeper.keep();
    asaas.calls.length = 0;

    expect(await keeper.keep()).toBe('STANDING');
    expect(asaas.calls).toEqual(['webhooks']);
    expect(asaas.webhooksHeld).toHaveLength(1);
  });

  it.each([
    ['off', { enabled: false }],
    ['with its queue interrupted', { interrupted: true }],
  ])('sets going again one found %s, with the token of this deployment handed anew', async (_what, standing) => {
    asaas.webhooksHeld.push({ id: 'mine', url: URL, name: 'bee-link (assinaturas)', authToken: 'an-older-token', enabled: true, interrupted: false, ...standing });

    expect(await keeper.keep()).toBe('RESUMED');

    expect(asaas.calls).toEqual(['webhooks', 'resumeWebhook']);
    expect(asaas.webhooksHeld).toEqual([expect.objectContaining({ id: 'mine', enabled: true, interrupted: false, authToken: TOKEN })]);
  });

  it.each([
    ['nothing is charged here', { enforced: false }],
    ['there is no token', { token: null }],
    ['the web is not public https', { url: null }],
  ])('registers nothing, and asks Asaas nothing, where %s', async (_what, change) => {
    Object.assign(deployment, change);

    expect(await keeper.keep()).toBe('SKIPPED');
    expect(asaas.calls).toEqual([]);
  });

  it('registers nothing, and asks nothing, without the key', async () => {
    asaas.configured = false;

    expect(await keeper.keep()).toBe('SKIPPED');
    expect(asaas.calls).toEqual([]);
  });

  it('looks once a day — the first time at the first pass — and an hour after a look that failed', async () => {
    expect(await keeper.checkDue(NOW)).toBe('REGISTERED');
    expect(await keeper.checkDue(new Date(NOW.getTime() + 23 * HOUR))).toBeNull();
    expect(await keeper.checkDue(new Date(NOW.getTime() + 24 * HOUR))).toBe('STANDING');

    const later = new Date(NOW.getTime() + 48 * HOUR);
    asaas.failing('webhooks', new AsaasUnreachable('Asaas failed (503)'));
    await expect(keeper.checkDue(later)).rejects.toBeInstanceOf(AsaasUnreachable);
    expect(await keeper.checkDue(new Date(later.getTime() + HOUR - 1))).toBeNull();
    expect(await keeper.checkDue(new Date(later.getTime() + HOUR))).toBe('STANDING');
  });
});
