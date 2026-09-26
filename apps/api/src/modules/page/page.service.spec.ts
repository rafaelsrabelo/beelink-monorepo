// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { PageComponentMovesService } from './page-component-moves.service.js';
import { PageComponentsService } from './page-components.service.js';
import { PageRules } from './page.rules.js';
import { PageService } from './page.service.js';
import { ShowcaseRules } from './showcase.rules.js';
import { FeaturedRules } from './featured.rules.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const SECTION = '0199b000-0000-7000-8000-000000000001';
const COMPONENT = '0199c000-0000-7000-8000-000000000001';
const HOME = '0199f000-0000-7000-8000-000000000001';
const LANDING = '0199f000-0000-7000-8000-000000000002';

const SLIDE = {
  id: 'slide-1',
  imageUrl: 'https://cdn.example/banner.png',
  target: 'NONE' as const,
};

function sectionRow(over: Record<string, unknown> = {}) {
  return {
    id: SECTION,
    storeId: STORE,
    pageId: HOME,
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
    span: 'FULL',
    display: null,
    source: null,
    sourceCategoryId: null,
    limit: null,
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
    /** How many product lists the band being deleted holds, the shop has elsewhere, and in all. */
    requiredInSection?: number
    requiredElsewhere?: number
    requiredInShop?: number
    /** How many of the categories a showcase names are this shop's. */
    ownCategories?: number
    /** Whether the products a pick names belong to another shop, and which of them no longer exist. */
    foreignProducts?: boolean
    goneProducts?: string[]
    /** What a showcase being patched already holds. */
    storedShowcase?: { source: string | null; sourceCategoryId: string | null; limit: number | null; items: object[] }
    /** The components each band holds, by band id, when a move reads two bands. */
    bands?: Record<string, { id: string; position: number; kind: string }[]>
    /** Which page the bands are on: the home unless said, and a band named here is on that page instead. */
    pageKind?: 'HOME' | 'LANDING'
    pageOfBand?: Record<string, string>
    /** Whether the page a collection route names is this shop's. */
    pageMissing?: boolean
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
      findUnique: vi.fn().mockImplementation(({ where }: { where: { id: string } }) =>
        Promise.resolve({
          storeId: found.sectionOfAnotherShop ? 'another-shop' : STORE,
          pageId: found.pageOfBand?.[where.id] ?? HOME,
          page: { kind: found.pageKind ?? 'HOME' },
        }),
      ),
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
      findMany: vi
        .fn()
        .mockImplementation(({ where }: { where: { sectionId?: string; id?: { not: string } } }) =>
          Promise.resolve(
            found.bands && where.sectionId !== undefined
              ? (found.bands[where.sectionId] ?? []).filter((row) => row.id !== where.id?.not)
              : (found.owned ?? [{ id: COMPONENT }]),
          ),
        ),
      findFirst: vi.fn().mockResolvedValue(found.existing ?? null),
      // One fake, three questions: inside this band, in the shop's other bands, in the whole shop.
      count: vi.fn().mockImplementation(({ where }: { where: { sectionId?: unknown } }) =>
        Promise.resolve(
          typeof where.sectionId === 'string'
            ? (found.requiredInSection ?? 0)
            : where.sectionId && typeof where.sectionId === 'object'
              ? (found.requiredElsewhere ?? 0)
              : (found.requiredInShop ?? 1),
        ),
      ),
      findUnique: vi.fn().mockResolvedValue({
        storeId: STORE,
        kind: found.kind ?? 'BANNER',
        sectionId: SECTION,
        section: { pageId: found.pageOfBand?.[SECTION] ?? HOME, page: { kind: found.pageKind ?? 'HOME' } },
      }),
      findUniqueOrThrow: vi
        .fn()
        .mockResolvedValue(found.storedShowcase ?? { source: 'ALL', sourceCategoryId: null, limit: null, items: [] }),
    },
    storePage: {
      findFirst: vi
        .fn()
        .mockImplementation(({ where }: { where: { id?: string } }) =>
          Promise.resolve(found.pageMissing ? null : { id: where.id ?? HOME, kind: found.pageKind ?? 'HOME' }),
        ),
    },
    productCategory: { count: vi.fn().mockResolvedValue(found.ownCategories ?? 1) },
    product: {
      findMany: vi.fn().mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
        Promise.resolve(
          where.id.in
            .filter((id) => !(found.goneProducts ?? []).includes(id))
            .map((id) => ({ id, storeId: found.foreignProducts ? 'another-shop' : STORE })),
        ),
      ),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    // The draft's revision, bumped by every write: one row, as the page exists.
    $executeRaw: vi.fn().mockResolvedValue(1),
    $transaction: vi.fn(),
  } as unknown as PrismaService;

  // Both shapes the service uses: a list of writes (the reorders), and a callback run on the client
  // itself (the deletes, which lock the shop first).
  vi.mocked(prisma.$transaction).mockImplementation(((work: unknown) =>
    typeof work === 'function' ? (work as (tx: PrismaService) => unknown)(prisma) : Promise.resolve([])) as never);

  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;

  return {
    service: new PageService(prisma, stores, new PageRules(prisma), new ShowcaseRules(prisma), new FeaturedRules(prisma)),
    components: new PageComponentsService(prisma, stores, new PageRules(prisma), new ShowcaseRules(prisma), new FeaturedRules(prisma)),
    moves: new PageComponentMovesService(prisma, stores, new PageRules(prisma)),
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

    // Two bands already: the new one is the third, whatever numbers theirs carry.
    expect(createSection.mock.calls[0]![0].data.position).toBe(2);
  });

  it('lands the band where the panel\'s "+" was pressed, and moves the ones after it down', async () => {
    const { service, prisma, createSection } = build({ owned: [{ id: 'a', position: 0 } as never, { id: 'b', position: 3 } as never] });

    await service.createSection('lessari', 'user-1', { position: 1, component: { kind: 'HEADING', title: 'Novidades' } });

    expect(createSection.mock.calls[0]![0].data.position).toBe(1);
    expect(prisma.storeSection.update).toHaveBeenCalledWith({ where: { id: 'b' }, data: { position: 2 } });
    expect(prisma.storeSection.update).toHaveBeenCalledTimes(1);
    // Under the shop's lock, taken before the list is read.
    expect(vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(prisma.storeSection.findMany).mock.invocationCallOrder[0]!,
    );
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

  /**
   * A form cannot be empty — it needs a field that reaches back — and the menu sends a kind and
   * nothing else. The seed's fields are what the create fills in; an explicit list still wins.
   */
  it('opens a bare contact form with the fields it cannot be without', async () => {
    const { service, createSection } = build();

    await service.createSection('asfalto-norte', 'user-1', { component: { kind: 'CONTACT' } });

    const items = createSection.mock.calls[0]![0].data.components.create.items as { id: string; type: string }[];
    expect(items.map((field) => field.type)).toEqual(['EMAIL', 'PHONE', 'TEXTAREA']);
  });

  it('refuses a contact form with no field that reaches back', async () => {
    const { service } = build();

    await expect(
      service.createSection('asfalto-norte', 'user-1', {
        component: { kind: 'CONTACT', items: [{ id: 'msg', label: 'Mensagem', type: 'TEXTAREA', required: true }] },
      }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_ITEMS_INVALID' } });
  });

  /**
   * The rule this ticket retired: two showcases were the same shelves twice while every showcase drew
   * every product. Each has a source of its own now, so a second one is a second shelf.
   */
  it('lets a shop have a second showcase', async () => {
    const { service } = build({ existing: { id: 'somewhere-else' } });

    await expect(
      service.createSection('lessari', 'user-1', { component: { kind: 'PRODUCTS' } }),
    ).resolves.toBeDefined();
  });

  it('still refuses a second strip above the header', async () => {
    const { service } = build({ existing: { id: 'somewhere-else' } });

    await expect(
      service.createSection('lessari', 'user-1', { component: { kind: 'ANNOUNCEMENT' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_KIND_SINGLETON' } });
  });

  it('refuses to add a component to another shop’s band', async () => {
    const { components } = build({ sectionOfAnotherShop: true });

    await expect(
      components.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Oi' }),
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
    const { components } = build({ kind: 'PRODUCTS' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, { kind: 'BANNER' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_KIND_IMMUTABLE' } });
  });

  it('lets a patch repeat the kind it already has', async () => {
    // The panel sends the whole form on every save, so the unchanged kind rides along every time.
    const { components } = build({ kind: 'PRODUCTS' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, { kind: 'PRODUCTS' }),
    ).resolves.toBeDefined();
  });
});

describe('PageService — what a component may hold', () => {
  it('refuses a slide with no picture', async () => {
    const { components } = build({ kind: 'BANNER' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, { items: [{ id: 'x', target: 'NONE' }] as never }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_ITEMS_INVALID' } });
  });

  // `@IsArray()` proves only that it is a list. What is inside depends on the kind, and the union
  // was a validator nobody ran until this call site existed.
  it('refuses a slide that names a destination it does not carry', async () => {
    const { components } = build({ kind: 'BANNER' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, {
        items: [{ id: 'x', imageUrl: 'https://img/x.jpg', target: 'CATEGORY' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('takes a slide that carries what it names', async () => {
    const { components } = build({ kind: 'BANNER' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, {
        items: [
          { id: 'x', imageUrl: 'https://img/x.jpg', target: 'EXTERNAL', externalUrl: 'https://wa.me/55' },
        ] as never,
      }),
    ).resolves.toBeDefined();
  });

  it('refuses items on a kind that holds none', async () => {
    const { components } = build({ kind: 'HEADING' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, {
        items: [{ id: 'x', imageUrl: 'https://img/x.jpg', target: 'NONE' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('takes the promises band’s rows', async () => {
    const { components, updateComponent } = build({ kind: 'BENEFITS' });

    await components.updateComponent('lessari', 'user-1', COMPONENT, {
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
    const { components, updateComponent } = build({ kind: 'BANNER' });

    await components.updateComponent('lessari', 'user-1', COMPONENT, {
      items: [{ id: 'x', imageUrl: 'https://img/x.jpg', title: 'Novo', target: 'NONE' }] as never,
    });

    expect(updateComponent.mock.calls[0]![0].data.items).toEqual([
      expect.objectContaining({ id: 'x', title: 'Novo' }),
    ]);
  });

  it('leaves the items alone when a patch does not mention them', async () => {
    const { components, updateComponent } = build({ kind: 'BANNER' });

    await components.updateComponent('lessari', 'user-1', COMPONENT, { isActive: false });

    expect(updateComponent.mock.calls[0]![0].data).not.toHaveProperty('items');
  });
});

/** A block's slice of its band, as both writes store it. */
describe('PageService — a block’s span', () => {
  it('stores the span a new component is sent, two thirds included', async () => {
    const { service, createSection } = build();

    await service.createSection('lessari', 'user-1', {
      component: { kind: 'BANNER', span: 'TWO_THIRDS', items: [SLIDE] },
    });

    expect(createSection.mock.calls[0]![0].data.components.create.span).toBe('TWO_THIRDS');
  });

  it('stores the span a patch is sent, and answers it back', async () => {
    const { components, updateComponent } = build({ kind: 'BANNER' });

    const updated = await components.updateComponent('lessari', 'user-1', COMPONENT, { span: 'HALF' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ span: 'HALF' });
    expect(updated.span).toBe('HALF');
  });

  it('leaves the span alone when a patch does not mention it', async () => {
    const { components, updateComponent } = build({ kind: 'BANNER' });

    await components.updateComponent('lessari', 'user-1', COMPONENT, { isActive: false });

    expect(updateComponent.mock.calls[0]![0].data).not.toHaveProperty('span');
  });
});

/**
 * Every banner the migration found became a carousel, because that is what a second slide has
 * always made of one. A banner created afterwards has to open the same way, or the same page holds
 * two kinds of banner that behave differently the day `display` is drawn.
 */
describe('PageService — a new banner opens as a carousel', () => {
  it('writes CAROUSEL on a banner, whichever create makes it', async () => {
    const { service, createSection, createComponent, components } = build();

    await service.createSection('lessari', 'user-1', { component: { kind: 'BANNER', items: [SLIDE] } });
    await components.createComponent('lessari', 'user-1', SECTION, { kind: 'BANNER', items: [SLIDE] });

    expect(createSection.mock.calls[0]![0].data.components.create.display).toBe('CAROUSEL');
    expect(createComponent.mock.calls[0]![0].data.display).toBe('CAROUSEL');
  });

  it('writes no display on a kind that does not read it', async () => {
    const { components, createComponent } = build();

    await components.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Novidades' });

    expect(createComponent.mock.calls[0]![0].data.display).toBeNull();
  });

  it('writes the display a banner is created with', async () => {
    const { components, createComponent } = build();

    await components.createComponent('lessari', 'user-1', SECTION, { kind: 'BANNER', display: 'GRID', items: [SLIDE] });

    expect(createComponent.mock.calls[0]![0].data.display).toBe('GRID');
  });
});

describe('PageService — a display only where it is drawn', () => {
  it('writes the display a banner is patched to', async () => {
    const { components, updateComponent } = build({ kind: 'BANNER' });

    const updated = await components.updateComponent('lessari', 'user-1', COMPONENT, { display: 'GRID' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ display: 'GRID' });
    expect(updated.display).toBe('GRID');
  });

  it('refuses a display on a kind that does not draw it, at all three writes', async () => {
    const asPatch = build({ kind: 'HEADING' });
    await expect(
      asPatch.components.updateComponent('lessari', 'user-1', COMPONENT, { display: 'GRID' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
    expect(asPatch.updateComponent).not.toHaveBeenCalled();

    const asSection = build();
    await expect(
      asSection.service.createSection('lessari', 'user-1', { component: { kind: 'TEXT', display: 'CAROUSEL' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
    expect(asSection.createSection).not.toHaveBeenCalled();

    const asComponent = build();
    await expect(
      asComponent.components.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Oi', display: 'GRID' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
    expect(asComponent.createComponent).not.toHaveBeenCalled();
  });

  it('refuses to take a banner’s display back to null', async () => {
    const { components } = build({ kind: 'BANNER' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, { display: null }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
  });

  // The panel sends the whole form, and null is what a heading holds there already.
  it('lets a kind that does not draw it repeat the null it has', async () => {
    const { components } = build({ kind: 'HEADING' });

    await expect(
      components.updateComponent('lessari', 'user-1', COMPONENT, { display: null }),
    ).resolves.toBeDefined();
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
    const { moves, prisma } = build({ owned: [{ id: COMPONENT }, { id: 'component-2' }] });

    await moves.reorderComponents('lessari', 'user-1', SECTION, { ids: ['component-2', COMPONENT] });

    expect(prisma.storeComponent.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'component-2' },
      data: { position: 0 },
    });
  });
});

const OTHER_SECTION = '0199b000-0000-7000-8000-000000000002';

describe('PageService — a block moves into another band', () => {
  /** Two stacked bands: the block moving and a paragraph in one, two banners in the other. */
  const bands = {
    [SECTION]: [
      { id: COMPONENT, position: 0, kind: 'BANNER' },
      { id: 'left-behind', position: 1, kind: 'TEXT' },
    ],
    [OTHER_SECTION]: [
      { id: 'first', position: 0, kind: 'BANNER' },
      { id: 'second', position: 1, kind: 'BANNER' },
    ],
  };

  function writes(prisma: PrismaService) {
    return vi.mocked(prisma.storeComponent.update).mock.calls.map(([args]) => args);
  }

  it('lands where it is told in the band it joins, and closes up the band it left', async () => {
    const { moves, prisma } = build({ bands });

    await moves.moveComponent('lessari', 'user-1', COMPONENT, { sectionId: OTHER_SECTION, position: 1 });

    expect(writes(prisma)).toEqual([
      { where: { id: 'second' }, data: { position: 2 } },
      { where: { id: COMPONENT }, data: { sectionId: OTHER_SECTION, position: 1 } },
      { where: { id: 'left-behind' }, data: { position: 0 } },
    ]);
    expect(prisma.storeSection.delete).not.toHaveBeenCalled();
    // Under the shop's lock, taken before either band is read.
    expect(vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(prisma.storeComponent.findMany).mock.invocationCallOrder[0]!,
    );
  });

  it('deletes the band it leaves empty, once it has left it', async () => {
    const { moves, prisma } = build({ bands: { ...bands, [SECTION]: [{ id: COMPONENT, position: 0, kind: 'BANNER' }] } });

    await moves.moveComponent('lessari', 'user-1', COMPONENT, { sectionId: OTHER_SECTION });

    expect(writes(prisma)).toEqual([{ where: { id: COMPONENT }, data: { sectionId: OTHER_SECTION, position: 2 } }]);
    expect(prisma.storeSection.delete).toHaveBeenCalledWith({ where: { id: SECTION } });
    // Deleting a band cascades to what it still holds: the block is out of it first.
    expect(vi.mocked(prisma.storeComponent.update).mock.invocationCallOrder[0]!).toBeLessThan(
      vi.mocked(prisma.storeSection.delete).mock.invocationCallOrder[0]!,
    );
  });

  it('reorders it inside its own band when that is the band it is sent to, and deletes nothing', async () => {
    const { moves, prisma } = build({ bands });

    await moves.moveComponent('lessari', 'user-1', COMPONENT, { sectionId: SECTION, position: 1 });

    expect(writes(prisma)).toEqual([
      { where: { id: 'left-behind' }, data: { position: 0 } },
      { where: { id: COMPONENT }, data: { sectionId: SECTION, position: 1 } },
    ]);
    expect(prisma.storeSection.delete).not.toHaveBeenCalled();
  });

  it('takes the span it is sent, so the row it joins has room for it in the same write', async () => {
    const { moves, prisma } = build({ bands });

    await moves.moveComponent('lessari', 'user-1', COMPONENT, { sectionId: OTHER_SECTION, span: 'THIRD' });

    expect(prisma.storeComponent.update).toHaveBeenCalledWith({
      where: { id: COMPONENT },
      data: { sectionId: OTHER_SECTION, position: 2, span: 'THIRD' },
    });
  });

  it('refuses to move the strip above the header, and to move anything into its band', async () => {
    const strip = build({ kind: 'ANNOUNCEMENT', bands });
    const intoStrip = build({ bands: { ...bands, [OTHER_SECTION]: [{ id: 'strip', position: 0, kind: 'ANNOUNCEMENT' }] } });

    for (const { moves, prisma } of [strip, intoStrip]) {
      const refusal: unknown = await moves
        .moveComponent('lessari', 'user-1', COMPONENT, { sectionId: OTHER_SECTION })
        .catch((error: unknown) => error);

      expect(refusal).toBeInstanceOf(ConflictException);
      expect(refusal).toMatchObject({ response: { errorCode: 'COMPONENT_NOT_MOVABLE' } });
      expect(prisma.storeComponent.update).not.toHaveBeenCalled();
      expect(prisma.storeSection.delete).not.toHaveBeenCalled();
    }
  });

  it('answers another shop’s band as one this shop does not have, and moves nothing', async () => {
    const { moves, prisma } = build({ bands, sectionOfAnotherShop: true });

    await expect(
      moves.moveComponent('lessari', 'user-1', COMPONENT, { sectionId: OTHER_SECTION }),
    ).rejects.toMatchObject({ response: { errorCode: 'SECTION_NOT_FOUND' } });
    expect(prisma.storeComponent.update).not.toHaveBeenCalled();
  });
});

describe('PageService — a band is on one page', () => {
  it('writes a band on the home when no page is named, and on the page named otherwise', async () => {
    const home = build();
    await home.service.createSection('lessari', 'user-1', { component: { kind: 'HEADING', title: 'Oi' } });
    expect(home.createSection.mock.calls[0]![0].data).toMatchObject({ pageId: HOME });
    expect(home.prisma.storeSection.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { pageId: HOME } }));

    const landing = build({ pageKind: 'LANDING' });
    await landing.service.createSection('lessari', 'user-1', { component: { kind: 'HEADING', title: 'Oi' } }, LANDING);
    expect(landing.createSection.mock.calls[0]![0].data).toMatchObject({ pageId: LANDING });
  });

  it('answers a page that is not this shop’s, or not a page id at all, as one that is not there', async () => {
    const { service, createSection } = build({ pageMissing: true });

    for (const pageId of [LANDING, 'not-a-uuid']) {
      await expect(
        service.createSection('lessari', 'user-1', { component: { kind: 'HEADING', title: 'Oi' } }, pageId),
      ).rejects.toMatchObject({ response: { errorCode: 'PAGE_NOT_FOUND' } });
    }
    expect(createSection).not.toHaveBeenCalled();
  });

  it('keeps the strip on the home: a landing draws the home’s', async () => {
    const { service, components, createSection, createComponent } = build({ pageKind: 'LANDING' });

    await expect(
      service.createSection('lessari', 'user-1', { component: { kind: 'ANNOUNCEMENT', title: 'Frete grátis' } }, LANDING),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_KIND_HOME_ONLY' } });
    await expect(
      components.createComponent('lessari', 'user-1', SECTION, { kind: 'ANNOUNCEMENT', title: 'Frete grátis' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_KIND_HOME_ONLY' } });
    expect(createSection).not.toHaveBeenCalled();
    expect(createComponent).not.toHaveBeenCalled();
  });

  it('refuses a move into a band on another page, and moves nothing', async () => {
    const { moves, prisma } = build({
      bands: { [SECTION]: [{ id: COMPONENT, position: 0, kind: 'BANNER' }], [OTHER_SECTION]: [] },
      pageOfBand: { [OTHER_SECTION]: LANDING },
    });

    await expect(
      moves.moveComponent('lessari', 'user-1', COMPONENT, { sectionId: OTHER_SECTION }),
    ).rejects.toMatchObject({ response: { errorCode: 'SECTION_NOT_FOUND' } });
    expect(prisma.storeComponent.update).not.toHaveBeenCalled();
  });

  /** The home's shelves are what `/<shop>` cannot be without; a landing's are the shopkeeper's to take off. */
  it('lets a landing’s only product list go, at both levels', async () => {
    const asComponent = build({ kind: 'PRODUCTS', pageKind: 'LANDING', requiredInShop: 0 });
    await expect(asComponent.components.removeComponent('lessari', 'user-1', COMPONENT)).resolves.toBeUndefined();
    expect(asComponent.prisma.storeComponent.delete).toHaveBeenCalled();

    const asBand = build({ pageKind: 'LANDING', requiredInSection: 1, requiredElsewhere: 0 });
    await expect(asBand.service.removeSection('lessari', 'user-1', SECTION)).resolves.toBeUndefined();
    expect(asBand.prisma.storeSection.delete).toHaveBeenCalled();
  });
});

describe('PageService — the product list cannot be deleted, at either level', () => {
  /**
   * The door a shop lost its shelves through: the component's row drew no bin, and the band's bin
   * did not ask what was inside. The refusal names the reason and what to do instead.
   */
  it('refuses to delete the band that holds the only one, and deletes nothing', async () => {
    const { service, prisma } = build({ requiredInSection: 1, requiredElsewhere: 0 });

    await expect(service.removeSection('lessari', 'user-1', SECTION)).rejects.toMatchObject({
      response: { errorCode: 'COMPONENT_REQUIRED' },
    });
    expect(prisma.storeSection.delete).not.toHaveBeenCalled();
  });

  it('refuses to delete the component itself when it is the only one', async () => {
    const { components, prisma } = build({ kind: 'PRODUCTS', requiredInShop: 1 });

    await expect(components.removeComponent('lessari', 'user-1', COMPONENT)).rejects.toMatchObject({
      response: { errorCode: 'COMPONENT_REQUIRED' },
    });
    expect(prisma.storeComponent.delete).not.toHaveBeenCalled();
  });

  /**
   * A duplicate — the one a double-click can slip past `refuseSecond` — stays deletable, at both
   * levels. Refusing every product list would leave that shop with two shelves and no way back.
   */
  it('lets a duplicate go, at both levels, as long as one remains', async () => {
    const asComponent = build({ kind: 'PRODUCTS', requiredInShop: 2 });
    await expect(asComponent.components.removeComponent('lessari', 'user-1', COMPONENT)).resolves.toBeUndefined();
    expect(asComponent.prisma.storeComponent.delete).toHaveBeenCalled();

    const asBand = build({ requiredInSection: 1, requiredElsewhere: 1 });
    await expect(asBand.service.removeSection('lessari', 'user-1', SECTION)).resolves.toBeUndefined();
    expect(asBand.prisma.storeSection.delete).toHaveBeenCalled();
  });

  it('deletes a band that holds only what may go', async () => {
    const { service, prisma } = build();

    await service.removeSection('lessari', 'user-1', SECTION);

    expect(prisma.storeSection.delete).toHaveBeenCalledWith({ where: { id: SECTION } });
  });
});

const OWN_CATEGORY = '0199d000-0000-7000-8000-000000000001';
const OWN_PRODUCT = '0199e000-0000-7000-8000-000000000001';

describe('PageService — a showcase has a source', () => {
  it('opens as every product, on a rail, holding nothing', async () => {
    const { components, createComponent } = build();

    await components.createComponent('lessari', 'user-1', SECTION, { kind: 'PRODUCTS' });

    expect(createComponent.mock.calls[0]![0].data).toMatchObject({
      source: 'ALL',
      display: 'RAIL',
      sourceCategoryId: null,
      limit: null,
      items: [],
    });
  });

  it('draws one category, when the category is this shop’s', async () => {
    const { components, createComponent } = build();

    await components.createComponent('lessari', 'user-1', SECTION, {
      kind: 'PRODUCTS',
      source: 'CATEGORY',
      sourceCategoryId: OWN_CATEGORY,
      limit: 8,
    });

    expect(createComponent.mock.calls[0]![0].data).toMatchObject({ source: 'CATEGORY', sourceCategoryId: OWN_CATEGORY, limit: 8 });
  });

  it('refuses a category showcase with no category, or with another shop’s', async () => {
    const bare = build();
    await expect(
      bare.components.createComponent('lessari', 'user-1', SECTION, { kind: 'PRODUCTS', source: 'CATEGORY' }),
    ).rejects.toMatchObject({ response: { errorCode: 'SHOWCASE_CATEGORY_INVALID' } });

    const foreign = build({ ownCategories: 0 });
    await expect(
      foreign.components.createComponent('lessari', 'user-1', SECTION, {
        kind: 'PRODUCTS',
        source: 'CATEGORY',
        sourceCategoryId: OWN_CATEGORY,
      }),
    ).rejects.toMatchObject({ response: { errorCode: 'SHOWCASE_CATEGORY_INVALID' } });
    expect(foreign.createComponent).not.toHaveBeenCalled();
  });

  it('draws a hand-picked list, when every product is this shop’s', async () => {
    const { components, createComponent } = build();
    const items = [{ id: 'a', productId: OWN_PRODUCT }];

    await components.createComponent('lessari', 'user-1', SECTION, { kind: 'PRODUCTS', source: 'SELECTION', items });

    expect(createComponent.mock.calls[0]![0].data).toMatchObject({ source: 'SELECTION', items });
  });

  it('refuses a hand-picked list that is empty, or that names another shop’s product', async () => {
    const empty = build();
    await expect(
      empty.components.createComponent('lessari', 'user-1', SECTION, { kind: 'PRODUCTS', source: 'SELECTION' }),
    ).rejects.toMatchObject({ response: { errorCode: 'SHOWCASE_PRODUCTS_INVALID' } });

    const foreign = build({ foreignProducts: true });
    await expect(
      foreign.components.createComponent('lessari', 'user-1', SECTION, {
        kind: 'PRODUCTS',
        source: 'SELECTION',
        items: [{ id: 'a', productId: OWN_PRODUCT }],
      }),
    ).rejects.toMatchObject({ response: { errorCode: 'SHOWCASE_PRODUCTS_INVALID' } });
  });

  /**
   * The panel serves a pick as it was stored, a product deleted since included, and sends it back.
   * Gone is not foreign: the pick keeps what still exists, and the save goes through.
   */
  it('drops a picked product that no longer exists, rather than refusing the pick', async () => {
    const gone = '0199e000-0000-7000-8000-00000000dead';
    const { components, updateComponent } = build({ kind: 'PRODUCTS', goneProducts: [gone] });

    await components.updateComponent('lessari', 'user-1', COMPONENT, {
      source: 'SELECTION',
      items: [{ id: 'a', productId: gone }, { id: 'b', productId: OWN_PRODUCT }] as never,
    });

    expect(updateComponent.mock.calls[0]![0].data.items).toEqual([{ id: 'b', productId: OWN_PRODUCT }]);
  });

  // Switching the source clears what the old one used, so no column holds a value nothing reads.
  it('clears the category when the source stops being one', async () => {
    const { components, updateComponent } = build({
      kind: 'PRODUCTS',
      storedShowcase: { source: 'CATEGORY', sourceCategoryId: OWN_CATEGORY, limit: 8, items: [] },
    });

    await components.updateComponent('lessari', 'user-1', COMPONENT, { source: 'NEWEST' });

    expect(updateComponent.mock.calls[0]![0].data).toMatchObject({ source: 'NEWEST', sourceCategoryId: null, limit: 8, items: [] });
  });

  /**
   * A product deleted after it was picked is not the shopkeeper's mistake: a rename that re-checked
   * the stored list would fail on it. Only what a patch sends is checked.
   */
  it('writes none of a showcase’s fields on a patch that touches none of them', async () => {
    const { components, updateComponent } = build({ kind: 'PRODUCTS' });

    await components.updateComponent('lessari', 'user-1', COMPONENT, { title: 'Novidades' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ title: 'Novidades' });
  });

  it('refuses a showcase’s fields on a kind that is not one', async () => {
    const { components } = build();

    await expect(
      components.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Oi', source: 'ALL' }),
    ).rejects.toMatchObject({ response: { errorCode: 'SHOWCASE_SOURCE_INVALID' } });
  });
});

describe('PageService — each kind draws its own layouts', () => {
  it('lets a showcase be a rail or a grid, and nothing else', async () => {
    const grid = build({ kind: 'PRODUCTS' });
    await expect(grid.components.updateComponent('lessari', 'user-1', COMPONENT, { display: 'GRID' })).resolves.toBeDefined();

    const carousel = build({ kind: 'PRODUCTS' });
    await expect(
      carousel.components.updateComponent('lessari', 'user-1', COMPONENT, { display: 'CAROUSEL' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
  });

  it('lets the categories be a rail or a grid, and never a carousel', async () => {
    for (const display of ['RAIL', 'GRID'] as const) {
      const { components } = build({ kind: 'CATEGORIES' });
      await expect(components.updateComponent('lessari', 'user-1', COMPONENT, { display })).resolves.toBeDefined();
    }

    const { components } = build({ kind: 'CATEGORIES' });
    await expect(components.updateComponent('lessari', 'user-1', COMPONENT, { display: 'CAROUSEL' })).rejects.toMatchObject({
      response: { errorCode: 'COMPONENT_DISPLAY_INVALID' },
    });
  });

  // The same content, another look: each kind takes its own, and nobody else's.
  it('takes the layouts each kind draws, and refuses the others', async () => {
    const own = [
      ['BANNER', 'BACKDROP'],
      ['BANNER', 'SPLIT'],
      ['CATEGORIES', 'CHIPS'],
      ['BENEFITS', 'INLINE'],
      ['BENEFITS', 'CARDS'],
      ['ANNOUNCEMENT', 'STATIC'],
      ['ANNOUNCEMENT', 'MARQUEE'],
    ] as const;
    for (const [kind, display] of own) {
      const { components } = build({ kind });
      await expect(components.updateComponent('lessari', 'user-1', COMPONENT, { display }), `${kind} ${display}`).resolves.toBeDefined();
    }

    for (const [kind, display] of [['BENEFITS', 'GRID'], ['ANNOUNCEMENT', 'SPLIT'], ['PRODUCTS', 'CHIPS'], ['HEADING', 'CARDS']] as const) {
      const { components } = build({ kind });
      await expect(components.updateComponent('lessari', 'user-1', COMPONENT, { display }), `${kind} ${display}`).rejects.toMatchObject({
        response: { errorCode: 'COMPONENT_DISPLAY_INVALID' },
      });
    }
  });

  it('never lets a banner be a rail', async () => {
    const { components } = build({ kind: 'BANNER' });

    await expect(components.updateComponent('lessari', 'user-1', COMPONENT, { display: 'RAIL' })).rejects.toMatchObject({
      response: { errorCode: 'COMPONENT_DISPLAY_INVALID' },
    });
  });
});
