// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Product, ProductCategory, Section, StoreComponent } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return {
    name: slug,
    slug,
    type: 'ECOMMERCE',
    socialNetworks: { whatsapp: '(11) 99999-8888' },
    address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
  };
}

/** Showcases of products, through the real pipe and the real database. */
describe('page — a showcase has a source', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let stranger: AuthSession;
  let category: ProductCategory;
  let product: Product;
  let foreignCategory: ProductCategory;
  let foreignProduct: Product;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('vizinha'));

    await expectCreated(call('POST', '/api/stores', owner, shopBody('lessari')));
    await expectCreated(call('POST', '/api/stores', stranger, shopBody('vizinha')));

    category = await expectCreated<ProductCategory>(call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Blusas' }));
    product = await expectCreated<Product>(call('POST', '/api/stores/lessari/products', owner, { name: 'Blusa', priceCents: 4990 }));
    foreignCategory = await expectCreated<ProductCategory>(call('POST', '/api/stores/vizinha/product-categories', stranger, { name: 'Dela' }));
    foreignProduct = await expectCreated<Product>(call('POST', '/api/stores/vizinha/products', stranger, { name: 'Dela', priceCents: 100 }));
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, session: AuthSession, payload?: object) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${session.accessToken}` },
      ...(payload ? { payload } : {}),
    });
  }

  async function expectCreated<T = unknown>(pending: ReturnType<typeof call>): Promise<T> {
    const response = await pending;
    if (response.statusCode !== 201) throw new Error(`answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  async function showcases(): Promise<StoreComponent[]> {
    const sections = (await call('GET', '/api/stores/lessari/sections', owner)).json<Section[]>();
    return sections.flatMap((section) => section.components).filter((component) => component.kind === 'PRODUCTS');
  }

  it('opens a shop with one showcase of every product, on a rail', async () => {
    expect(await showcases()).toEqual([
      expect.objectContaining({ source: 'ALL', display: 'RAIL', sourceCategoryId: null, limit: null, items: [] }),
    ]);
  });

  it('holds three showcases with three sources in one band', async () => {
    const band = await expectCreated<Section>(
      call('POST', '/api/stores/lessari/sections', owner, {
        component: { kind: 'PRODUCTS', source: 'CATEGORY', sourceCategoryId: category.id, span: 'THIRD' },
      }),
    );
    await expectCreated(
      call('POST', `/api/stores/lessari/sections/${band.id}/components`, owner, {
        kind: 'PRODUCTS',
        source: 'SELECTION',
        items: [{ id: 'a', productId: product.id }],
        span: 'THIRD',
      }),
    );
    await expectCreated(
      call('POST', `/api/stores/lessari/sections/${band.id}/components`, owner, {
        kind: 'PRODUCTS',
        source: 'NEWEST',
        display: 'GRID',
        limit: 6,
        span: 'THIRD',
      }),
    );

    const inBand = (await showcases()).filter((component) => component.sectionId === band.id);
    expect(inBand.map((component) => component.source)).toEqual(['CATEGORY', 'SELECTION', 'NEWEST']);
    expect(inBand[2]).toMatchObject({ display: 'GRID', limit: 6 });
  });

  it('refuses to delete the last showcase, and lets any other go', async () => {
    const [first] = await showcases();
    const refused = await call('DELETE', `/api/stores/lessari/components/${first!.id}`, owner);
    expect(refused.statusCode).toBe(400);
    expect(refused.json<ApiErrorBody>().errorCode).toBe('COMPONENT_REQUIRED');

    await expectCreated(call('POST', '/api/stores/lessari/sections', owner, { component: { kind: 'PRODUCTS' } }));
    const allowed = await call('DELETE', `/api/stores/lessari/components/${first!.id}`, owner);
    expect(allowed.statusCode).toBe(204);
  });

  it('refuses a category showcase with no category, or with another shop’s', async () => {
    for (const component of [
      { kind: 'PRODUCTS', source: 'CATEGORY' },
      { kind: 'PRODUCTS', source: 'CATEGORY', sourceCategoryId: foreignCategory.id },
    ]) {
      const response = await call('POST', '/api/stores/lessari/sections', owner, { component });

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('SHOWCASE_CATEGORY_INVALID');
    }
  });

  it('refuses a hand-picked showcase that names another shop’s product', async () => {
    const [first] = await showcases();
    const response = await call('PATCH', `/api/stores/lessari/components/${first!.id}`, owner, {
      source: 'SELECTION',
      items: [{ id: 'a', productId: foreignProduct.id }],
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('SHOWCASE_PRODUCTS_INVALID');
  });

  it('refuses a limit outside one to forty-eight, with its own code', async () => {
    const [first] = await showcases();

    for (const limit of [0, 49, 'dez']) {
      const response = await call('PATCH', `/api/stores/lessari/components/${first!.id}`, owner, { limit });
      expect(response.json<ApiErrorBody>().errorCode, String(limit)).toBe('SHOWCASE_LIMIT_INVALID');
    }
  });
});
