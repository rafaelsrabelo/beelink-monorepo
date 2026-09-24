// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AuthSession,
  Product,
  ProductCategory,
  PublicComponent,
  PublicProductCard,
  PublicStore,
  Section,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Lessari',
  slug: 'lessari',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

/**
 * The public read, resolving each showcase from its source against a real catalogue: a category and
 * a subcategory, a draft, a sold-out product and two on sale.
 */
describe('stores — the public read resolves each showcase', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let blusas: ProductCategory;
  let byName: Record<string, Product>;
  let bandId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await created(call('POST', '/api/stores', shopBody));

    blusas = await created<ProductCategory>(call('POST', '/api/stores/lessari/product-categories', { name: 'Blusas' }));
    const regatas = await created<ProductCategory>(
      call('POST', '/api/stores/lessari/product-categories', { name: 'Regatas', parentId: blusas.id }),
    );
    const calcas = await created<ProductCategory>(call('POST', '/api/stores/lessari/product-categories', { name: 'Calças' }));

    const bodies = [
      { name: 'Blusa Azul', priceCents: 5000, categoryId: blusas.id },
      { name: 'Regata Lisa', priceCents: 3000, categoryId: regatas.id, compareAtPriceCents: 4000 },
      { name: 'Calça Jeans', priceCents: 9000, categoryId: calcas.id, compareAtPriceCents: 12000 },
      { name: 'Blusa Rascunho', priceCents: 5000, categoryId: blusas.id, status: 'DRAFT' },
      { name: 'Blusa Esgotada', priceCents: 5000, categoryId: blusas.id, trackStock: true, stockQuantity: 0 },
    ];
    byName = {};
    for (const body of bodies) byName[body.name] = await created<Product>(call('POST', '/api/stores/lessari/products', body));

    const sections = (await call('GET', '/api/stores/lessari/sections')).json<Section[]>();
    bandId = sections.find((section) => section.components.some((component) => component.kind === 'PRODUCTS'))!.id;
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      ...(payload ? { payload } : {}),
    });
  }

  async function created<T = unknown>(pending: ReturnType<typeof call>): Promise<T> {
    const response = await pending;
    if (response.statusCode !== 201) throw new Error(`answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  async function addShowcase(component: object): Promise<string> {
    const added = await created<{ id: string }>(
      call('POST', `/api/stores/lessari/sections/${bandId}/components`, { kind: 'PRODUCTS', ...component }),
    );
    return added.id;
  }

  async function shelf(componentId: string): Promise<{ component: PublicComponent; names: string[] }> {
    const store = (await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<PublicStore>();
    const component = store.sections.flatMap((section) => section.components).find((row) => row.id === componentId)!;
    return { component, names: (component.items as PublicProductCard[]).map((card) => card.name) };
  }

  async function firstShowcaseId(): Promise<string> {
    const sections = (await call('GET', '/api/stores/lessari/sections')).json<Section[]>();
    return sections.flatMap((section) => section.components).find((component) => component.kind === 'PRODUCTS')!.id;
  }

  it('draws every product on the shelf for ALL — never a draft, never one sold out', async () => {
    const { names } = await shelf(await firstShowcaseId());

    expect(names.sort()).toEqual(['Blusa Azul', 'Calça Jeans', 'Regata Lisa']);
  });

  it('draws one category and its subcategory, and names the category for "ver tudo"', async () => {
    const id = await addShowcase({ source: 'CATEGORY', sourceCategoryId: blusas.id });
    const { component, names } = await shelf(id);

    expect(names.sort()).toEqual(['Blusa Azul', 'Regata Lisa']);
    expect(component).toMatchObject({ source: 'CATEGORY', sourceCategory: { slug: 'blusas', name: 'Blusas', description: null } });
  });

  it('draws a pick in the shopkeeper’s order, dropping one that left the shelf', async () => {
    const id = await addShowcase({
      source: 'SELECTION',
      items: [
        { id: 'a', productId: byName['Calça Jeans']!.id },
        { id: 'b', productId: byName['Blusa Rascunho']!.id },
        { id: 'c', productId: byName['Blusa Azul']!.id },
      ],
    });

    expect((await shelf(id)).names).toEqual(['Calça Jeans', 'Blusa Azul']);
  });

  it('draws only what has a higher "was" price for ON_SALE', async () => {
    const id = await addShowcase({ source: 'ON_SALE' });

    expect((await shelf(id)).names.sort()).toEqual(['Calça Jeans', 'Regata Lisa']);
  });

  it('draws the newest first for NEWEST, cut at the limit', async () => {
    const id = await addShowcase({ source: 'NEWEST', limit: 2 });

    // The five were created in this order; the draft and the sold-out one are off the shelf.
    expect((await shelf(id)).names).toEqual(['Calça Jeans', 'Regata Lisa']);
  });

  // Every product on one position, so only the tie-breakers decide.
  it('answers the same order on every read, even when positions tie', async () => {
    await app.get(PrismaService).product.updateMany({ data: { position: 0 } });
    const id = await firstShowcaseId();

    for (let read = 0; read < 3; read += 1) {
      expect((await shelf(id)).names).toEqual(['Blusa Azul', 'Calça Jeans', 'Regata Lisa']);
    }
  });

  it('answers the shop window when a stored pick no longer parses, that showcase empty', async () => {
    const id = await addShowcase({ source: 'SELECTION', items: [{ id: 'a', productId: byName['Blusa Azul']!.id }] });
    await app.get(PrismaService).storeComponent.update({ where: { id }, data: { items: [{ id: 'a', productId: 'nope' }] } });

    const response = await app.inject({ method: 'GET', url: '/api/stores/lessari/public' });

    expect(response.statusCode).toBe(200);
    expect((await shelf(id)).names).toEqual([]);
  });

  it('never serves the ids a pick stores, only the cards it resolves to', async () => {
    const id = await addShowcase({ source: 'SELECTION', items: [{ id: 'escolha', productId: byName['Blusa Azul']!.id }] });
    const { component } = await shelf(id);

    expect(component.items[0]).not.toHaveProperty('productId');
    expect(component.items[0]).toMatchObject({ slug: 'blusa-azul', priceCents: 5000 });
  });
});
