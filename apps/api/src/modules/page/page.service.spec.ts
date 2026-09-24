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
    span: 'FULL',
    display: null,
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
    /** The width it is stored with. */
    span?: string
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
      findUnique: vi.fn().mockResolvedValue({ storeId: STORE, kind: found.kind ?? 'BANNER', span: found.span ?? 'FULL' }),
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

/**
 * The panel still sends `layout` and the row keeps `span`. A write that stored the old word, or
 * answered with a different one than it was sent, would move a banner the shopkeeper only saved.
 */
describe('PageService — the panel sends layout, the row keeps span', () => {
  it('stores the layout a new component carries as the span it means', async () => {
    const { service, createComponent } = build();

    const created = await service.createComponent('lessari', 'user-1', SECTION, {
      kind: 'BANNER',
      layout: 'THIRDS',
      items: [SLIDE],
    });

    const { data } = createComponent.mock.calls[0]![0];
    expect(data).toMatchObject({ span: 'THIRD' });
    expect(data).not.toHaveProperty('layout');
    expect(created.layout).toBe('THIRDS');
  });

  it('stores the layout a patch carries as the span it means', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    const updated = await service.updateComponent('lessari', 'user-1', COMPONENT, { layout: 'HALVES' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ span: 'HALF' });
    expect(updated.layout).toBe('HALVES');
  });

  it('stores a span it is sent, including the one the old words cannot say', async () => {
    const { service, createSection } = build();

    await service.createSection('lessari', 'user-1', {
      component: { kind: 'BANNER', span: 'TWO_THIRDS', items: [SLIDE] },
    });

    expect(createSection.mock.calls[0]![0].data.components.create.span).toBe('TWO_THIRDS');
  });

  it('lets span win when a patch sends both words', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    const updated = await service.updateComponent('lessari', 'user-1', COMPONENT, { span: 'THIRD', layout: 'HALVES' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ span: 'THIRD' });
    expect(updated).toMatchObject({ span: 'THIRD', layout: 'THIRDS' });
  });

  // `PartialType` makes a patch's span optional whatever the DTO says, so null gets past the
  // decorators; the column is NOT NULL, and the database would have answered a 500.
  it('refuses a null span, before anything is written', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, { span: null as never }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_SPAN_INVALID' } });
    expect(updateComponent).not.toHaveBeenCalled();
  });

  /**
   * The panel sends `layout` on every save, and `TWO_THIRDS` reads as `FULL` in those words. Taken
   * at face value, that echo would widen a two-thirds block because its owner hid it or renamed it.
   */
  it('leaves a two-thirds block alone when a patch only echoes the layout it reads as', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER', span: 'TWO_THIRDS' });

    await service.updateComponent('lessari', 'user-1', COMPONENT, { layout: 'FULL', isActive: false });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ isActive: false });
  });

  it('still moves a block when the layout sent is a different one', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER', span: 'TWO_THIRDS' });

    await service.updateComponent('lessari', 'user-1', COMPONENT, { layout: 'HALVES' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ span: 'HALF' });
  });

  it('leaves the span alone when a patch does not mention the layout', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    await service.updateComponent('lessari', 'user-1', COMPONENT, { isActive: false });

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
    const { service, createSection, createComponent } = build();

    await service.createSection('lessari', 'user-1', { component: { kind: 'BANNER', items: [SLIDE] } });
    await service.createComponent('lessari', 'user-1', SECTION, { kind: 'BANNER', items: [SLIDE] });

    expect(createSection.mock.calls[0]![0].data.components.create.display).toBe('CAROUSEL');
    expect(createComponent.mock.calls[0]![0].data.display).toBe('CAROUSEL');
  });

  it('writes no display on a kind that does not read it', async () => {
    const { service, createComponent } = build();

    await service.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Novidades' });

    expect(createComponent.mock.calls[0]![0].data.display).toBeNull();
  });

  it('writes the display a banner is created with', async () => {
    const { service, createComponent } = build();

    await service.createComponent('lessari', 'user-1', SECTION, { kind: 'BANNER', display: 'GRID', items: [SLIDE] });

    expect(createComponent.mock.calls[0]![0].data.display).toBe('GRID');
  });
});

describe('PageService — a display only where it is drawn', () => {
  it('writes the display a banner is patched to', async () => {
    const { service, updateComponent } = build({ kind: 'BANNER' });

    const updated = await service.updateComponent('lessari', 'user-1', COMPONENT, { display: 'GRID' });

    expect(updateComponent.mock.calls[0]![0].data).toEqual({ display: 'GRID' });
    expect(updated.display).toBe('GRID');
  });

  it('refuses a display on a kind that does not draw it, at all three writes', async () => {
    const asPatch = build({ kind: 'HEADING' });
    await expect(
      asPatch.service.updateComponent('lessari', 'user-1', COMPONENT, { display: 'GRID' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
    expect(asPatch.updateComponent).not.toHaveBeenCalled();

    const asSection = build();
    await expect(
      asSection.service.createSection('lessari', 'user-1', { component: { kind: 'TEXT', display: 'CAROUSEL' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
    expect(asSection.createSection).not.toHaveBeenCalled();

    const asComponent = build();
    await expect(
      asComponent.service.createComponent('lessari', 'user-1', SECTION, { kind: 'HEADING', title: 'Oi', display: 'GRID' }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
    expect(asComponent.createComponent).not.toHaveBeenCalled();
  });

  it('refuses to take a banner’s display back to null', async () => {
    const { service } = build({ kind: 'BANNER' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, { display: null }),
    ).rejects.toMatchObject({ response: { errorCode: 'COMPONENT_DISPLAY_INVALID' } });
  });

  // The panel sends the whole form, and null is what a heading holds there already.
  it('lets a kind that does not draw it repeat the null it has', async () => {
    const { service } = build({ kind: 'HEADING' });

    await expect(
      service.updateComponent('lessari', 'user-1', COMPONENT, { display: null }),
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
    const { service, prisma } = build({ owned: [{ id: COMPONENT }, { id: 'component-2' }] });

    await service.reorderComponents('lessari', 'user-1', SECTION, { ids: ['component-2', COMPONENT] });

    expect(prisma.storeComponent.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'component-2' },
      data: { position: 0 },
    });
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
    const { service, prisma } = build({ kind: 'PRODUCTS', requiredInShop: 1 });

    await expect(service.removeComponent('lessari', 'user-1', COMPONENT)).rejects.toMatchObject({
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
    await expect(asComponent.service.removeComponent('lessari', 'user-1', COMPONENT)).resolves.toBeUndefined();
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
