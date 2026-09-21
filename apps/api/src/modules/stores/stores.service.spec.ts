// Nest
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { CreateStoreDto, UpdateStoreDto } from './dto/store.dto.js';
import type { StoreGeocoder } from './store-geocoder.service.js';
import type { StoreRow } from './store.mapper.js';

// App
import { StoresService } from './stores.service.js';

const OWNER = '0199a0f1-0000-7000-8000-00000000000a';
const STRANGER = '0199a0f1-0000-7000-8000-00000000000b';

const row = {
  id: '0199a0f1-0000-7000-8000-000000000001',
  ownerId: OWNER,
  slug: 'padaria-do-bairro',
  name: 'Padaria do Bairro',
  type: 'ECOMMERCE',
  description: null,
  logoUrl: null,
  bannerImageUrl: null,
  categoryId: null,
  category: null,
  layoutType: 'DEFAULT',
  showProductsByCategory: false,
  colorBackground: '#F0F9FF',
  colorPrimary: '#3B7AF7',
  colorText: '#1A202C',
  colorHeader: '#3B7AF7',
  whatsappPhone: '5511999998888',
  instagram: null,
  tiktok: null,
  spotify: null,
  youtube: null,
  addressStreet: 'Avenida Paulista',
  addressNumber: '1000',
  addressComplement: null,
  addressNeighborhood: 'Bela Vista',
  addressCity: 'São Paulo',
  addressState: 'SP',
  addressZipCode: '01310930',
  latitude: { toNumber: () => -23.5613 },
  longitude: { toNumber: () => -46.6565 },
  layoutSettings: { showBanner: true, cartPosition: 'bottom-left', legacyKeyNobodyDeclared: 1 },
  paymentMethods: ['MONEY', 'PIX'],
  createdAt: new Date('2026-09-10T12:00:00.000Z'),
  updatedAt: new Date('2026-09-11T12:00:00.000Z'),
} as unknown as StoreRow;

const createDto = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '5511999998888' },
  address: { street: 'Avenida Paulista', city: 'São Paulo', state: 'SP' },
} as CreateStoreDto;

const address = { street: 'Avenida Paulista', number: '1000', city: 'São Paulo', state: 'SP' };

const updateDto = {
  name: 'Padaria do Bairro',
  type: 'ECOMMERCE',
  layoutType: 'DEFAULT',
  showProductsByCategory: false,
  colors: { background: '#F0F9FF', primary: '#3B7AF7', text: '#1A202C', header: '#3B7AF7' },
  socialNetworks: { whatsapp: '5511999998888' },
  address,
  paymentMethods: ['PIX'],
} as UpdateStoreDto;

interface Fakes {
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  category: ReturnType<typeof vi.fn>;
  locate: ReturnType<typeof vi.fn>;
}

/** Collaborators by hand, the way jwt-auth.guard.spec.ts builds them — no Nest testing module. */
function build(stored: StoreRow | null = row): { service: StoresService; fakes: Fakes } {
  const fakes: Fakes = {
    findUnique: vi.fn().mockResolvedValue(stored),
    findMany: vi.fn().mockResolvedValue([row]),
    create: vi.fn().mockResolvedValue(row),
    update: vi.fn().mockResolvedValue(row),
    category: vi.fn().mockResolvedValue({ id: 'category-1' }),
    locate: vi.fn().mockResolvedValue({ latitude: -23.5613, longitude: -46.6565 }),
  };

  const prisma = {
    store: { findUnique: fakes.findUnique, findMany: fakes.findMany, create: fakes.create, update: fakes.update },
    storeCategory: { findUnique: fakes.category },
  } as unknown as PrismaService;

  const geocoder = { locate: fakes.locate } as unknown as StoreGeocoder;

  return { service: new StoresService(prisma, geocoder), fakes };
}

describe('StoresService — the ownership rule', () => {
  it('refuses a stranger the shop, and never writes on the way out', async () => {
    const { service, fakes } = build();

    await expect(service.bySlug('padaria-do-bairro', STRANGER)).rejects.toThrow(ForbiddenException);
    await expect(service.update('padaria-do-bairro', STRANGER, updateDto)).rejects.toThrow(ForbiddenException);
    expect(fakes.update).not.toHaveBeenCalled();

    await service.bySlug('padaria-do-bairro', STRANGER).catch((error: ForbiddenException) => {
      expect(error.getResponse()).toMatchObject({ errorCode: 'STORE_FORBIDDEN' });
    });
  });

  it('answers STORE_NOT_FOUND for a slug no shop holds', async () => {
    const { service } = build(null);

    await expect(service.bySlug('nada', OWNER)).rejects.toThrow(NotFoundException);
    await expect(service.update('nada', OWNER, updateDto)).rejects.toThrow(NotFoundException);
  });

  it('lets the owner through', async () => {
    const { service } = build();

    await expect(service.bySlug('padaria-do-bairro', OWNER)).resolves.toMatchObject({ slug: 'padaria-do-bairro' });
  });
});

