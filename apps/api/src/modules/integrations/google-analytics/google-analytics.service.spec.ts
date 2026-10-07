// Nest
import { ForbiddenException } from '@nestjs/common';

// Types
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { StoresService } from '../../stores/stores.service.js';

// App
import { GoogleAnalyticsService } from './google-analytics.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const NOW = new Date('2026-10-07T12:00:00.000Z');
const ID = 'G-AB12CD34EF';
const DISCONNECTED = { status: 'DISCONNECTED', measurementId: null, connectedAt: null };

interface Row {
  storeId: string;
  provider: string;
  status: 'CONNECTED';
  measurementId: string | null;
  connectedAt: Date;
}

/** One shop's `store_integrations`, in memory, behind the calls the service makes. */
function build(existing: Row | null = null) {
  let row = existing;
  const storeIntegration = {
    findUnique: vi.fn(async () => row),
    upsert: vi.fn(async ({ create, update }: { create: Row; update: Partial<Row> }) => {
      row = row ? { ...row, ...update } : create;
      return row;
    }),
    deleteMany: vi.fn(async () => {
      const count = row ? 1 : 0;
      row = null;
      return { count };
    }),
  };
  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) };
  const service = new GoogleAnalyticsService({ storeIntegration } as unknown as PrismaService, stores as unknown as StoresService);
  return { service, storeIntegration, stores, row: () => row };
}

describe('GoogleAnalyticsService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('says a shop with no ID is disconnected', async () => {
    const { service, stores } = build();

    expect(await service.connection('lessari', 'owner')).toEqual(DISCONNECTED);
    expect(stores.ownedStoreId).toHaveBeenCalledWith('lessari', 'owner');
  });

  it("saves the ID in the shop's own GOOGLE_ANALYTICS row, and answers it with when", async () => {
    const { service, storeIntegration } = build();

    expect(await service.connect('lessari', 'owner', { measurementId: ID })).toEqual({ status: 'CONNECTED', measurementId: ID, connectedAt: NOW.toISOString() });
    expect(storeIntegration.upsert.mock.calls[0]?.[0]).toMatchObject({ where: { storeId_provider: { storeId: STORE, provider: 'GOOGLE_ANALYTICS' } }, create: { storeId: STORE, provider: 'GOOGLE_ANALYTICS', measurementId: ID } });
    expect(await service.connection('lessari', 'owner')).toMatchObject({ status: 'CONNECTED', measurementId: ID });
  });

  /** The ID is public: a deployment with no INTEGRATIONS_SECRET_KEY saves one, because nothing is sealed. */
  it('seals nothing and reads nothing sealed', async () => {
    const { service, storeIntegration } = build();

    await service.connect('lessari', 'owner', { measurementId: ID });
    await service.connection('lessari', 'owner');

    const [written] = storeIntegration.upsert.mock.calls[0] as unknown as [{ create: object; update: object; select: object }];
    expect(Object.keys(written.create)).not.toContain('secretSealed');
    expect(Object.keys(written.update)).not.toContain('secretSealed');
    expect(Object.keys(written.select)).not.toContain('secretSealed');
    expect(Object.keys((storeIntegration.findUnique.mock.calls[0] as unknown as [{ select: object }])[0].select)).not.toContain('secretSealed');
  });

  it('replaces the ID in the same row, and when it was saved starts over', async () => {
    const { service, storeIntegration, row } = build({ storeId: STORE, provider: 'GOOGLE_ANALYTICS', status: 'CONNECTED', measurementId: 'G-OLD0000001', connectedAt: new Date('2026-09-01T00:00:00.000Z') });

    expect(await service.connect('lessari', 'owner', { measurementId: ID })).toEqual({ status: 'CONNECTED', measurementId: ID, connectedAt: NOW.toISOString() });
    expect(storeIntegration.upsert).toHaveBeenCalledTimes(1);
    expect(row()).toMatchObject({ measurementId: ID, connectedAt: NOW });
  });

  it('writes nothing the payload does not name, whatever else rides on it', async () => {
    const { service, storeIntegration } = build();

    await service.connect('lessari', 'owner', { measurementId: ID, storeId: 'another-shop', pixelId: '1234567890123456', accountName: '<script>' } as { measurementId: string });

    const [written] = storeIntegration.upsert.mock.calls[0] as unknown as [{ create: object }];
    expect(written.create).toEqual({ storeId: STORE, provider: 'GOOGLE_ANALYTICS', status: 'CONNECTED', measurementId: ID, lastError: null, connectedAt: NOW });
  });

  it("removes the shop's Google Analytics row and no other party's, and removing none is no error", async () => {
    const { service, storeIntegration } = build({ storeId: STORE, provider: 'GOOGLE_ANALYTICS', status: 'CONNECTED', measurementId: ID, connectedAt: NOW });

    await service.disconnect('lessari', 'owner');
    await service.disconnect('lessari', 'owner');

    expect(storeIntegration.deleteMany).toHaveBeenCalledWith({ where: { storeId: STORE, provider: 'GOOGLE_ANALYTICS' } });
    expect(await service.connection('lessari', 'owner')).toEqual(DISCONNECTED);
  });

  it('says a row with no ID is disconnected rather than connected to nothing', async () => {
    const { service } = build({ storeId: STORE, provider: 'GOOGLE_ANALYTICS', status: 'CONNECTED', measurementId: null, connectedAt: NOW });

    expect(await service.connection('lessari', 'owner')).toEqual(DISCONNECTED);
  });

  it('asks whose shop it is before anything: a stranger reads, saves and removes nothing', async () => {
    const { service, storeIntegration, stores } = build();
    stores.ownedStoreId.mockRejectedValue(new ForbiddenException());

    await expect(service.connection('lessari', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.connect('lessari', 'stranger', { measurementId: ID })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.disconnect('lessari', 'stranger')).rejects.toBeInstanceOf(ForbiddenException);
    expect(storeIntegration.findUnique).not.toHaveBeenCalled();
    expect(storeIntegration.upsert).not.toHaveBeenCalled();
    expect(storeIntegration.deleteMany).not.toHaveBeenCalled();
  });
});
