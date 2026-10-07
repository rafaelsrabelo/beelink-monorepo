// Nest
import { ConflictException, ForbiddenException } from '@nestjs/common';

// Types
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { StoresService } from '../../stores/stores.service.js';

// App
import { env } from '../../../shared/config/env.js';
import { MetaConversionsClient, MetaEventRefused, MetaPixelNotFound, MetaTokenRejected, MetaUnreachable, type MetaServerEvent } from './meta-conversions.client.js';
import { MetaPixelService } from './meta-pixel.service.js';
import { metaVaultKey, openToken } from './meta-pixel-token.js';

// A deployment with a vault key: the unit suite's environment has none, and only `env.ts` may read one.
vi.mock('./meta-pixel-token.js', async (original) => {
  const key = Buffer.alloc(32, 7);
  return { ...(await original<typeof import('./meta-pixel-token.js')>()), metaVaultKey: () => key };
});

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const NOW = new Date('2026-10-06T12:00:00.000Z');
const TOKEN = 'EAABsecretTOKEN0123456789abcdef';
const NO_TOKEN = { available: true, token: 'NONE', refusal: null, refusedAt: null };

interface Row {
  storeId: string;
  provider: string;
  status: 'CONNECTED';
  pixelId: string | null;
  connectedAt: Date;
  secretSealed: string;
  secretRefusal: 'TOKEN_REJECTED' | 'PIXEL_NOT_FOUND' | null;
  secretRefusedAt: Date | null;
}

const saved = (over: Partial<Row> = {}): Row => ({ storeId: STORE, provider: 'META_PIXEL', status: 'CONNECTED', pixelId: '1111111111111111', connectedAt: NOW, secretSealed: '', secretRefusal: null, secretRefusedAt: null, ...over });

class FakeMeta extends MetaConversionsClient {
  readonly sent: { pixelId: string; accessToken: string; event: MetaServerEvent; testEventCode?: string }[] = [];
  failure: Error | null = null;

  async send(pixelId: string, accessToken: string, event: MetaServerEvent, testEventCode?: string): Promise<void> {
    this.sent.push({ pixelId, accessToken, event, testEventCode });
    if (this.failure) throw this.failure;
  }
}

/** One shop's `store_integrations` row, in memory, behind the calls the service makes. */
function build(existing: Row | null = null) {
  let row = existing;
  const matches = (where: Partial<Row> & { pixelId?: unknown }) =>
    row !== null &&
    (where.secretSealed === undefined || where.secretSealed === row.secretSealed) &&
    (where.secretRefusal === undefined || where.secretRefusal === row.secretRefusal) &&
    (typeof where.pixelId !== 'object' || row.pixelId !== null);
  const storeIntegration = {
    findUnique: vi.fn(async () => row),
    upsert: vi.fn(async ({ create, update }: { create: Partial<Row>; update: Partial<Row> }) => {
      row = row ? { ...row, ...update } : saved(create);
      return row;
    }),
    updateMany: vi.fn(async ({ where, data }: { where: Partial<Row>; data: Partial<Row> }) => {
      if (!matches(where)) return { count: 0 };
      row = { ...row!, ...data };
      return { count: 1 };
    }),
    deleteMany: vi.fn(async () => {
      const count = row ? 1 : 0;
      row = null;
      return { count };
    }),
  };
  const orderMetaPurchase = { updateMany: vi.fn(async () => ({ count: 0 })) };
  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) };
  const meta = new FakeMeta();
  const service = new MetaPixelService({ storeIntegration, orderMetaPurchase } as unknown as PrismaService, stores as unknown as StoresService, meta);
  return { service, storeIntegration, orderMetaPurchase, stores, meta, row: () => row };
}

