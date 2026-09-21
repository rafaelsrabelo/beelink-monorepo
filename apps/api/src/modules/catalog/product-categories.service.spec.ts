// Libs
import { describe, expect, it, vi } from 'vitest';

// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { CatalogSlugService } from './catalog-slug.service.js';
import { ProductCategoriesService } from './product-categories.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const PARENT = '0199a0f1-0000-7000-8000-0000000000a1';
const CHILD = '0199a0f1-0000-7000-8000-0000000000a2';

interface CategoryRow {
  id: string;
  parentId: string | null;
  products: number;
  storeId?: string;
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

  it('still drops a branch with nothing available anywhere in it', async () => {
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
