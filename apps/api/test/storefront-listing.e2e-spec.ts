// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, ProductCategory, ProductDetail, StorefrontCatalog } from '@harness-monorepo/contracts';

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

describe('the storefront listing, filtered, ordered and faceted', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app.get(PrismaService));
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', shopBody);
    await buildShelf();
  });

  afterAll(async () => {
    await app.close();
  });

  function call(method: 'POST' | 'PUT', url: string, payload: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, payload });
  }

  async function add<T>(url: string, payload: object): Promise<T> {
    const response = await call('POST', url, payload);
    if (response.statusCode !== 201) throw new Error(`POST ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  /**
   * Roupas > Blusas. The blouse is sold in P·Areia, P·Preto and M·Areia (sold out); M·Preto is
   * switched off. The skirt is on sale; the bag's size is written "tamanho: p" in lower case.
   */
  async function buildShelf() {
    const clothes = await add<ProductCategory>('/api/stores/lessari/product-categories', { name: 'Roupas' });
    const blouses = await add<ProductCategory>('/api/stores/lessari/product-categories', { name: 'Blusas', parentId: clothes.id });

    const blouse = await add<ProductDetail>('/api/stores/lessari/products', {
      name: 'Blusa de Crochê',
      priceCents: 18900,
      categoryId: blouses.id,
    });
    const options = await call('PUT', `/api/stores/lessari/products/${blouse.id}/options`, {
      options: [
        { name: 'Tamanho', values: [{ name: 'P' }, { name: 'M' }] },
        { name: 'Cor', values: [{ name: 'Areia', colorHex: '#d9c7a7' }, { name: 'Preto', colorHex: '#1c1917' }] },
      ],
    });
    const [, , mAreia, mPreto] = options.json<ProductDetail>().variants;
    await call('PUT', `/api/stores/lessari/products/${blouse.id}/variants`, {
      variants: [
        { id: mAreia!.id, trackStock: true, stockQuantity: 0 },
        { id: mPreto!.id, isActive: false },
      ],
    });

    await add('/api/stores/lessari/products', {
      name: 'Saia Midi',
      description: 'Feita em croche, à mão',
      priceCents: 9900,
      compareAtPriceCents: 12900,
      categoryId: clothes.id,
    });

    const bag = await add<ProductDetail>('/api/stores/lessari/products', { name: 'Bolsa Amora', priceCents: 24900 });
    await call('PUT', `/api/stores/lessari/products/${bag.id}/options`, {
      options: [{ name: 'tamanho', values: [{ name: 'p' }] }],
    });
  }

  async function shelf(query = ''): Promise<StorefrontCatalog> {
    const response = await app.inject({ method: 'GET', url: `/api/stores/lessari/catalog${query}` });
    if (response.statusCode !== 200) throw new Error(`GET catalog answered ${response.statusCode}: ${response.payload}`);
    return response.json<StorefrontCatalog>();
  }

  const names = (catalog: StorefrontCatalog) => catalog.products.map((product) => product.name);
  const facet = (catalog: StorefrontCatalog, name: string) =>
    Object.fromEntries(
      (catalog.facets.options.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.values ?? []).map((value) => [
        value.label.toLowerCase(),
        [value.count, value.available],
      ]),
    );

  describe('search', () => {
    it('ignores case and accents in both directions', async () => {
      expect(names(await shelf('?busca=BLUSA'))).toEqual(['Blusa de Crochê']);
      expect(names(await shelf('?busca=croche'))).toEqual(['Blusa de Crochê', 'Saia Midi']);
      expect(names(await shelf(`?busca=${encodeURIComponent('crochê')}`))).toEqual(['Blusa de Crochê', 'Saia Midi']);
      expect(names(await shelf(`?busca=${encodeURIComponent('à mão')}`))).toEqual(['Saia Midi']);
    });
  });

  describe('facets', () => {
    it('counts a parent category with its children, and every category with the others filters', async () => {
      const catalog = await shelf('?categoria=blusas');
      const counts = Object.fromEntries(catalog.facets.categories.map((value) => [value.value, [value.count, value.selected]]));

      // The category facet ignores its own filter: Roupas still holds the blouse and the skirt.
      expect(counts).toEqual({ roupas: [2, false], blusas: [1, true] });
      expect(names(catalog)).toEqual(['Blusa de Crochê']);
    });

    it('merges an option spelled two ways, and marks a value nothing can be ordered in', async () => {
      const catalog = await shelf();

      // P: the blouse and the bag ("p"). M: only a sold-out and a switched-off combination.
      expect(facet(catalog, 'Tamanho')).toEqual({ p: [2, true], m: [0, false] });
      expect(facet(catalog, 'Cor')).toEqual({ areia: [1, true], preto: [1, true] });
      expect(catalog.facets.options.find((entry) => entry.name === 'Cor')?.values[0]?.colorHex).toBe('#d9c7a7');
    });

    it('asks one combination to hold every option chosen', async () => {
      expect(names(await shelf('?opcao=Tamanho:P&opcao=Cor:Preto'))).toEqual(['Blusa de Crochê']);
      expect(names(await shelf('?opcao=Tamanho:M'))).toEqual([]);
      expect(names(await shelf('?opcao=Tamanho:P&opcao=Tamanho:M'))).toEqual(['Blusa de Crochê', 'Bolsa Amora']);
    });

    it('counts an option without its own filter and inside the others', async () => {
      const catalog = await shelf('?opcao=Cor:Preto');

      // Tamanho counts inside "Preto": only the blouse has a black P; the bag has no colour.
      expect(facet(catalog, 'Tamanho')).toEqual({ p: [1, true], m: [0, false] });
      // Cor counts without its own filter.
      expect(facet(catalog, 'Cor')).toEqual({ areia: [1, true], preto: [1, true] });
      expect(catalog.facets.options.find((entry) => entry.name === 'Cor')?.values.find((value) => value.value === 'Preto')?.selected).toBe(true);
    });

    it('filters and counts what is on sale, and bounds the price without the price filter', async () => {
      const onSale = await shelf('?desconto=1');
      expect(names(onSale)).toEqual(['Saia Midi']);
      expect(onSale.facets.discount).toEqual({ count: 1, selected: true });

      const priced = await shelf('?precoMin=100&precoMax=200');
      expect(names(priced)).toEqual(['Blusa de Crochê']);
      expect(priced.facets.price).toEqual({ minCents: 9900, maxCents: 24900 });
    });
  });

  describe('order and what is applied', () => {
    it('orders by price both ways, and by the shopkeeper by default', async () => {
      expect(names(await shelf('?ordenar=menor-preco'))).toEqual(['Saia Midi', 'Blusa de Crochê', 'Bolsa Amora']);
      expect(names(await shelf('?ordenar=maior-preco'))).toEqual(['Bolsa Amora', 'Blusa de Crochê', 'Saia Midi']);
      expect((await shelf('?ordenar=inventado')).sort).toBe('relevancia');
    });

    it('lists every filter in force, named as the shop names it', async () => {
      const catalog = await shelf('?categoria=roupas&opcao=tamanho:p&precoMax=300&desconto=1');

      expect(catalog.applied).toEqual([
        { key: 'categoria', value: 'roupas', label: 'Roupas' },
        { key: 'precoMax', value: '300', label: '300' },
        { key: 'desconto', value: '1', label: '1' },
        { key: 'opcao', value: 'Tamanho:P', label: 'Tamanho: P' },
      ]);
    });
  });
});
