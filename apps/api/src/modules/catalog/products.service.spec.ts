// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';
import type { CatalogSlugService } from './catalog-slug.service.js';
import type { ProductRow } from './catalog.mapper.js';

// App
import { PRODUCTS_PAGE_SIZE } from './catalog.constants.js';
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

    expect(count.mock.calls[0]?.[0].where).toEqual(findMany.mock.calls[0]?.[0].where);
    expect(count.mock.calls[0]?.[0].where).toMatchObject({
      storeId: STORE,
      status: 'ACTIVE',
      category: {
        isActive: true,
        // The shelf of a parent holds what is under it. Without the second arm, filtering
        // `Proteínas` in a shop that files every whey under `Proteínas → Whey` answers with
        // nothing — and the shopkeeper reports it as "my category is empty".
        OR: [{ slug: 'blusas' }, { parent: { slug: 'blusas', isActive: true } }],
      },
    });
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
