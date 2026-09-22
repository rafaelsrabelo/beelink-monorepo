// Libs
import { describe, expect, it, vi } from 'vitest';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { CatalogSlugService } from './catalog-slug.service.js';
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';
import { productCategoryAdminInclude, productCategoryInclude } from './catalog.mapper.js';
import { ProductCategoriesService } from './product-categories.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const PARENT = '0199a0f1-0000-7000-8000-0000000000a1';
const CHILD = '0199a0f1-0000-7000-8000-0000000000a2';

interface CategoryRow {
  id: string;
  parentId: string | null;
  products: number;
  storeId?: string;
  /** Whether anything here is published, independent of how many are on the shelf. */
  published?: boolean;
}

/**
 * Collaborators by hand, as every other service spec here builds them. `findFirst` answers the
 * parent lookup and `findMany` the public listing; nothing else is exercised.
 */
function build(rows: CategoryRow[]) {
  const findFirst = vi.fn(async ({ where }: { where: { id: string; storeId: string } }) => {
    const row = rows.find((entry) => entry.id === where.id && (entry.storeId ?? STORE) === where.storeId);

    return row ? { id: row.id, parentId: row.parentId } : null;
  });

  const findMany = vi.fn(async () =>
    rows.map((row) => ({
      id: row.id,
      storeId: STORE,
      slug: row.id,
      name: row.id,
      description: null,
      imageUrl: null,
      parentId: row.parentId,
      parent: row.parentId ? { slug: row.parentId } : null,
      position: 0,
      isActive: true,
      slugHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { products: row.products },
      // What the storefront include now also reads: whether anything here is published at all,
      // which is not the same question as how many are on the shelf. Defaults to the count so
      // every test written before the two were told apart keeps meaning what it meant.
      products: (row.published ?? row.products > 0) ? [{ id: row.id }] : [],
    })),
  );

  const prisma = { productCategory: { findFirst, findMany } } as unknown as PrismaService;
  const service = new ProductCategoriesService(prisma, {} as StoresService, new CatalogSlugService());

  return { service, findFirst };
}

/** The private guard, reached the way the service does. Two levels is the whole rule. */
const parentFor = (service: ProductCategoriesService, parentId: string, selfId?: string) =>
  (service as unknown as {
    parentFor: (storeId: string, parentId: string, selfId?: string) => Promise<string>;
  }).parentFor(STORE, parentId, selfId);

describe('ProductCategoriesService — two levels and no third', () => {
  it('takes a top-level category as a parent', async () => {
    const { service } = build([{ id: PARENT, parentId: null, products: 0 }]);

    await expect(parentFor(service, PARENT)).resolves.toBe(PARENT);
  });

  /**
   * The URL is `/<shop>/<category>` flat, so a grandchild has nowhere to live that its grandparent
   * does not already occupy. No database constraint can say this — a check would have to read
   * another row — which is why it is here and why it needs a test.
   */
  it('refuses a parent that already has one', async () => {
    const { service } = build([
      { id: PARENT, parentId: null, products: 0 },
      { id: CHILD, parentId: PARENT, products: 0 },
    ]);

    await expect(parentFor(service, CHILD)).rejects.toMatchObject({
      response: { errorCode: 'PRODUCT_CATEGORY_DEPTH' },
    });
  });

  /** A row Postgres accepts happily, and every read of the tree then walks in circles. */
  it('refuses a category made its own parent', async () => {
    const { service } = build([{ id: PARENT, parentId: null, products: 0 }]);

    await expect(parentFor(service, PARENT, PARENT)).rejects.toMatchObject({
      response: { errorCode: 'PRODUCT_CATEGORY_DEPTH' },
    });
  });

  /** A tenant boundary, not a taxonomy question: another shop's category is simply not there. */
  it('refuses a parent belonging to another shop', async () => {
    const { service } = build([
      { id: PARENT, parentId: null, products: 0, storeId: '0199a0f1-0000-7000-8000-0000000000ff' },
    ]);

    await expect(parentFor(service, PARENT)).rejects.toMatchObject({
      response: { errorCode: 'PRODUCT_CATEGORY_NOT_FOUND' },
    });
  });
});

describe('ProductCategoriesService — the panel counts what is filed, not what is buyable', () => {
  /**
   * The two reads share a model and must not share a count. The shopkeeper's screen exists to show
   * what they own — a category reading "0 produtos" over two products they still sell is an
   * invitation to delete it, and the relation is `SetNull`, so the products survive and quietly
   * lose their category. Sold out is exactly the row they came here to find.
   */
  it('counts every product filed in a category, sold-out and draft alike', () => {
    expect(productCategoryAdminInclude._count).toEqual({ select: { products: true } });
  });

  it('counts only what is on the shelf for the shop window', () => {
    expect(productCategoryInclude._count.select.products.where).toBe(ON_THE_SHELF_WHERE);
  });
});

describe('ProductCategoriesService.listPublic — what a parent is worth', () => {
  /**
   * A shop that files every whey under `Proteínas → Whey` has a `Proteínas` holding nothing of its
   * own. Counting only direct products drops it from the menu while everything under it is still
   * for sale — which the shopkeeper reports as "my category disappeared".
   */
  it('rolls a subcategory’s products up into its parent', async () => {
    const { service } = build([
      { id: PARENT, parentId: null, products: 0 },
      { id: CHILD, parentId: PARENT, products: 7 },
    ]);

    const categories = await service.listPublic(STORE);

    expect(categories.find((category) => category.slug === PARENT)?.productCount).toBe(7);
    expect(categories.find((category) => category.slug === CHILD)?.productCount).toBe(7 - 0);
  });

  /**
   * The regression this guard exists for. A category whose last item sold out has a shelf count of
   * zero and still exists: its address is in somebody's Instagram bio, and the sold-out product's
   * own page — kept answering on purpose — links to it from the breadcrumb and from its back
   * button. Dropping it on a count of zero turned all three into a 404 on the day a shop made its
   * last sale.
   */
  it('keeps a category whose shelf is empty but which still holds a published product', async () => {
    const { service } = build([{ id: PARENT, parentId: null, products: 0, published: true }]);

    const categories = await service.listPublic(STORE);

    expect(categories.map((category) => category.slug)).toEqual([PARENT]);
    expect(categories[0]?.productCount).toBe(0);
  });

  it('keeps a parent whose only published product is sold out inside a child', async () => {
    const { service } = build([
      { id: PARENT, parentId: null, products: 0 },
      { id: CHILD, parentId: PARENT, products: 0, published: true },
    ]);

    const categories = await service.listPublic(STORE);

    expect(categories.map((category) => category.slug).sort()).toEqual([CHILD, PARENT].sort());
  });

  it('still drops a branch with nothing published anywhere in it', async () => {
    const { service } = build([
      { id: PARENT, parentId: null, products: 0 },
      { id: CHILD, parentId: PARENT, products: 0 },
    ]);

    await expect(service.listPublic(STORE)).resolves.toEqual([]);
  });

  it('says which category a subcategory sits under, in the slug a URL can carry', async () => {
    const { service } = build([
      { id: PARENT, parentId: null, products: 1 },
      { id: CHILD, parentId: PARENT, products: 1 },
    ]);

    const categories = await service.listPublic(STORE);

    expect(categories.find((category) => category.slug === CHILD)?.parentSlug).toBe(PARENT);
    expect(categories.find((category) => category.slug === PARENT)?.parentSlug).toBeNull();
  });
});
