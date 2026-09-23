// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { PageRules } from './page.rules.js';
import { PageService } from './page.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const SECTION = '0199b000-0000-7000-8000-000000000001';
const COMPONENT = '0199c000-0000-7000-8000-000000000001';

const SLIDE = {
  id: 'slide-1',
  imageUrl: 'https://cdn.example/banner.png',
  target: 'NONE' as const,
};

function sectionRow(over: Record<string, unknown> = {}) {
  return {
    id: SECTION,
    storeId: STORE,
    width: 'CONTAINED',
    background: null,
    position: 0,
    isActive: true,
    components: [],
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
    updatedAt: new Date('2026-09-23T00:00:00.000Z'),
    ...over,
  };
}

function componentRow(over: Record<string, unknown> = {}) {
  return {
    id: COMPONENT,
    sectionId: SECTION,
    kind: 'BANNER',
    title: null,
    subtitle: null,
    body: null,
    layout: 'FULL',
    items: [],
    columns: null,
    position: 0,
    isActive: true,
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
    updatedAt: new Date('2026-09-23T00:00:00.000Z'),
    ...over,
  };
}

/**
 * Collaborators by hand, the way every other service spec here builds them. What is asserted is
 * the columns the service decided to write — the judgement is the whole of this module, and the
 * database can only answer it with a constraint name nobody can act on.
 */
function build(
  found: {
    /** What the component being patched already is. */
    kind?: string
    /** A component of the same kind already in the shop, for the singleton rule. */
    existing?: { id: string } | null
    /** Whether the band being written to belongs to this shop. */
    sectionOfAnotherShop?: boolean
    /** The bands the shop has, when it is not the default pair. */
    owned?: { id: string }[]
  } = {},
) {
  const createSection = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
    id: SECTION,
    storeId: STORE,
    width: 'CONTAINED',
    background: null,
    position: 0,
    isActive: true,
    components: [componentRow()],
    createdAt: new Date('2026-09-23T00:00:00.000Z'),
    updatedAt: new Date('2026-09-23T00:00:00.000Z'),
    ...data,
    // Prisma answers with rows, never with the nested `create` it was handed.
    ...(data.components ? { components: [componentRow()] } : {}),
  }));

  const createComponent = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    componentRow(data),
  );

  const updateComponent = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    componentRow({ kind: found.kind ?? 'BANNER', ...data }),
  );

  const prisma = {
    storeSection: {
      create: createSection,
      aggregate: vi.fn().mockResolvedValue({ _max: { position: 2 } }),
      // The same mock answers the ownership check, which reads ids, and the read-back, which maps
      // whole rows. Shaped for both so a reorder test does not have to know which one it hit.
      findMany: vi
        .fn()
        .mockResolvedValue((found.owned ?? [{ id: SECTION }, { id: 'section-2' }]).map(sectionRow)),
      findUnique: vi
        .fn()
        .mockResolvedValue({ storeId: found.sectionOfAnotherShop ? 'another-shop' : STORE }),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: SECTION,
        storeId: STORE,
        width: 'CONTAINED',
        background: null,
        position: 0,
        isActive: true,
        components: [],
        createdAt: new Date('2026-09-23T00:00:00.000Z'),
        updatedAt: new Date('2026-09-23T00:00:00.000Z'),
        ...data,
      })),
      delete: vi.fn().mockResolvedValue({}),
    },
    storeComponent: {
      create: createComponent,
      update: updateComponent,
      delete: vi.fn().mockResolvedValue({}),
      aggregate: vi.fn().mockResolvedValue({ _max: { position: 0 } }),
      findMany: vi.fn().mockResolvedValue(found.owned ?? [{ id: COMPONENT }]),
      findFirst: vi.fn().mockResolvedValue(found.existing ?? null),
      findUnique: vi.fn().mockResolvedValue({ storeId: STORE, kind: found.kind ?? 'BANNER' }),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  } as unknown as PrismaService;

  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;

  return {
    service: new PageService(prisma, stores, new PageRules(prisma)),
    prisma,
    createSection,
    createComponent,
    updateComponent,
  };
}

describe('PageService — a band is created around something', () => {
  it('writes the band and its first component together', async () => {
    const { service, createSection } = build();

    await service.createSection('lessari', 'user-1', {
      width: 'FULL',
      component: { kind: 'BANNER', items: [SLIDE] },
    });

    const { data } = createSection.mock.calls[0]![0];
    expect(data).toMatchObject({ storeId: STORE, width: 'FULL' });
    expect(data.components.create).toMatchObject({ kind: 'BANNER', position: 0 });
  });

  it('lands the band last, so it does not rearrange a page already arranged', async () => {
    const { service, createSection } = build();

    await service.createSection('lessari', 'user-1', { component: { kind: 'HEADING', title: 'Novidades' } });

    expect(createSection.mock.calls[0]![0].data.position).toBe(3);
  });

  /**
   * The change this model bought, asserted rather than described. A banner was a singleton while
   * `HERO` existed, because "the one at the top" could only be one. A cover is the first band now.
   */
  it('lets a shop have a second banner', async () => {
    const { service } = build({ existing: { id: 'somewhere-else' } });

    await expect(
      service.createSection('lessari', 'user-1', { component: { kind: 'BANNER', items: [SLIDE] } }),
    ).resolves.toBeDefined();
  });

  it('refuses a second run of products, wherever the first one sits', async () => {
    const { service } = build({ existing: { id: 'somewhere-else' } });

    await expect(
      service.createSection('lessari', 'user-1', { component: { kind: 'PRODUCTS' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_KIND_SINGLETON' } });
  });

  it('refuses to add a component to another shop’s band', async () => {
    const { service } = build({ sectionOfAnotherShop: true });

    await expect(
      service.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Oi' }),
    ).rejects.toMatchObject({ response: { errorCode: 'SECTION_NOT_FOUND' } });
  });
});

describe('PageService — a band’s own attributes', () => {
  it('clears the colour when the patch says null', async () => {
    const { service, prisma } = build();

    await service.updateSection('lessari', 'user-1', SECTION, { background: null });

    expect(prisma.storeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ background: null }) }),
    );
  });

  // Null and absent are different requests, and `?? null` would make them the same one: a patch
  // that only hides a band would silently strip the colour off it.
  it('leaves the colour alone when the patch does not mention it', async () => {
    const { service, prisma } = build();

    await service.updateSection('lessari', 'user-1', SECTION, { isActive: false });

    const [{ data }] = (prisma.storeSection.update as unknown as { mock: { calls: [{ data: object }][] } }).mock
      .calls.at(-1)!;
    expect(data).toEqual({ isActive: false });
  });
});

