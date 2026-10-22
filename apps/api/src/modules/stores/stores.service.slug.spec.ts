// Nest
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

// Types
import type { Mock } from 'vitest';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoreGeocoder } from './store-geocoder.service.js';
import type { StoreRow } from './store.mapper.js';

// App
import { StoresService } from './stores.service.js';

const OWNER = '0199a0f1-0000-7000-8000-00000000000a';
const STRANGER = '0199a0f1-0000-7000-8000-00000000000b';
const PAGE = '0199a0f1-0000-7000-8000-000000000001';
/** 17/10/2026, 15h in Brasília. */
const NOW = new Date('2026-10-17T18:00:00.000Z');

const row = {
  id: PAGE,
  ownerId: OWNER,
  slug: 'padaria-do-bairo',
  slugChangedAt: null,
  name: 'Padaria do Bairro',
  type: 'ECOMMERCE',
  description: null,
  logoUrl: null,
  faviconUrl: null,
  bannerImageUrl: null,
  categoryId: null,
  pageVersions: [],
  pages: [],
  integrations: [],
  category: null,
  cashbackSettings: null,
  layoutType: 'DEFAULT',
  routeVocabulary: 'PT_BR',
  colorBackground: '#F0F9FF',
  colorPrimary: '#3B7AF7',
  colorFooter: '#3B7AF7',
  colorHeader: '#3B7AF7',
  whatsappPhone: '5511999998888',
  instagram: null,
  tiktok: null,
  spotify: null,
  youtube: null,
  addressStreet: null,
  addressNumber: null,
  addressComplement: null,
  addressNeighborhood: null,
  addressCity: null,
  addressState: null,
  addressZipCode: null,
  latitude: null,
  longitude: null,
  layoutSettings: {},
  paymentMethods: ['PIX'],
  customDomain: null,
  customDomainStatus: null,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
} as unknown as StoreRow;

