// Types
import type { StoresService } from '../stores/stores.service.js';
import type { ProductCategoriesService } from './product-categories.service.js';
import type { ProductsService } from './products.service.js';

// App
import { PRODUCTS_PAGE_SIZE, PRODUCTS_PAGE_SIZE_MAX } from './catalog.constants.js';
import { StorefrontController } from './storefront.controller.js';

/** Collaborators by hand, as the other specs build them — the bounds are what is under test. */
function build() {
  const listProducts = vi.fn().mockResolvedValue({ products: [], total: 137 });

  const controller = new StorefrontController(
    { publicStoreId: vi.fn().mockResolvedValue('store-1') } as unknown as StoresService,
    { listPublic: listProducts } as unknown as ProductsService,
    { listPublic: vi.fn().mockResolvedValue([]) } as unknown as ProductCategoriesService,
  );

  return { controller, listProducts };
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
    const { controller, listProducts } = build();

    const answer = await controller.catalog('lessari', undefined, undefined, 1, 10_000);

    expect(answer.pageSize).toBe(PRODUCTS_PAGE_SIZE_MAX);
    expect(listProducts.mock.calls[0]?.[1]).toMatchObject({ pageSize: PRODUCTS_PAGE_SIZE_MAX });
  });

  it('bounds a page below the first one to the first one, instead of a negative offset', async () => {
    const { controller, listProducts } = build();

    const answer = await controller.catalog('lessari', undefined, undefined, 0);

    expect(answer.page).toBe(1);
    expect(listProducts.mock.calls[0]?.[1]).toMatchObject({ page: 1 });
  });

  it('serves the first page of PRODUCTS_PAGE_SIZE when the URL asks for neither', async () => {
    const { controller } = build();

    await expect(controller.catalog('lessari')).resolves.toMatchObject({
      page: 1,
      pageSize: PRODUCTS_PAGE_SIZE,
    });
  });

  it('keeps the filter on the products and off the navigation', async () => {
    const { controller, listProducts } = build();

    await controller.catalog('lessari', 'blusas', 'croche');

    expect(listProducts.mock.calls[0]?.[1]).toMatchObject({ category: 'blusas', search: 'croche' });
  });
});
