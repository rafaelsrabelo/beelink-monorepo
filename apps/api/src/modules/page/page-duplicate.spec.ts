// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { PageComponentsService } from './page-components.service.js';
import { PageRules } from './page.rules.js';
import { PageService } from './page.service.js';
import { ShowcaseRules } from './showcase.rules.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const BAND = '0199b000-0000-7000-8000-000000000001';
const BLOCK = '0199c000-0000-7000-8000-000000000001';
const PAGE = '0199f000-0000-7000-8000-000000000001';
const ON_PAGE = { pageId: PAGE, page: { kind: 'HOME' } };
const AT = new Date('2026-09-25T00:00:00.000Z');

function block(id: string, over: Record<string, unknown> = {}) {
  return {
    id,
    sectionId: BAND,
    storeId: STORE,
    kind: 'BANNER',
    title: 'Coleção',
    subtitle: null,
    body: null,
    span: 'THIRD',
    display: 'GRID',
    source: null,
    sourceCategoryId: null,
    limit: null,
    columns: null,
    align: null,
    items: [{ id: 'slide-1', imageUrl: 'https://cdn.example/a.png', target: 'NONE' }],
    position: 0,
    isActive: true,
    createdAt: AT,
    updatedAt: AT,
    ...over,
  };
}

/** The shop's bands, in order, and the blocks of the band being copied from. */
function build({ kinds = ['BANNER'] as string[], bands = ['before', BAND, 'after'], siblings = [BLOCK, 'next'] } = {}) {
  const original = {
    id: BAND,
    storeId: STORE,
    pageId: PAGE,
    name: 'Coleções',
    width: 'FULL',
    background: 'oklch(0.9 0.05 80)',
    position: 1,
    isActive: true,
    createdAt: AT,
    updatedAt: AT,
    components: kinds.map((kind, index) => block(index === 0 ? BLOCK : `block-${index}`, { kind, position: index, isActive: index === 0 })),
  };

  const prisma = {
    storeSection: {
      findUnique: vi.fn().mockResolvedValue({ storeId: STORE, ...ON_PAGE }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(original),
      findMany: vi.fn().mockResolvedValue(bands.map((id, position) => ({ id, position }))),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 'copy',
        createdAt: AT,
        updatedAt: AT,
        ...data,
        components: [],
      })),
    },
    storeComponent: {
      findUnique: vi.fn().mockResolvedValue({ storeId: STORE, kind: kinds[0], sectionId: BAND, section: ON_PAGE }),
      findUniqueOrThrow: vi.fn().mockResolvedValue(block(BLOCK, { kind: kinds[0] })),
      findMany: vi.fn().mockResolvedValue(siblings.map((id, position) => ({ id, position }))),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({ id: 'copy', createdAt: AT, updatedAt: AT, ...data })),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $transaction: vi.fn(),
  } as unknown as PrismaService;
  vi.mocked(prisma.$transaction).mockImplementation(((work: (tx: PrismaService) => unknown) => work(prisma)) as never);

  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;
  const rules = new PageRules(prisma);

  return {
    prisma,
    bands: new PageService(prisma, stores, rules, new ShowcaseRules(prisma)),
    blocks: new PageComponentsService(prisma, stores, rules, new ShowcaseRules(prisma)),
  };
}

describe('PageService.duplicateSection', () => {
  it('lands the copy right after the band, moving the ones after it down', async () => {
    const { bands, prisma } = build();

    await bands.duplicateSection('lessari', 'user-1', BAND);

    expect(prisma.storeSection.update).toHaveBeenCalledWith({ where: { id: 'after' }, data: { position: 3 } });
    expect(prisma.storeSection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ position: 2 }) }));
    // On the original's page, placed among that page's bands and no other's.
    expect(prisma.storeSection.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { pageId: PAGE } }));
    expect(prisma.storeSection.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pageId: PAGE }) }));
  });

  // Hidden until Publicar; unnamed, because the site's menu is made of the named bands.
  it('copies the look and the blocks, hidden and without a name, each block keeping whether it shows', async () => {
    const { bands, prisma } = build({ kinds: ['BANNER', 'HEADING'] });

    const copy = await bands.duplicateSection('lessari', 'user-1', BAND);

    const { data } = vi.mocked(prisma.storeSection.create).mock.calls[0]![0] as unknown as { data: Record<string, unknown> & { components: { create: Record<string, unknown>[] } } };
    expect(data).toMatchObject({ name: null, width: 'FULL', background: 'oklch(0.9 0.05 80)', isActive: false });
    expect(data.components.create.map((row) => [row.kind, row.position, row.isActive])).toEqual([
      ['BANNER', 0, true],
      ['HEADING', 1, false],
    ]);
    expect(copy).toMatchObject({ id: 'copy', isActive: false });
  });

  it('refuses a band holding the strip, which is one per shop, and writes nothing', async () => {
    const { bands, prisma } = build({ kinds: ['ANNOUNCEMENT'] });

    const refusal: unknown = await bands.duplicateSection('lessari', 'user-1', BAND).catch((error: unknown) => error);

    expect(refusal).toBeInstanceOf(ConflictException);
    expect(refusal).toMatchObject({ response: { errorCode: 'COMPONENT_KIND_SINGLETON' } });
    expect(prisma.storeSection.create).not.toHaveBeenCalled();
  });

  it('answers a band of another shop as one it does not have', async () => {
    const { bands, prisma } = build();
    vi.mocked(prisma.storeSection.findUnique).mockResolvedValue({ storeId: 'another-shop', ...ON_PAGE } as never);

    await expect(bands.duplicateSection('lessari', 'user-1', BAND)).rejects.toMatchObject({
      response: { errorCode: 'SECTION_NOT_FOUND' },
    });
    expect(prisma.storeSection.create).not.toHaveBeenCalled();
  });
});

describe('PageComponentsService.duplicateComponent', () => {
  it('lands a hidden copy right after the block, in its band, with fresh item ids', async () => {
    const { blocks, prisma } = build({ siblings: [BLOCK, 'next'] });

    const copy = await blocks.duplicateComponent('lessari', 'user-1', BLOCK);

    expect(prisma.storeComponent.update).toHaveBeenCalledWith({ where: { id: 'next' }, data: { position: 2 } });
    const { data } = vi.mocked(prisma.storeComponent.create).mock.calls[0]![0] as unknown as { data: Record<string, unknown> & { items: { id: string }[] } };
    expect(data).toMatchObject({ sectionId: BAND, kind: 'BANNER', title: 'Coleção', span: 'THIRD', display: 'GRID', position: 1, isActive: false });
    expect(data.items[0]?.id).not.toBe('slide-1');
    expect(copy).toMatchObject({ id: 'copy', isActive: false });
  });

  it('refuses the strip', async () => {
    const { blocks, prisma } = build({ kinds: ['ANNOUNCEMENT'] });

    await expect(blocks.duplicateComponent('lessari', 'user-1', BLOCK)).rejects.toMatchObject({
      response: { errorCode: 'COMPONENT_KIND_SINGLETON' },
    });
    expect(prisma.storeComponent.create).not.toHaveBeenCalled();
  });

  it('answers an id that is not a block as one this shop does not have', async () => {
    const { blocks } = build();

    await expect(blocks.duplicateComponent('lessari', 'user-1', 'not-a-uuid')).rejects.toMatchObject({
      response: { errorCode: 'COMPONENT_NOT_FOUND' },
    });
  });
});