interface Fakes {
  /** The page as the owner's lookup reads it, by its address. */
  byAddress: Mock<(args: unknown) => Promise<unknown>>;
  /** The page as the change reads it again, by its id, under its row's lock. */
  held: Mock<(args: unknown) => Promise<unknown>>;
  lockAndRow: ReturnType<typeof vi.fn>;
  taken: ReturnType<typeof vi.fn>;
  history: { findUnique: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  update: ReturnType<typeof vi.fn>;
}

function build(stored: StoreRow | null = row): { service: StoresService; fakes: Fakes } {
  const fakes: Fakes = {
    byAddress: vi.fn((_args: unknown): Promise<unknown> => Promise.resolve(stored)),
    held: vi.fn((_args: unknown): Promise<unknown> => Promise.resolve(stored ? { slug: stored.slug, slugChangedAt: stored.slugChangedAt } : null)),
    lockAndRow: vi.fn().mockResolvedValue(1),
    taken: vi.fn().mockResolvedValue([{ taken: false }]),
    history: { findUnique: vi.fn().mockResolvedValue(null), deleteMany: vi.fn().mockResolvedValue({ count: 0 }), create: vi.fn().mockResolvedValue({}) },
    update: vi.fn().mockImplementation(({ data }: { data: { slug: string; slugChangedAt: Date } }) => Promise.resolve({ ...row, ...data })),
  };

  const prisma = {
    store: {
      findUnique: vi.fn().mockImplementation((args: { where: { slug?: string; id?: string } }) => (args.where.id ? fakes.held(args) : fakes.byAddress(args))),
      update: fakes.update,
    },
    storeSlugHistory: fakes.history,
    $queryRaw: fakes.taken,
    $executeRaw: fakes.lockAndRow,
    $transaction: vi.fn().mockImplementation((run: (tx: unknown) => unknown) => run(prisma)),
  } as unknown as PrismaService;

  return { service: new StoresService(prisma, {} as StoreGeocoder), fakes };
}

const codeOf = async (work: Promise<unknown>): Promise<unknown> => work.then(() => null, (error: { getResponse: () => unknown }) => error.getResponse());

describe('StoresService.changeSlug (BEELINK-331)', () => {
  it('moves the page to the new address, keeps the old one in its history, and counts the 30 days from now', async () => {
    const { service, fakes } = build();

    const store = await service.changeSlug('padaria-do-bairo', OWNER, 'padaria-do-bairro', NOW);

    expect(store.slug).toBe('padaria-do-bairro');
    expect(store.slugChangeableOn).toBe('2026-11-16');
    expect(fakes.history.create).toHaveBeenCalledWith({ data: { slug: 'padaria-do-bairo', storeId: PAGE, leftAt: NOW } });
    // An address the page itself once left is taken back out of the history.
    expect(fakes.history.deleteMany).toHaveBeenCalledWith({ where: { slug: 'padaria-do-bairro', storeId: PAGE } });
    expect(fakes.update.mock.calls[0]![0]).toMatchObject({ where: { id: PAGE }, data: { slug: 'padaria-do-bairro', slugChangedAt: NOW } });
  });

  it("holds the page's row, then the new address's lock, before it asks whether the address is free", async () => {
    const { service, fakes } = build();

    await service.changeSlug('padaria-do-bairo', OWNER, 'padaria-do-bairro', NOW);

    const [rowLock, slugLock] = fakes.lockAndRow.mock.calls.map((call) => (call[0] as readonly string[]).join('?'));
    expect(rowLock).toMatch(/FOR UPDATE/);
    expect(slugLock).toMatch(/pg_advisory_xact_lock/);
    expect(fakes.lockAndRow.mock.calls[1]![1]).toBe('store-slug:padaria-do-bairro');
    // Asked for this page: its own left addresses are free for it.
    expect(fakes.taken.mock.calls[0]).toContain(PAGE);
  });

  it('refuses an address held by a page or left by another, and writes nothing', async () => {
    const { service, fakes } = build();
    fakes.taken.mockResolvedValue([{ taken: true }]);

    expect(await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-central', NOW))).toMatchObject({ errorCode: 'STORE_SLUG_TAKEN' });
    expect(fakes.history.create).not.toHaveBeenCalled();
    expect(fakes.update).not.toHaveBeenCalled();
  });

  it('answers a unique violation lost in a race as the address taken', async () => {
    const { service, fakes } = build();
    fakes.update.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }));

    await expect(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-central', NOW)).rejects.toThrow(ConflictException);
  });

  it('refuses the address it has, a route of the app, and what is no address', async () => {
    const { service, fakes } = build();

    expect(await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-do-bairo', NOW))).toMatchObject({ errorCode: 'STORE_SLUG_UNCHANGED' });
    expect(await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'admin', NOW))).toMatchObject({ errorCode: 'STORE_SLUG_RESERVED' });
    expect(await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'ab', NOW))).toMatchObject({ errorCode: 'STORE_SLUG_INVALID' });
    await expect(service.changeSlug('padaria-do-bairo', OWNER, 'admin', NOW)).rejects.toThrow(BadRequestException);
    expect(fakes.lockAndRow).not.toHaveBeenCalled();
  });

  it('refuses a second change within 30 days with the first day it is accepted, and takes it on that day', async () => {
    const changedAt = new Date('2026-10-17T02:00:00.000Z'); // 16/10, 23h in Brasília
    const { service, fakes } = build({ ...row, slugChangedAt: changedAt } as StoreRow);

    const refused = await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-central', new Date('2026-11-15T02:59:59.999Z')));
    expect(refused).toMatchObject({ errorCode: 'STORE_SLUG_CHANGE_TOO_SOON', details: { changeableOn: '2026-11-15' } });
    expect(fakes.lockAndRow).not.toHaveBeenCalled();

    await expect(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-central', new Date('2026-11-15T03:00:00.000Z'))).resolves.toMatchObject({ slug: 'padaria-central' });
  });

  it('checks the 30 days again under the lock: a change that went first refuses the one waiting on it', async () => {
    const { service, fakes } = build();
    fakes.held.mockResolvedValue({ slug: 'padaria-do-bairo', slugChangedAt: NOW });

    expect(await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-central', NOW))).toMatchObject({ errorCode: 'STORE_SLUG_CHANGE_TOO_SOON' });
    expect(fakes.update).not.toHaveBeenCalled();
  });

  it('answers STORE_MOVED, with the address the page has now, when another change of it went first', async () => {
    const { service, fakes } = build();
    fakes.held.mockResolvedValue({ slug: 'padaria-nova', slugChangedAt: null });

    expect(await codeOf(service.changeSlug('padaria-do-bairo', OWNER, 'padaria-central', NOW))).toMatchObject({ errorCode: 'STORE_MOVED', details: { slug: 'padaria-nova' } });
    expect(fakes.update).not.toHaveBeenCalled();
  });

  it("refuses a stranger before anything is asked of the address", async () => {
    const { service, fakes } = build();

    await expect(service.changeSlug('padaria-do-bairo', STRANGER, 'padaria-central', NOW)).rejects.toThrow(ForbiddenException);
    expect(fakes.taken).not.toHaveBeenCalled();
  });
});