describe('PageService — a component’s kind is what it is', () => {
  it('refuses a patch that changes it', async () => {
    const { service } = build({ kind: 'PRODUCTS' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, { kind: 'BANNER' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_KIND_IMMUTABLE' } });
  });

  it('lets a patch repeat the kind it already has', async () => {
    // The panel sends the whole form on every save, so the unchanged kind rides along every time.
    const { service } = build({ kind: 'PRODUCTS' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, { kind: 'PRODUCTS' }),
    ).resolves.toBeDefined();
  });
});

describe('PageService — what a component may hold', () => {
  it('refuses a slide with no picture', async () => {
    const { service } = build({ kind: 'BANNER' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, { items: [{ id: 'x', target: 'NONE' }] as never }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_ITEMS_INVALID' } });
  });

  // `@IsArray()` proves only that it is a list. What is inside depends on the kind, and the union
  // was a validator nobody ran until this call site existed.
  it('refuses a slide that names a destination it does not carry', async () => {
    const { service } = build({ kind: 'BANNER' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, {
        items: [{ id: 'x', imageUrl: 'https://img/x.jpg', target: 'CATEGORY' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('takes a slide that carries what it names', async () => {
    const { service } = build({ kind: 'BANNER' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, {
        items: [
          { id: 'x', imageUrl: 'https://img/x.jpg', target: 'EXTERNAL', externalUrl: 'https://wa.me/55' },
        ] as never,
      }),
    ).resolves.toBeDefined();
  });

  it('refuses items on a kind that holds none', async () => {
    const { service } = build({ kind: 'HEADING' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, {
        items: [{ id: 'x', imageUrl: 'https://img/x.jpg', target: 'NONE' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('takes the promises band’s rows', async () => {
    const { service, updateComponent } = build({ kind: 'BENEFITS' });

    await service.updateComponent('lessari', 'user-1', COMPONENT, {
      items: [{ id: 'pix', icon: 'qr-code', title: 'PIX', detail: 'Na hora' }] as never,
    });

    expect(updateComponent.mock.calls[0]![0].data.items).toEqual([
      expect.objectContaining({ id: 'pix', title: 'PIX' }),
    ]);
  });
});

describe('PageService — a patch that says nothing changes nothing', () => {
  // Reported as "says it saved and did not": the update computed the checked items and then never
  // put them in the data it wrote, so the API answered 200 with the row untouched.
  it('writes the items a patch carries', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    await service.updateComponent('lessari', 'user-1', COMPONENT, {
      items: [{ id: 'x', imageUrl: 'https://img/x.jpg', title: 'Novo', target: 'NONE' }] as never,
    });

    expect(updateComponent.mock.calls[0]![0].data.items).toEqual([
      expect.objectContaining({ id: 'x', title: 'Novo' }),
    ]);
  });

  it('leaves the items alone when a patch does not mention them', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    await service.updateComponent('lessari', 'user-1', COMPONENT, { isActive: false });

    expect(updateComponent.mock.calls[0]![0].data).not.toHaveProperty('items');
  });
});

describe('PageService — an order is the whole list or nothing', () => {
  it('refuses a list that is missing a band', async () => {
    const { service } = build({ owned: [{ id: SECTION }, { id: 'section-2' }] });

    await expect(service.reorderSections('lessari', 'user-1', { ids: [SECTION] })).rejects.toMatchObject({
      response: { errorCode: 'REORDER_MISMATCH' },
    });
  });

  it('refuses a list that names one twice', async () => {
    const { service } = build({ owned: [{ id: SECTION }, { id: 'section-2' }] });

    await expect(
      service.reorderSections('lessari', 'user-1', { ids: [SECTION, SECTION] }),
    ).rejects.toMatchObject({ response: { errorCode: 'REORDER_MISMATCH' } });
  });

  it('writes a position per band when the list is whole', async () => {
    const { service, prisma } = build({ owned: [{ id: SECTION }, { id: 'section-2' }] });

    await service.reorderSections('lessari', 'user-1', { ids: ['section-2', SECTION] });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.storeSection.update).toHaveBeenNthCalledWith(1, { where: { id: 'section-2' }, data: { position: 0 } });
    expect(prisma.storeSection.update).toHaveBeenNthCalledWith(2, { where: { id: SECTION }, data: { position: 1 } });
  });

  it('reorders inside one band without touching the page’s order', async () => {
    const { service, prisma } = build({ owned: [{ id: COMPONENT }, { id: 'component-2' }] });

    await service.reorderComponents('lessari', 'user-1', SECTION, { ids: ['component-2', COMPONENT] });

    expect(prisma.storeComponent.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'component-2' },
      data: { position: 0 },
    });
  });
});
