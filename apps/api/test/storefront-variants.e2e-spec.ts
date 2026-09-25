// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AuthSession,
  ProductDetail,
  PublicProductDetail,
  StorefrontCatalog,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** No address street: the service geocodes through a third party the moment one is complete. */
const shopBody = {
  name: 'Lessari',
  slug: 'lessari',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

describe('a product’s variants on the storefront', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await ownerCall('POST', '/api/stores', shopBody);
  });

  function ownerCall(method: 'POST' | 'PUT', url: string, payload: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, payload });
  }

  function visit<T>(url: string): Promise<T> {
    return app.inject({ method: 'GET', url }).then((response) => {
      if (response.statusCode !== 200) throw new Error(`GET ${url} answered ${response.statusCode}: ${response.payload}`);
      return response.json<T>();
    });
  }

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await ownerCall('POST', '/api/stores/lessari/products', body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  /** Whey in 150 g, 300 g and 600 g: 300 g sold out, 600 g not sold at all. */
  async function wheyInThreeSizes(): Promise<ProductDetail> {
    const product = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 6990 });
    const options = await ownerCall('PUT', `/api/stores/lessari/products/${product.id}/options`, {
      options: [{ name: 'Peso', values: [{ name: '150 g' }, { name: '300 g' }, { name: '600 g' }] }],
    });
    const [small, medium, large] = options.json<ProductDetail>().variants;

    const variants = await ownerCall('PUT', `/api/stores/lessari/products/${product.id}/variants`, {
      variants: [
        { id: small!.id, priceCents: 6990, trackStock: true, stockQuantity: 4, sku: 'WH-150', costCents: 3000 },
        { id: medium!.id, priceCents: 11990, compareAtPriceCents: 13990, trackStock: true, stockQuantity: 0 },
        { id: large!.id, priceCents: 20990, isActive: false },
      ],
    });
    return variants.json<ProductDetail>();
  }

  it('answers a product without options with one default variant', async () => {
    await addProduct({ name: 'Bolsa', slug: 'bolsa', priceCents: 4990 });

    const page = await visit<PublicProductDetail>('/api/stores/lessari/catalog/bolsa');

    expect(page.options).toEqual([]);
    expect(page.variants).toHaveLength(1);
    expect(page.variants[0]).toMatchObject({ optionValueIds: [], priceCents: 4990, available: true });
    expect(page.priceRange).toEqual({ minCents: 4990, maxCents: 4990 });
  });

  it('lists what the shop sells, each saying whether it can be ordered, and nothing that is the shop’s', async () => {
    const detail = await wheyInThreeSizes();

    const page = await visit<PublicProductDetail>('/api/stores/lessari/catalog/whey');

    expect(page.options[0]?.values.map((value) => value.name)).toEqual(['150 g', '300 g', '600 g']);
    const [small, medium] = page.options[0]!.values;
    expect(page.variants.map((variant) => variant.optionValueIds)).toEqual([[small!.id], [medium!.id]]);
    // 600 g is switched off, so it is not there at all; 300 g is sold out, and says so.
    expect(page.variants.map((variant) => [variant.id, variant.available])).toEqual([
      [detail.variants[0]!.id, true],
      [detail.variants[1]!.id, false],
    ]);
    expect(page.variants[1]).toMatchObject({ priceCents: 11990, compareAtPriceCents: 13990 });
    for (const variant of page.variants) {
      expect(Object.keys(variant).sort()).toEqual(
        ['available', 'compareAtPriceCents', 'id', 'imageUrl', 'optionValueIds', 'priceCents'],
      );
    }
  });

  it('ranges the price over what can be ordered, on the page and on the card', async () => {
    await wheyInThreeSizes();

    const page = await visit<PublicProductDetail>('/api/stores/lessari/catalog/whey');
    const shopWindow = await visit<StorefrontCatalog>('/api/stores/lessari/catalog');

    // 300 g is sold out and 600 g is not sold: only 150 g can be ordered.
    expect(page.priceRange).toEqual({ minCents: 6990, maxCents: 6990 });
    expect(shopWindow.products.find((card) => card.slug === 'whey')?.priceRange).toEqual({
      minCents: 6990,
      maxCents: 6990,
    });
  });

  it('tells a card whether the product sells combinations, so it can add one without a choice', async () => {
    await wheyInThreeSizes();
    await addProduct({ name: 'Blusa', slug: 'blusa', priceCents: 5990 });

    const shopWindow = await visit<StorefrontCatalog>('/api/stores/lessari/catalog');
    const page = await visit<PublicProductDetail>('/api/stores/lessari/catalog/blusa');

    expect(shopWindow.products.find((card) => card.slug === 'whey')?.hasOptions).toBe(true);
    expect(shopWindow.products.find((card) => card.slug === 'blusa')?.hasOptions).toBe(false);
    // The product's own page carries its options; the flag is a shelf's.
    expect(page).not.toHaveProperty('hasOptions');
  });

  it("sums up a card's first option, and nothing for a product without one", async () => {
    await wheyInThreeSizes();
    await addProduct({ name: 'Blusa', slug: 'blusa', priceCents: 5990 });

    const shopWindow = await visit<StorefrontCatalog>('/api/stores/lessari/catalog');
    const page = await visit<PublicProductDetail>('/api/stores/lessari/catalog/blusa');

    // 600 g is not sold at all, so it is no choice a visitor has; 300 g ran out and still is one.
    expect(shopWindow.products.find((card) => card.slug === 'whey')?.optionSummary).toEqual({ name: 'Peso', valueCount: 2 });
    expect(shopWindow.products.find((card) => card.slug === 'blusa')?.optionSummary).toBeNull();
    expect(shopWindow.products.find((card) => card.slug === 'blusa')?.imageUrls).toEqual([]);
    // The page reads the whole gallery and the options themselves; the summary is a shelf's.
    expect(page).not.toHaveProperty('optionSummary');
  });

  it("carries a card's first five photos in the shopkeeper's order, the cover first", async () => {
    const urls = ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => `https://res.cloudinary.com/demo/${name}.jpg`);
    await addProduct({ name: 'Blusa', slug: 'blusa', priceCents: 5990, images: urls.map((url) => ({ url })) });

    const card = (await visit<StorefrontCatalog>('/api/stores/lessari/catalog')).products.find((entry) => entry.slug === 'blusa');

    expect(card?.imageUrls).toEqual(urls.slice(0, 5));
    expect(card?.imageUrl).toBe(urls[0]);
  });

  it('widens the range as combinations come back', async () => {
    const detail = await wheyInThreeSizes();
    await ownerCall('PUT', `/api/stores/lessari/products/${detail.id}/variants`, {
      variants: [
        { id: detail.variants[1]!.id, stockQuantity: 2 },
        { id: detail.variants[2]!.id, isActive: true },
      ],
    });

    const shopWindow = await visit<StorefrontCatalog>('/api/stores/lessari/catalog');

    expect(shopWindow.products.find((card) => card.slug === 'whey')).toMatchObject({
      priceCents: 6990,
      priceRange: { minCents: 6990, maxCents: 20990 },
    });
  });

  it('keeps serving a sold-out product’s page, every variant marked unavailable', async () => {
    const product = await addProduct({ name: 'Bolsa', slug: 'bolsa', priceCents: 4990, trackStock: true, stockQuantity: 0 });

    const page = await visit<PublicProductDetail>('/api/stores/lessari/catalog/bolsa');

    expect(page.soldOut).toBe(true);
    expect(page.variants).toEqual([expect.objectContaining({ id: product.variants[0]!.id, available: false })]);
  });
});
