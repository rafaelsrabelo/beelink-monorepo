// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { SectionsService } from './sections.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';

const base = {
  title: 'Promoção',
  imageUrl: 'https://cdn.example/banner.png',
  layout: 'FULL' as const,
};


/**
 * Collaborators by hand, the way every other service spec here builds them. What is asserted is the
 * columns the service decided to write — the target is the whole of this module's judgement, and it
 * is the one thing the database's CHECK can only answer with a constraint name.
 */
function build(
  found: {
    category?: { id: string } | null
    product?: { id: string } | null
    /** What the row being patched already is. The service reads it to police a kind change. */
    kind?: string
  } = {},
) {
  const create = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
    ...data,
    id: 'section-1',
    subtitle: data.subtitle ?? null,
    category: null,
    product: null,
    createdAt: new Date('2026-09-22T00:00:00.000Z'),
    updatedAt: new Date('2026-09-22T00:00:00.000Z'),
  }));

  const prisma = {
    storeSection: {
      create,
      aggregate: vi.fn().mockResolvedValue({ _max: { position: 2 } }),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue({ storeId: STORE, kind: found.kind ?? 'BANNER' }),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => ({
        id: 'section-1',
        kind: found.kind ?? 'BANNER',
        items: [],
        title: 'Promoção',
        subtitle: null,
        imageUrl: base.imageUrl,
        layout: 'FULL',
        target: 'CATEGORY',
        externalUrl: null,
        position: 0,
        isActive: true,
        ...data,
        category: { slug: 'blusas' },
        product: null,
        createdAt: new Date('2026-09-22T00:00:00.000Z'),
        updatedAt: new Date('2026-09-22T00:00:00.000Z'),
      })),
    },
    productCategory: { findUnique: vi.fn().mockResolvedValue(found.category ?? null) },
    product: { findUnique: vi.fn().mockResolvedValue(found.product ?? null) },
  } as unknown as PrismaService;

  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;

  return { service: new SectionsService(prisma, stores), create, prisma };
}

describe('SectionsService — where a block lives', () => {
  it('moves a banner between the top of the page and its body', async () => {
    const { service, prisma } = build({ kind: 'BANNER' });

    await service.update('lessari', 'user-1', 'section-1', { kind: 'HERO' });

    expect(prisma.storeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ kind: 'HERO' }) }),
    );
  });

  // A products row patched into a banner would take the shop's shelves off its own landing page,
  // leave no row to put them back, and the owner would find out by looking.
  it('refuses to turn the product rails into a banner', async () => {
    const { service } = build({ kind: 'PRODUCTS' });

    await expect(service.update('lessari', 'user-1', 'section-1', { kind: 'BANNER' })).rejects.toThrow();
  });

  it('refuses to turn a banner into the promises band', async () => {
    const { service } = build({ kind: 'BANNER' });

    await expect(service.update('lessari', 'user-1', 'section-1', { kind: 'BENEFITS' })).rejects.toThrow();
  });

  it('lets a patch repeat the kind a block already has', async () => {
    // The panel sends the whole form on every save, so the unchanged kind rides along every time.
    const { service } = build({ kind: 'PRODUCTS' });

    await expect(service.update('lessari', 'user-1', 'section-1', { kind: 'PRODUCTS' })).resolves.toBeDefined();
  });
});

