// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, ProductCategory, PublicProductCategory, StorefrontCatalog } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

/** No address street: the service geocodes through a third party the moment one is complete. */
const shopBody = {
  name: 'Lessari',
  slug: 'lessari',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

const BANNER = 'https://cdn.example/banners/ferramentas.png';
const CARD = 'https://cdn.example/cards/ferramentas.png';

/**
 * A category's own banner (BEELINK-307), through the real pipe and database: saved beside the card's
 * picture and apart from it, cleared, served to a visitor, and never another shop's.
 */
describe('catalog — a category\'s banner', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let stranger: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('estranha'));
    await call('POST', '/api/stores', owner, shopBody);
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({
      method,
      url,
      headers: session ? { authorization: `Bearer ${session.accessToken}` } : {},
      ...(payload ? { payload } : {}),
    });
  }

  /** A category with one product on the shelf: a visitor is served no category with nothing in it. */
  async function addCategory(body: object, shop = 'lessari', session = owner): Promise<ProductCategory> {
    const response = await call('POST', `/api/stores/${shop}/product-categories`, session, body);
    if (response.statusCode !== 201) throw new Error(`POST product-categories answered ${response.statusCode}: ${response.payload}`);
    const category = response.json<ProductCategory>();

    const product = await call('POST', `/api/stores/${shop}/products`, session, { name: `Produto de ${category.slug}`, priceCents: 1990, categoryId: category.id, status: 'ACTIVE' });
    if (product.statusCode !== 201) throw new Error(`POST products answered ${product.statusCode}: ${product.payload}`);
    return category;
  }

  async function update(categoryId: string, body: object): Promise<ProductCategory> {
    const response = await call('PUT', `/api/stores/lessari/product-categories/${categoryId}`, owner, body);
    if (response.statusCode !== 200) throw new Error(`PUT product-categories answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductCategory>();
  }

  async function served(shop = 'lessari'): Promise<Map<string, PublicProductCategory>> {
    const response = await app.inject({ method: 'GET', url: `/api/stores/${shop}/catalog` });
    expect(response.statusCode, response.payload).toBe(200);
    return new Map(response.json<StorefrontCatalog>().categories.map((category) => [category.slug, category]));
  }

  it('has none until one is saved, on create or on an update, beside the card\'s picture and apart from it', async () => {
    const plain = await addCategory({ name: 'Tintas' });
    expect(plain.bannerUrl).toBeNull();

    const born = await addCategory({ name: 'Ferramentas', imageUrl: CARD, bannerUrl: BANNER });
    expect(born).toMatchObject({ imageUrl: CARD, bannerUrl: BANNER });

    const given = await update(plain.id, { bannerUrl: 'https://cdn.example/banners/tintas.png' });
    expect(given).toMatchObject({ imageUrl: null, bannerUrl: 'https://cdn.example/banners/tintas.png' });

    const listed = (await call('GET', '/api/stores/lessari/product-categories', owner)).json<ProductCategory[]>();
    expect(listed.find((row) => row.id === born.id)?.bannerUrl).toBe(BANNER);
  });

  it('serves it to a visitor with the catalogue', async () => {
    await addCategory({ name: 'Ferramentas', bannerUrl: BANNER });
    await addCategory({ name: 'Tintas' });

    const categories = await served();

    expect(categories.get('ferramentas')?.bannerUrl).toBe(BANNER);
    expect(categories.get('tintas')?.bannerUrl).toBeNull();
  });

  it('leaves it alone on a patch that does not name it, and clears it on null or a blank', async () => {
    const category = await addCategory({ name: 'Ferramentas', imageUrl: CARD, bannerUrl: BANNER });

    expect(await update(category.id, { name: 'Ferramentas elétricas' })).toMatchObject({ bannerUrl: BANNER, imageUrl: CARD });
    // The card's picture cleared: the banner is another column and stays.
    expect(await update(category.id, { imageUrl: null })).toMatchObject({ bannerUrl: BANNER, imageUrl: null });

    expect((await update(category.id, { bannerUrl: null })).bannerUrl).toBeNull();
    expect((await served()).get('ferramentas-eletricas')?.bannerUrl).toBeNull();

    await update(category.id, { bannerUrl: BANNER });
    expect((await update(category.id, { bannerUrl: '  ' })).bannerUrl).toBeNull();
  });

  it('refuses an address that is not http or https, and keeps what was saved', async () => {
    const category = await addCategory({ name: 'Ferramentas', bannerUrl: BANNER });

    for (const bannerUrl of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'ferramentas.png']) {
      const refused = await call('PUT', `/api/stores/lessari/product-categories/${category.id}`, owner, { bannerUrl });
      expect(refused.statusCode, bannerUrl).toBe(400);
    }

    expect((await served()).get('ferramentas')?.bannerUrl).toBe(BANNER);
  });

  // The page draws a subcategory with no banner under its parent's. The field itself is always the
  // category's own, so the panel's form never shows — or saves — a parent's as the child's.
  it('serves a subcategory its own, or none beside the parent\'s it falls back on', async () => {
    const parent = await addCategory({ name: 'Ferramentas', bannerUrl: BANNER });
    const bare = await addCategory({ name: 'Furadeiras', parentId: parent.id });
    const own = await addCategory({ name: 'Serras', parentId: parent.id, bannerUrl: 'https://cdn.example/banners/serras.png' });

    const categories = await served();

    expect(categories.get('ferramentas')?.bannerUrl).toBe(BANNER);
    expect(categories.get('furadeiras')).toMatchObject({ parentSlug: 'ferramentas', bannerUrl: null });
    expect(categories.get('serras')).toMatchObject({ parentSlug: 'ferramentas', bannerUrl: 'https://cdn.example/banners/serras.png' });

    const listed = (await call('GET', '/api/stores/lessari/product-categories', owner)).json<ProductCategory[]>();
    expect(listed.find((row) => row.id === bare.id)?.bannerUrl).toBeNull();
    expect(listed.find((row) => row.id === own.id)?.bannerUrl).toBe('https://cdn.example/banners/serras.png');
  });

  it('never serves one shop\'s banner in another, nor lets a stranger write it', async () => {
    const ours = await addCategory({ name: 'Ferramentas', bannerUrl: BANNER });
    await call('POST', '/api/stores', stranger, { ...shopBody, name: 'Outra', slug: 'outra' });
    await addCategory({ name: 'Ferramentas' }, 'outra', stranger);

    expect((await served('outra')).get('ferramentas')?.bannerUrl).toBeNull();

    const theirs = 'https://cdn.example/banners/de-outra-loja.png';
    const throughOurs = await call('PUT', `/api/stores/lessari/product-categories/${ours.id}`, stranger, { bannerUrl: theirs });
    const throughTheirs = await call('PUT', `/api/stores/outra/product-categories/${ours.id}`, stranger, { bannerUrl: theirs });
    expect(throughOurs.statusCode).toBe(403);
    expect(throughTheirs.statusCode).toBe(404);
    expect((await served()).get('ferramentas')?.bannerUrl).toBe(BANNER);
  });
});