describe('StoresService.create', () => {
  it('refuses a slug that would shadow a route of the app, before asking the database', async () => {
    const { service, fakes } = build(null);

    await service.create(OWNER, { ...createDto, slug: 'admin' }).catch((error: BadRequestException) => {
      expect(error.getResponse()).toMatchObject({ errorCode: 'STORE_SLUG_RESERVED' });
    });
    expect(fakes.findUnique).not.toHaveBeenCalled();
  });

  it('reserves `mine`, so no shop can shadow GET /stores/mine', async () => {
    const { service } = build(null);
    await expect(service.create(OWNER, { ...createDto, slug: 'mine' })).rejects.toThrow(BadRequestException);
  });

  it('answers STORE_SLUG_TAKEN when the slug is already a shop', async () => {
    const { service } = build();

    await expect(service.create(OWNER, createDto)).rejects.toThrow(ConflictException);
  });

  it('takes the owner from the session, never from the body', async () => {
    const { service, fakes } = build(null);

    await service.create(OWNER, createDto);

    expect(fakes.create.mock.calls[0]?.[0].data.ownerId).toBe(OWNER);
  });

  it('stores the address and the social networks the legacy POST silently dropped', async () => {
    const { service, fakes } = build(null);

    await service.create(OWNER, createDto);

    expect(fakes.create.mock.calls[0]?.[0].data).toMatchObject({
      addressStreet: 'Avenida Paulista',
      addressCity: 'São Paulo',
      addressState: 'SP',
      whatsappPhone: '5511999998888',
    });
  });

  it('leaves the colour columns out when none were sent, so the platform theme is the default', async () => {
    const { service, fakes } = build(null);

    await service.create(OWNER, createDto);

    expect(fakes.create.mock.calls[0]?.[0].data).not.toHaveProperty('colorPrimary');
  });

  it('refuses a category that does not exist', async () => {
    const { service, fakes } = build(null);
    fakes.category.mockResolvedValue(null);

    await service
      .create(OWNER, { ...createDto, categoryId: '0199a0f1-0000-7000-8000-0000000000c1' })
      .catch((error: NotFoundException) => {
        expect(error.getResponse()).toMatchObject({ errorCode: 'STORE_CATEGORY_NOT_FOUND' });
      });
  });
});

describe('StoresService.update', () => {
  it('geocodes only when the address moved', async () => {
    const { service, fakes } = build();

    await service.update('padaria-do-bairro', OWNER, updateDto);
    expect(fakes.locate).not.toHaveBeenCalled();
    expect(fakes.update.mock.calls[0]?.[0].data).not.toHaveProperty('latitude');

    await service.update('padaria-do-bairro', OWNER, {
      ...updateDto,
      address: { ...updateDto.address, city: 'Campinas' },
    });
    expect(fakes.locate).toHaveBeenCalledTimes(1);
    expect(fakes.update.mock.calls[1]?.[0].data).toMatchObject({ latitude: -23.5613 });
  });

  it('clears what the body leaves out, because a PUT replaces rather than patches', async () => {
    const { service, fakes } = build();

    await service.update('padaria-do-bairro', OWNER, { ...updateDto, address: undefined });

    expect(fakes.update.mock.calls[0]?.[0].data).toMatchObject({
      addressStreet: null,
      addressCity: null,
      instagram: null,
      layoutSettings: {},
    });
  });
});

describe('StoresService.publicBySlug', () => {
  it('serves the storefront shape and nothing an owner alone may read', async () => {
    const { service } = build();

    const store = await service.publicBySlug('padaria-do-bairro');

    expect(Object.keys(store)).not.toContain('ownerId');
    expect(Object.keys(store)).not.toContain('address');
    expect(Object.keys(store)).not.toContain('latitude');
    expect(Object.keys(store)).not.toContain('createdAt');
  });

  it('drops a layout key the contract does not declare rather than failing the shop', async () => {
    const { service } = build();

    const store = await service.publicBySlug('padaria-do-bairro');

    expect(store.layoutSettings).toEqual({ showBanner: true, cartPosition: 'bottom-left' });
  });

  it('answers STORE_NOT_FOUND for a slug no shop holds', async () => {
    const { service } = build(null);

    await expect(service.publicBySlug('nada')).rejects.toThrow(NotFoundException);
  });
});