describe('SectionsService — where a block points', () => {
  it('keeps the category and clears the other two', async () => {
    const { service, create } = build({ category: { id: 'cat-1' } });

    await service.create('lessari', 'user-1', { kind: 'BANNER', ...base, target: 'CATEGORY', categorySlug: 'blusas' });

    expect(create.mock.calls[0][0].data).toMatchObject({
      target: 'CATEGORY',
      categoryId: 'cat-1',
      productId: null,
      externalUrl: null,
    });
  });

  /**
   * The form holds all three destinations at once so a shopkeeper who changes their mind does not
   * lose what they picked. What must never reach the database is two of them at the same time.
   */
  it('drops a destination the target did not name, even when one was sent', async () => {
    const { service, create } = build({ product: { id: 'prod-1' } });

    await service.create('lessari', 'user-1', {
      kind: 'BANNER', ...base,
      target: 'PRODUCT',
      productSlug: 'whey',
      categorySlug: 'blusas',
      externalUrl: 'https://example.com',
    });

    expect(create.mock.calls[0][0].data).toMatchObject({
      target: 'PRODUCT',
      productId: 'prod-1',
      categoryId: null,
      externalUrl: null,
    });
  });

  /**
   * The fourth target, and the only one with nothing to look up. A poster that says "entrega em
   * todo o Brasil" has nowhere to send anyone, and that is what it is for.
   */
  it('keeps nothing at all when the block goes nowhere', async () => {
    const { service, create, prisma } = build();

    await service.create('lessari', 'user-1', { kind: 'BANNER', ...base, target: 'NONE', categorySlug: 'blusas' });

    expect(create.mock.calls[0][0].data).toMatchObject({
      target: 'NONE',
      categoryId: null,
      productId: null,
      externalUrl: null,
    });
    // And it does not go looking: there is nothing to resolve.
    expect(prisma.productCategory.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a target that names a destination it was not given', async () => {
    const { service } = build();

    await expect(service.create('lessari', 'user-1', { kind: 'BANNER', ...base, target: 'CATEGORY' })).rejects.toMatchObject({
      response: { errorCode: 'SECTION_TARGET_INVALID' },
    });
  });

  /**
   * The one failure here that is a leak rather than a mistake: without this lookup being scoped to
   * the shop, a banner could point at another shop's category.
   */
  it('refuses a category that is not this shop’s', async () => {
    const { service, prisma } = build({ category: null });

    await expect(
      service.create('lessari', 'user-1', { kind: 'BANNER', ...base, target: 'CATEGORY', categorySlug: 'de-outra-loja' }),
    ).rejects.toMatchObject({ response: { errorCode: 'SECTION_TARGET_INVALID' } });

    expect(prisma.productCategory.findUnique).toHaveBeenCalledWith({
      where: { storeId_slug: { storeId: STORE, slug: 'de-outra-loja' } },
      select: { id: true },
    });
  });

  it('lands a new block last, so it does not rearrange a page already arranged', async () => {
    const { service, create } = build({ category: { id: 'cat-1' } });

    await service.create('lessari', 'user-1', { kind: 'BANNER', ...base, target: 'CATEGORY', categorySlug: 'blusas' });

    expect(create.mock.calls[0][0].data.position).toBe(3);
  });

  /**
   * The four columns are constrained together, so they move together. A `categorySlug` with no
   * `target` is either a re-point the shopkeeper meant or a stale field in a form, and guessing
   * either way can write a row the database refuses.
   */
  it('refuses a destination sent without the target that names it', async () => {
    const { service } = build();

    await expect(
      service.update('lessari', 'user-1', 'section-1', { categorySlug: 'blusas' }),
    ).rejects.toMatchObject({ response: { errorCode: 'SECTION_TARGET_INVALID' } });
  });

  it('leaves the destination alone when a patch does not mention it', async () => {
    const { service, prisma } = build();

    await service.update('lessari', 'user-1', 'section-1', { title: 'Outro título' });

    const data = (prisma.storeSection.update as unknown as { mock: { calls: [{ data: object }][] } }).mock
      .calls[0][0].data;
    expect(data).toEqual({ title: 'Outro título' });
  });
});

describe('SectionsService — what a block may hold', () => {
  it('refuses a hero slide with no picture', async () => {
    const { service } = build({ kind: 'HERO' });

    await expect(
      service.update('lessari', 'user-1', 'section-1', { items: [{ id: 'x', target: 'NONE' }] as never }),
    ).rejects.toThrow();
  });

  // `@IsArray()` proves only that it is a list. What is inside depends on the kind, and the union
  // was a validator nobody ran until this call site existed.
  it('refuses a slide that names a destination it does not carry', async () => {
    const { service } = build({ kind: 'HERO' });

    await expect(
      service.update('lessari', 'user-1', 'section-1', {
        items: [{ id: 'x', imageUrl: 'https://img/x.jpg', target: 'CATEGORY' }] as never,
      }),
    ).rejects.toThrow();
  });

  it('takes a slide that carries what it names', async () => {
    const { service } = build({ kind: 'HERO' });

    await expect(
      service.update('lessari', 'user-1', 'section-1', {
        items: [
          { id: 'x', imageUrl: 'https://img/x.jpg', target: 'EXTERNAL', externalUrl: 'https://wa.me/55' },
        ] as never,
      }),
    ).resolves.toBeDefined();
  });

  it('refuses items on a kind that holds none', async () => {
    const { service } = build({ kind: 'TEXT' });

    await expect(
      service.update('lessari', 'user-1', 'section-1', {
        items: [{ id: 'x', imageUrl: 'https://img/x.jpg', target: 'NONE' }] as never,
      }),
    ).rejects.toThrow();
  });
});

describe('SectionsService — a patch that says nothing changes nothing', () => {
  // Reported as "says it saved and did not": the update computed the checked items and then never
  // put them in the data it wrote, so the API answered 200 with the row untouched.
  it('writes the items a patch carries', async () => {
    const { service, prisma } = build({ kind: 'HERO' });

    await service.update('lessari', 'user-1', 'section-1', {
      items: [{ id: 'x', imageUrl: 'https://img/x.jpg', title: 'Novo', target: 'NONE' }] as never,
    });

    expect(prisma.storeSection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          items: [expect.objectContaining({ id: 'x', title: 'Novo' })],
        }),
      }),
    );
  });

  it('leaves the items alone when a patch does not mention them', async () => {
    const { service, prisma } = build({ kind: 'HERO' });

    await service.update('lessari', 'user-1', 'section-1', { width: 'CONTAINED' });

    const [{ data }] = (prisma.storeSection.update as unknown as { mock: { calls: [{ data: object }][] } }).mock.calls.at(-1)!;
    expect(data).not.toHaveProperty('items');
  });
});
