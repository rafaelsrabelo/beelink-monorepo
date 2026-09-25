// Types
import type { StoresService } from '../stores/stores.service.js';
import type { ProductCategoriesService } from './product-categories.service.js';
import type { ProductsService } from './products.service.js';
import type { StorefrontListingService } from './storefront-listing.service.js';

// App
import { PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE_MAX } from './catalog.constants.js';
import { StorefrontController } from './storefront.controller.js';

/** Collaborators by hand, as the other specs build them — the bounds are what is under test. */
function build() {
  const listProducts = vi.fn().mockResolvedValue({
    products: [],
    total: 137,
    facets: { categories: [], options: [], discount: { count: 0, selected: false }, price: null },
    applied: [],
  });

  const controller = new StorefrontController(
    { publicStoreId: vi.fn().mockResolvedValue('store-1') } as unknown as StoresService,
    {} as ProductsService,
    { listPublic: vi.fn().mockResolvedValue([]) } as unknown as ProductCategoriesService,
    { listing: listProducts } as unknown as StorefrontListingService,
  );

  /** What the listing was asked for: the filters, the page and the page size. */
  const asked = () => {
    const [, filters, page, pageSize] = listProducts.mock.calls[0]!;
    return { ...filters, page, pageSize };
  };

  return { controller, listProducts, asked };
}

describe('StorefrontController.catalog', () => {
  it('answers the total of the whole filter and the page it actually served', async () => {
    const { controller } = build();

    await expect(controller.catalog('lessari', undefined, undefined, 2, 12)).resolves.toMatchObject({
      total: 137,
      page: 2,
      pageSize: 12,
    });
  });

  it('serves a page above the ceiling at the ceiling, rather than refusing it', async () => {
    // Without the ceiling one address could ask a shop of ten thousand products for all of them.
    const { controller, asked } = build();

    const answer = await controller.catalog('lessari', undefined, undefined, 1, 10_000);

    expect(answer.pageSize).toBe(PRODUCTS_PAGE_SIZE_MAX);
    expect(asked()).toMatchObject({ pageSize: PRODUCTS_PAGE_SIZE_MAX });
  });

  it('bounds a page below the first one to the first one, instead of a negative offset', async () => {
    const { controller, asked } = build();

    const answer = await controller.catalog('lessari', undefined, undefined, 0);

    expect(answer.page).toBe(1);
    expect(asked()).toMatchObject({ page: 1 });
  });

  it('serves the first page of PRODUCTS_PAGE_SIZE when the URL asks for neither', async () => {
    const { controller } = build();

    await expect(controller.catalog('lessari')).resolves.toMatchObject({
      page: 1,
      pageSize: PRODUCTS_PAGE_SIZE,
    });
  });

  it('keeps the filter on the products and off the navigation', async () => {
    const { controller, asked } = build();

    await controller.catalog('lessari', 'blusas', 'croche');

    expect(asked()).toMatchObject({ category: 'blusas', search: 'croche' });
  });

  it('reads the order, the price in whole reais, the discount and the options from the address', async () => {
    const { controller, asked } = build();

    const answer = await controller.catalog('lessari', undefined, undefined, 1, undefined, 'menor-preco', 50, 200, '1', [
      'Tamanho:P',
      'tamanho:M',
      'Cor:Areia',
    ]);

    expect(answer.sort).toBe('menor-preco');
    expect(asked()).toMatchObject({
      sort: 'menor-preco',
      priceMinCents: 5000,
      priceMaxCents: 20000,
      discount: true,
      options: [
        { name: 'Tamanho', values: ['P', 'M'] },
        { name: 'Cor', values: ['Areia'] },
      ],
    });
  });

  it('serves an order it does not know as the shop’s own, and a negative price as no bound', async () => {
    const { controller, asked } = build();

    const answer = await controller.catalog('lessari', undefined, undefined, 1, undefined, 'mais-vendidos', -5);

    expect(answer.sort).toBe('relevancia');
    expect(asked().priceMinCents).toBeUndefined();
  });
});