describe('MetaPixelService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('says a shop with no pixel is disconnected', async () => {
    const { service, stores } = build();

    expect(await service.connection('lessari', 'owner')).toEqual({ status: 'DISCONNECTED', pixelId: null, connectedAt: null, conversions: NO_TOKEN });
    expect(stores.ownedStoreId).toHaveBeenCalledWith('lessari', 'owner');
  });

  it("saves the ID in the shop's own META_PIXEL row, and answers it with when", async () => {
    const { service, storeIntegration } = build();

    expect(await service.connect('lessari', 'owner', { pixelId: '1234567890123456' })).toEqual({ status: 'CONNECTED', pixelId: '1234567890123456', connectedAt: NOW.toISOString(), conversions: NO_TOKEN });
    expect(storeIntegration.upsert.mock.calls[0]?.[0]).toMatchObject({ where: { storeId_provider: { storeId: STORE, provider: 'META_PIXEL' } }, create: { storeId: STORE, provider: 'META_PIXEL', pixelId: '1234567890123456' } });
    expect(await service.connection('lessari', 'owner')).toMatchObject({ status: 'CONNECTED', pixelId: '1234567890123456' });
  });

  /** The ID is public: saving one seals nothing, so a deployment with no INTEGRATIONS_SECRET_KEY saves it. */
  it('seals nothing when an ID is saved', async () => {
    const { service, storeIntegration } = build();

    await service.connect('lessari', 'owner', { pixelId: '1234567890123456' });

    const [written] = storeIntegration.upsert.mock.calls[0] as unknown as [{ create: object; update: object }];
    expect(Object.keys(written.create)).not.toContain('secretSealed');
    expect(Object.keys(written.update)).not.toContain('secretSealed');
  });

  it('replaces the ID in the same row, and when it was saved starts over', async () => {
    const { service, storeIntegration, row } = build(saved({ connectedAt: new Date('2026-09-01T00:00:00.000Z') }));

    expect(await service.connect('lessari', 'owner', { pixelId: '2222222222222222' })).toMatchObject({ status: 'CONNECTED', pixelId: '2222222222222222', connectedAt: NOW.toISOString() });
    expect(storeIntegration.upsert).toHaveBeenCalledTimes(1);
    expect(row()).toMatchObject({ pixelId: '2222222222222222', connectedAt: NOW });
  });

  it('writes nothing the payload does not name, whatever else rides on it', async () => {
    const { service, storeIntegration } = build();

    await service.connect('lessari', 'owner', { pixelId: '1234567890123456', storeId: 'another-shop', accountName: '<script>' } as { pixelId: string });

    const [written] = storeIntegration.upsert.mock.calls[0] as unknown as [{ create: object }];
    expect(written.create).toEqual({ storeId: STORE, provider: 'META_PIXEL', status: 'CONNECTED', pixelId: '1234567890123456', lastError: null, connectedAt: NOW });
  });

  it("removes the shop's pixel row and no other party's, and removing none is no error", async () => {
    const { service, storeIntegration } = build(saved());

    await service.disconnect('lessari', 'owner');
    await service.disconnect('lessari', 'owner');

    expect(storeIntegration.deleteMany).toHaveBeenCalledWith({ where: { storeId: STORE, provider: 'META_PIXEL' } });
    expect(await service.connection('lessari', 'owner')).toMatchObject({ status: 'DISCONNECTED', pixelId: null });
  });

  it('says a row with no ID is disconnected rather than connected to nothing', async () => {
    const { service } = build(saved({ pixelId: null }));

    expect(await service.connection('lessari', 'owner')).toMatchObject({ status: 'DISCONNECTED', pixelId: null, connectedAt: null });
  });

  it('asks whose shop it is before anything: a stranger reads, saves, removes and tests nothing', async () => {
    const { service, storeIntegration, stores, meta } = build(saved());
    stores.ownedStoreId.mockRejectedValue(new ForbiddenException());

    await expect(service.connection('lessari', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.connect('lessari', 'stranger', { pixelId: '1234567890123456' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.disconnect('lessari', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.saveToken('lessari', 'stranger', { accessToken: TOKEN })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.removeToken('lessari', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.sendTestEvent('lessari', 'stranger', 'TEST123')).rejects.toBeInstanceOf(ForbiddenException);
    expect(storeIntegration.findUnique).not.toHaveBeenCalled();
    expect(storeIntegration.upsert).not.toHaveBeenCalled();
    expect(storeIntegration.updateMany).not.toHaveBeenCalled();
    expect(storeIntegration.deleteMany).not.toHaveBeenCalled();
    expect(meta.sent).toEqual([]);
  });

  describe('the Conversions API token (BEELINK-274)', () => {
    it('seals the token in the row, answers only that one is set, and never the token', async () => {
      const { service, row } = build(saved());

      const answered = await service.saveToken('lessari', 'owner', { accessToken: TOKEN });

      expect(answered.conversions).toEqual({ available: true, token: 'SET', refusal: null, refusedAt: null });
      expect(JSON.stringify(answered)).not.toContain(TOKEN);
      expect(row()!.secretSealed).toMatch(/^v1\./);
      expect(row()!.secretSealed).not.toContain(TOKEN);
      expect(openToken(row()!.secretSealed, metaVaultKey()!, STORE)).toBe(TOKEN);
      // Sealed for this shop's row: copied to another shop's, it does not open.
      expect(openToken(row()!.secretSealed, metaVaultKey()!, 'another-shop')).toBeNull();
    });

    it('refuses a token for a shop with no pixel saved', async () => {
      await expect(build().service.saveToken('lessari', 'owner', { accessToken: TOKEN })).rejects.toBeInstanceOf(ConflictException);
      await expect(build(saved({ pixelId: null })).service.saveToken('lessari', 'owner', { accessToken: TOKEN })).rejects.toBeInstanceOf(ConflictException);
    });

    it('forgets what Meta refused of the last token, and makes the purchases that waited due', async () => {
      const { service, orderMetaPurchase } = build(saved({ secretSealed: 'v1.old', secretRefusal: 'TOKEN_REJECTED', secretRefusedAt: NOW }));

      expect((await service.connection('lessari', 'owner')).conversions).toEqual({ available: true, token: 'REJECTED', refusal: 'TOKEN_REJECTED', refusedAt: NOW.toISOString() });
      expect((await service.saveToken('lessari', 'owner', { accessToken: TOKEN })).conversions.token).toBe('SET');
      expect(orderMetaPurchase.updateMany).toHaveBeenCalledWith({ where: { storeId: STORE, processedAt: null }, data: { nextAttemptAt: NOW } });
    });

    /** A token is one pixel's. */
    it('takes the token away when another ID is saved, and keeps it when the same ID is saved again', async () => {
      const { service, row } = build(saved());
      await service.saveToken('lessari', 'owner', { accessToken: TOKEN });

      expect((await service.connect('lessari', 'owner', { pixelId: '1111111111111111' })).conversions.token).toBe('SET');
      expect((await service.connect('lessari', 'owner', { pixelId: '2222222222222222' })).conversions.token).toBe('NONE');
      expect(row()).toMatchObject({ secretSealed: '', secretRefusal: null, secretRefusedAt: null });
    });

    it('removes the token and keeps the pixel', async () => {
      const { service, row } = build(saved());
      await service.saveToken('lessari', 'owner', { accessToken: TOKEN });

      await service.removeToken('lessari', 'owner');

      expect(row()).toMatchObject({ pixelId: '1111111111111111', secretSealed: '' });
      expect((await service.connection('lessari', 'owner')).conversions.token).toBe('NONE');
    });
  });

  describe('the test event (BEELINK-274)', () => {
    async function withToken(over: Partial<Row> = {}) {
      const built = build(saved());
      await built.service.saveToken('lessari', 'owner', { accessToken: TOKEN });
      if (Object.keys(over).length > 0) await built.storeIntegration.updateMany({ where: {}, data: over });
      return built;
    }

    it("sends one synthetic event with the test code and the shop's token, and says Meta took it", async () => {
      const { service, meta } = await withToken();

      expect(await service.sendTestEvent('lessari', 'owner', 'TEST123')).toEqual({ outcome: 'ACCEPTED', detail: null });
      expect(meta.sent).toHaveLength(1);
      expect(meta.sent[0]).toMatchObject({ pixelId: '1111111111111111', accessToken: TOKEN, testEventCode: 'TEST123', event: { event_name: 'BeeLinkTestEvent', event_source_url: `${env.WEB_URL}/lessari` } });
      expect(meta.sent[0]!.event.custom_data).toBeUndefined();
    });

    it.each([
      [new MetaTokenRejected('Meta refused (400, code 190): expired'), 'TOKEN_REJECTED', 'TOKEN_REJECTED'],
      [new MetaPixelNotFound('Meta refused (400, code 100, subcode 33): Unsupported post request'), 'PIXEL_NOT_FOUND', 'PIXEL_NOT_FOUND'],
    ] as const)('says %s as it is, and marks the shop so nothing else is sent with that token', async (failure, outcome, refusal) => {
      const { service, meta, row } = await withToken();
      meta.failure = failure;

      expect(await service.sendTestEvent('lessari', 'owner', 'TEST123')).toEqual({ outcome, detail: failure.message });
      expect(row()).toMatchObject({ secretRefusal: refusal, secretRefusedAt: NOW });
      expect((await service.connection('lessari', 'owner')).conversions).toMatchObject({ token: 'REJECTED', refusal });
    });

    it("says an event Meta refused in Meta's words, and marks nothing: the token was taken", async () => {
      const { service, meta, row } = await withToken();
      meta.failure = new MetaEventRefused('Meta refused (400, code 100): Invalid test event code');

      expect(await service.sendTestEvent('lessari', 'owner', 'NOPE')).toEqual({ outcome: 'EVENT_REFUSED', detail: 'Meta refused (400, code 100): Invalid test event code' });
      expect(row()!.secretRefusal).toBeNull();
    });

    it('says Meta out of reach as that, and decides nothing', async () => {
      const { service, meta, row } = await withToken();
      meta.failure = new MetaUnreachable('Meta failed (503)');

      expect(await service.sendTestEvent('lessari', 'owner', 'TEST123')).toEqual({ outcome: 'UNREACHABLE', detail: null });
      expect(row()!.secretRefusal).toBeNull();
    });

    it('lifts a refusal once Meta takes an event with the same token', async () => {
      const { service, row, orderMetaPurchase } = await withToken({ secretRefusal: 'TOKEN_REJECTED', secretRefusedAt: NOW });
      orderMetaPurchase.updateMany.mockClear();

      expect((await service.sendTestEvent('lessari', 'owner', 'TEST123')).outcome).toBe('ACCEPTED');
      expect(row()).toMatchObject({ secretRefusal: null, secretRefusedAt: null });
      expect(orderMetaPurchase.updateMany).toHaveBeenCalledTimes(1);
    });

    it('sends nothing for a shop with no token, or with one this deployment cannot open', async () => {
      const none = build(saved());
      await expect(none.service.sendTestEvent('lessari', 'owner', 'TEST123')).rejects.toMatchObject({ response: { errorCode: 'INTEGRATION_NOT_CONNECTED' } });

      const foreign = build(saved({ secretSealed: 'v1.not.this.vaults' }));
      await expect(foreign.service.sendTestEvent('lessari', 'owner', 'TEST123')).rejects.toMatchObject({ response: { errorCode: 'INTEGRATION_NEEDS_RECONNECT' } });
      expect([...none.meta.sent, ...foreign.meta.sent]).toEqual([]);
    });
  });
});
