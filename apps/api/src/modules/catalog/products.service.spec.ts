// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';
import type { CatalogSlugService } from './catalog-slug.service.js';
import type { ProductRow } from './catalog.mapper.js';

// App
import { PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE_MAX } from './catalog.constants.js';
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';
import { ProductsService } from './products.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';

/** Only the columns a card is built from matter here; the mapper is tested where it lives. */
function rows(count: number): ProductRow[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `0199a0f1-0000-7000-8000-00000000${String(index).padStart(4, '0')}`,
    slug: `produto-${index}`,
    name: `Produto ${index}`,
    priceCents: 4990,
    compareAtPriceCents: null,
    images: [],
    category: null,
  })) as unknown as ProductRow[];
}

/**
 * Collaborators by hand, the way stores.service.spec.ts builds them — no Nest testing module. The
 * two queries answer markers rather than data: what is asserted is the arguments they were given
 * and that both were handed to the one transaction, which is what the answer is assembled from.
 */
function build(page: ProductRow[], total: number) {
  const findMany = vi.fn().mockReturnValue('findMany');
  const count = vi.fn().mockReturnValue('count');
  const transaction = vi.fn().mockResolvedValue([page, total]);

  const prisma = {
    product: { findMany, count },
    $transaction: transaction,
  } as unknown as PrismaService;

  const service = new ProductsService(prisma, {} as StoresService, {} as CatalogSlugService);

  return { service, findMany, count, transaction };
}

describe('ProductsService.listPublic — the page and what it is a page of', () => {
  it('answers how many the filter matched, never how many came back', async () => {
    // `total: products.length` is the classic version of this bug: it reports a last page of six of
    // a hundred and thirty-seven as six, and the pager it feeds then offers no page at all.
    const { service } = build(rows(PRODUCTS_PAGE_SIZE), 137);

    const answer = await service.listPublic(STORE, { search: 'croche' });

    expect(answer.total).toBe(137);
    expect(answer.products).toHaveLength(PRODUCTS_PAGE_SIZE);
  });

  it('counts over the same filter the page was read with', async () => {
    const { service, findMany, count } = build(rows(2), 2);

    await service.listPublic(STORE, { category: 'blusas', search: 'croche' });

    expect(count.mock.calls[0][0].where).toEqual(findMany.mock.calls[0][0].where);
    expect(count.mock.calls[0][0].where).toMatchObject({
      storeId: STORE,
      category: {
        isActive: true,
        // The shelf of a parent holds what is under it. Without the second arm, filtering
        // `Proteínas` in a shop that files every whey under `Proteínas → Whey` answers with
        // nothing — and the shopkeeper reports it as "my category is empty".
        OR: [{ slug: 'blusas' }, { parent: { slug: 'blusas', isActive: true } }],
      },
    });
  });

  /**
   * The shelf rule and the search each carry an `OR`. Spread into one object the second overwrites
   * the first, and the shop window answers the search over sold-out products too — with a total
   * that agrees with it, so nothing looks wrong until someone counts by hand.
   */
  it('keeps the shelf rule and the search as separate conditions', async () => {
    const { service, findMany } = build(rows(1), 1);

    await service.listPublic(STORE, { search: 'croche' });

    const and = findMany.mock.calls[0][0].where.AND as { status?: string; OR: unknown[] }[];
    expect(and).toHaveLength(2);
    expect(and[0]).toEqual(ON_THE_SHELF_WHERE);
    expect(and[1]?.OR).toHaveLength(2);
  });

  it('leaves a sold-out product off the shelf, counting a null quantity as none', async () => {
    const { service, findMany } = build(rows(1), 1);

    await service.listPublic(STORE);

    const [shelf] = findMany.mock.calls[0][0].where.AND as { status: string; OR: unknown[] }[];
    expect(shelf?.status).toBe('ACTIVE');
    expect(shelf?.OR).toEqual([{ trackStock: false }, { stockQuantity: { gt: 0 } }]);
  });

  /**
   * The product page is the one public read that does NOT apply the shelf rule, and it is a
   * decision: this address goes out on WhatsApp, and a 404 the day the stock runs out breaks every
   * link already shared. The page answers, marked sold out, with no way to order.
   */
  it('still serves the page of a product whose shelf is empty', async () => {
    const [row] = rows(1);
    const findFirst = vi.fn().mockResolvedValue({ ...row, description: null, trackStock: true, stockQuantity: 0 });
    const service = new ProductsService(
      { product: { findFirst } } as never,
      {} as StoresService,
      {} as CatalogSlugService,
    );

    const product = await service.publicBySlug(STORE, 'bolsa-amora');

    expect(findFirst.mock.calls[0][0].where).toEqual({ storeId: STORE, slug: 'bolsa-amora', status: 'ACTIVE' });
    expect(product.soldOut).toBe(true);
  });

  it('does not call a made-to-order product sold out, however empty its count column is', async () => {
    const [row] = rows(1);
    const findFirst = vi.fn().mockResolvedValue({ ...row, description: null, trackStock: false, stockQuantity: 0 });
    const service = new ProductsService(
      { product: { findFirst } } as never,
      {} as StoresService,
      {} as CatalogSlugService,
    );

    expect((await service.publicBySlug(STORE, 'bolsa-amora')).soldOut).toBe(false);
  });

  it('reads both in one transaction, so they cannot fall either side of a write', async () => {
    const { service, transaction } = build(rows(1), 1);

    await service.listPublic(STORE);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(transaction.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('skips the pages before the one asked for', async () => {
    const { service, findMany } = build(rows(12), 137);

    await service.listPublic(STORE, { page: 3, pageSize: 12 });

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 24, take: 12 });
  });

  it('serves the first page of PRODUCTS_PAGE_SIZE when the caller asks for neither', async () => {
    const { service, findMany } = build(rows(PRODUCTS_PAGE_SIZE), 137);

    await service.listPublic(STORE);

    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ skip: 0, take: PRODUCTS_PAGE_SIZE });
  });
});