describe('an address a page left (BEELINK-331)', () => {
  it('answers STORE_MOVED and where the page is now, on every lookup of a page by its address', async () => {
    const { service, fakes } = build(null);
    fakes.history.findUnique.mockResolvedValue({ store: { slug: 'padaria-do-bairro' } });
    const moved = { errorCode: 'STORE_MOVED', details: { slug: 'padaria-do-bairro' } };

    expect(await codeOf(service.publicBySlug('padaria-do-bairo'))).toMatchObject(moved);
    expect(await codeOf(service.publicStoreId('padaria-do-bairo'))).toMatchObject(moved);
    expect(await codeOf(service.publicStoreNaming('padaria-do-bairo'))).toMatchObject(moved);
    expect(await codeOf(service.ownedStoreId('padaria-do-bairo', OWNER))).toMatchObject(moved);
    expect(await codeOf(service.bySlug('padaria-do-bairo', OWNER))).toMatchObject(moved);
    await expect(service.publicBySlug('padaria-do-bairo')).rejects.toThrow(NotFoundException);
  });

  it('is STORE_NOT_FOUND still for an address no page ever had', async () => {
    const { service } = build(null);

    expect(await codeOf(service.publicBySlug('nada-aqui'))).toEqual({ errorCode: 'STORE_NOT_FOUND', message: 'No shop at "nada-aqui"' });
  });
});

describe('StoresService.slugAvailability (BEELINK-331)', () => {
  it('says why an address cannot be the new one, and that a free one can', async () => {
    const { service, fakes } = build();

    await expect(service.slugAvailability('padaria-do-bairo', OWNER, 'padaria-do-bairo')).resolves.toEqual({ slug: 'padaria-do-bairo', available: false, reason: 'UNCHANGED' });
    await expect(service.slugAvailability('padaria-do-bairo', OWNER, 'login')).resolves.toMatchObject({ available: false, reason: 'RESERVED' });
    await expect(service.slugAvailability('padaria-do-bairo', OWNER, '')).resolves.toMatchObject({ available: false, reason: 'INVALID' });
    await expect(service.slugAvailability('padaria-do-bairo', OWNER, 'padaria-central')).resolves.toEqual({ slug: 'padaria-central', available: true, reason: null });

    fakes.taken.mockResolvedValue([{ taken: true }]);
    await expect(service.slugAvailability('padaria-do-bairo', OWNER, 'padaria-central')).resolves.toMatchObject({ available: false, reason: 'TAKEN' });
  });
});