describe('ProductsService.list — the panel, filtered', () => {
  /**
   * The owner's shape carries the dates and the private columns, which `rows()` leaves out because
   * the storefront never sees them. `toProduct` reads them, so they have to be here.
   */
  function ownerRows(count: number): ProductRow[] {
    const stamp = new Date('2026-09-22T12:00:00.000Z');

    return rows(count).map((row) => ({
      ...row,
      position: 0,
      status: 'ACTIVE',
      origin: null,
      costCents: null,
      sku: null,
      barcode: null,
      trackStock: false,
      stockQuantity: null,
      weightGrams: null,
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      description: null,
      createdAt: stamp,
      updatedAt: stamp,
    })) as unknown as ProductRow[];
  }

  /** The owned-store check is the only collaborator this method needs beyond Prisma. */
  function buildOwned(page: ProductRow[], total: number) {
    const built = build(page, total);
    const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) } as unknown as StoresService;

    return {
      ...built,
      service: new ProductsService(
        { product: { findMany: built.findMany, count: built.count }, $transaction: built.transaction } as never,
        stores,
        {} as CatalogSlugService,
      ),
    };
  }

  /**
   * The bug this method is one careless spread away from. "Out of stock" carries an `OR`, and so
   * does the search; in one object literal the second silently overwrites the first, and the
   * filtered search answers the search alone — with a total that agrees with it, so nothing looks
   * wrong until a shopkeeper counts by hand.
   */
  it('keeps the stock filter and the search as separate conditions', async () => {
    const { service, findMany } = buildOwned(ownerRows(1), 1);

    await service.list('lessari', 'user-1', { stock: 'OUT_OF_STOCK', search: 'whey' });

    const and = findMany.mock.calls[0][0].where.AND as { OR?: unknown[]; trackStock?: boolean }[];
    expect(and).toHaveLength(2);
    expect(and[0]).toMatchObject({ trackStock: true });
    expect(and[1]?.OR).toHaveLength(4);
  });

  it('matches the name, the code and the barcode — whichever the shopkeeper has in hand', async () => {
    const { service, findMany } = buildOwned(ownerRows(1), 1);

    await service.list('lessari', 'user-1', { search: 'WH-900' });

    const conditions = findMany.mock.calls[0][0].where.AND as { OR: Record<string, unknown>[] }[];
    expect(conditions[0]?.OR.map((arm) => Object.keys(arm)[0])).toEqual(['name', 'sku', 'barcode', 'variants']);
  });

  /** A product with options has a code per combination, and the one in hand may be any of them. */
  it('also matches the code and the barcode of every variant', async () => {
    const { service, findMany } = buildOwned(ownerRows(1), 1);

    await service.list('lessari', 'user-1', { search: 'BLS-P-ARE' });

    const conditions = findMany.mock.calls[0][0].where.AND as { OR: Record<string, unknown>[] }[];
    expect(conditions[0]?.OR[3]).toEqual({
      variants: {
        some: {
          OR: [
            { sku: { contains: 'BLS-P-ARE', mode: 'insensitive' } },
            { barcode: { contains: 'BLS-P-ARE', mode: 'insensitive' } },
          ],
        },
      },
    });
  });

  /**
   * A shop that does not count a product is not a shop that has none of it. Asking for "untracked"
   * must not also demand a quantity, or every made-to-order product disappears from its own filter.
   */
  it('asks only that counting is off when the filter is "untracked"', async () => {
    const { service, findMany } = buildOwned(ownerRows(1), 1);

    await service.list('lessari', 'user-1', { stock: 'UNTRACKED' });

    expect(findMany.mock.calls[0][0].where.AND).toEqual([{ trackStock: false }]);
  });

  /** A counted product with no quantity yet is, from the shelf, none left. */
  it('counts a null quantity as out of stock, not as unknown', async () => {
    const { service, findMany } = buildOwned(ownerRows(1), 1);

    await service.list('lessari', 'user-1', { stock: 'OUT_OF_STOCK' });

    const conditions = findMany.mock.calls[0][0].where.AND as { OR: unknown[] }[];
    expect(conditions[0]?.OR).toEqual([{ stockQuantity: { lte: 0 } }, { stockQuantity: null }]);
  });

  it('answers the bounds it used, never the ones it was asked for', async () => {
    const { service } = buildOwned(ownerRows(1), 400);

    const answer = await service.list('lessari', 'user-1', { page: 0, pageSize: 5_000 });

    expect(answer.page).toBe(1);
    expect(answer.pageSize).toBe(PRODUCTS_PAGE_SIZE_MAX);
    expect(answer.total).toBe(400);
  });

  /** Drafts are the reason this screen exists; a panel that hid them could not publish one. */
  it('does not filter by status unless asked, so drafts are in the list', async () => {
    const { service, findMany } = buildOwned(ownerRows(1), 1);

    await service.list('lessari', 'user-1', {});

    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('status');
  });
})
