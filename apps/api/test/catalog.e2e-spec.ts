// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  Product,
  ProductCategory,
  ProductPage,
  Store,
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

describe('catalog', () => {
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
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('estranha'));
    await call('POST', '/api/stores', owner, shopBody);
  });

  function call(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    session?: AuthSession,
    payload?: object,
  ) {
    return app.inject({
      method,
      url,
      headers: session ? { authorization: `Bearer ${session.accessToken}` } : {},
      ...(payload ? { payload } : {}),
    });
  }

  async function addCategory(body: object): Promise<ProductCategory> {
    const response = await call('POST', '/api/stores/lessari/product-categories', owner, body);
    if (response.statusCode !== 201) {
      throw new Error(`POST product-categories answered ${response.statusCode}: ${response.payload}`);
    }
    return response.json<ProductCategory>();
  }

  async function addProduct(body: object): Promise<Product> {
    const response = await call('POST', '/api/stores/lessari/products', owner, body);
    if (response.statusCode !== 201) {
      throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    }
    return response.json<Product>();
  }

  // The rule the legacy left to a Supabase policy that read `auth.role() = 'authenticated'` — which
  // let any signed-in person edit any shop's products. This is that hole as a regression guard.
  describe('a shopkeeper cannot reach another shopkeeper’s catalogue', () => {
    it('refuses a stranger every verb, and changes nothing', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990 });

      const list = await call('GET', '/api/stores/lessari/products', stranger);
      const create = await call('POST', '/api/stores/lessari/products', stranger, {
        name: 'Invasora',
        priceCents: 100,
      });
      const update = await call('PUT', `/api/stores/lessari/products/${product.id}`, stranger, {
        priceCents: 1,
      });
      const remove = await call('DELETE', `/api/stores/lessari/products/${product.id}`, stranger);

      expect([list, create, update, remove].map((r) => r.statusCode)).toEqual([403, 403, 403, 403]);
      expect(list.json<ApiErrorBody>().errorCode).toBe('STORE_FORBIDDEN');

      // A page and not a bare list since the panel's list learned to filter and page.
      const mine = await call('GET', '/api/stores/lessari/products', owner);
      expect(mine.json<ProductPage>().products).toHaveLength(1);
      expect(mine.json<ProductPage>().products[0]?.priceCents).toBe(4990);
    });

    it('answers 401 with no bearer token at all', async () => {
      const anonymous = await call('GET', '/api/stores/lessari/products');

      expect(anonymous.statusCode).toBe(401);
    });
  });

  describe('the segment a category takes', () => {
    it('derives it from the name, folding accents rather than dropping them', async () => {
      const category = await addCategory({ name: 'Promoção' });

      expect(category.slug).toBe('promocao');
    });

    it('normalises an explicit segment instead of refusing it', async () => {
      const category = await addCategory({ name: 'Blusas', slug: 'Blusas!' });

      expect(category.slug).toBe('blusas');
    });

    it('refuses a word the shop’s own addresses use, in either vocabulary', async () => {
      // A category on `produtos` would be unreachable: the resolver reads the segment as a route
      // word before it looks for a category. `products` is refused too, so switching the shop's
      // vocabulary later can never collide with a category it already has.
      const pt = await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'produtos' });
      const en = await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'products' });

      expect(pt.statusCode).toBe(400);
      expect(pt.json<ApiErrorBody>().errorCode).toBe('CATALOG_SLUG_RESERVED');
      expect(en.statusCode).toBe(400);
    });

    it('refuses a second category on a segment this shop already uses', async () => {
      await addCategory({ name: 'Blusas' });

      const again = await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'blusas' });

      expect(again.statusCode).toBe(409);
      expect(again.json<ApiErrorBody>().errorCode).toBe('PRODUCT_CATEGORY_SLUG_TAKEN');
    });

    it('lets another shop take the same segment', async () => {
      await addCategory({ name: 'Blusas' });
      await call('POST', '/api/stores', stranger, { ...shopBody, name: 'Outra', slug: 'outra' });

      const theirs = await call('POST', '/api/stores/outra/product-categories', stranger, { name: 'Blusas' });

      expect(theirs.statusCode).toBe(201);
    });
  });

  describe('renaming keeps the old address working', () => {
    it('records the previous segment so a shared link can redirect', async () => {
      const product = await addProduct({ name: 'Blusa Azul', priceCents: 4990 });
      expect(product.slug).toBe('blusa-azul');

      await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { name: 'Blusa Marinho' });

      const stored = await app
        .get(PrismaService)
        .product.findUniqueOrThrow({ where: { id: product.id }, select: { slug: true, slugHistory: true } });

      expect(stored.slug).toBe('blusa-marinho');
      expect(stored.slugHistory).toEqual(['blusa-azul']);
    });

    it('never leaves a live segment in the history as well', async () => {
      const product = await addProduct({ name: 'Blusa Azul', priceCents: 4990 });
      await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { name: 'Blusa Marinho' });
      await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { name: 'Blusa Azul' });

      const stored = await app
        .get(PrismaService)
        .product.findUniqueOrThrow({ where: { id: product.id }, select: { slug: true, slugHistory: true } });

      expect(stored.slug).toBe('blusa-azul');
      expect(stored.slugHistory).not.toContain('blusa-azul');
    });
  });

  describe('money', () => {
    it('keeps whole cents exactly, with no heuristic anywhere near it', async () => {
      // The legacy decided between reais and cents with `if (price < 1000)`, which is why a product
      // could be sold for a hundredth of its price. Five reais is 500, and stays 500.
      const cheap = await addProduct({ name: 'Meia', priceCents: 500 });
      const dear = await addProduct({ name: 'Casaco', priceCents: 129900 });

      expect(cheap.priceCents).toBe(500);
      expect(dear.priceCents).toBe(129900);
    });

    it('refuses a "was" price that is not above the price', async () => {
      const refused = await call('POST', '/api/stores/lessari/products', owner, {
        name: 'Blusa',
        priceCents: 4990,
        compareAtPriceCents: 4990,
      });

      expect(refused.statusCode).toBe(400);
      expect(refused.json<ApiErrorBody>().errorCode).toBe('CATALOG_PRICE_INVALID');
    });

    it('refuses a price that is not a whole number', async () => {
      const refused = await call('POST', '/api/stores/lessari/products', owner, {
        name: 'Blusa',
        priceCents: 49.9,
      });

      expect(refused.statusCode).toBe(400);
    });
  });

  describe('the order the shopkeeper chose', () => {
    it('puts a new row last, where they just added it', async () => {
      await addCategory({ name: 'Blusas' });
      await addCategory({ name: 'Calças' });

      const list = await call('GET', '/api/stores/lessari/product-categories', owner);

      expect(list.json<ProductCategory[]>().map((c) => c.slug)).toEqual(['blusas', 'calcas']);
    });

    it('reorders the whole list in one request', async () => {
      const first = await addCategory({ name: 'Blusas' });
      const second = await addCategory({ name: 'Calças' });

      const reordered = await call('PUT', '/api/stores/lessari/product-categories/reorder', owner, {
        ids: [second.id, first.id],
      });

      expect(reordered.statusCode).toBe(200);
      expect(reordered.json<ProductCategory[]>().map((c) => c.slug)).toEqual(['calcas', 'blusas']);
    });

    it('refuses a partial list, which would leave two rows sharing a position', async () => {
      const first = await addCategory({ name: 'Blusas' });
      await addCategory({ name: 'Calças' });

      const refused = await call('PUT', '/api/stores/lessari/product-categories/reorder', owner, {
        ids: [first.id],
      });

      expect(refused.statusCode).toBe(409);
      expect(refused.json<ApiErrorBody>().errorCode).toBe('CATALOG_REORDER_MISMATCH');
    });
  });

  describe('a category and the things in it', () => {
    it('un-files the products instead of deleting them', async () => {
      const category = await addCategory({ name: 'Blusas' });
      const product = await addProduct({ name: 'Blusa Azul', priceCents: 4990, categoryId: category.id });
      expect(product.category?.slug).toBe('blusas');

      const removed = await call('DELETE', `/api/stores/lessari/product-categories/${category.id}`, owner);
      expect(removed.statusCode).toBe(204);

      const survivor = await call('GET', `/api/stores/lessari/products/${product.id}`, owner);
      expect(survivor.statusCode).toBe(200);
      expect(survivor.json<Product>().category).toBeNull();
    });

    it('refuses a category that belongs to another shop', async () => {
      await call('POST', '/api/stores', stranger, { ...shopBody, name: 'Outra', slug: 'outra' });
      const theirs = await call('POST', '/api/stores/outra/product-categories', stranger, { name: 'Blusas' });
      const theirCategory = theirs.json<ProductCategory>();

      const refused = await call('POST', '/api/stores/lessari/products', owner, {
        name: 'Blusa',
        priceCents: 4990,
        categoryId: theirCategory.id,
      });

      expect(refused.statusCode).toBe(404);
      expect(refused.json<ApiErrorBody>().errorCode).toBe('PRODUCT_CATEGORY_NOT_FOUND');
    });
  });

  describe('what a shipping quote and a payment will need', () => {
    it('keeps stock and the parcel as whole numbers on the owner\u2019s shape', async () => {
      const product = await addProduct({
        name: 'Blusa',
        priceCents: 4990,
        costCents: 2200,
        sku: 'BLU-001',
        barcode: '7891234567890',
        trackStock: true,
        stockQuantity: 12,
        weightGrams: 350,
        lengthMm: 300,
        widthMm: 220,
        heightMm: 40,
      });

      expect(product.trackStock).toBe(true);
      expect(product.stockQuantity).toBe(12);
      expect(product.weightGrams).toBe(350);
      expect(product.sku).toBe('BLU-001');
      expect(product.costCents).toBe(2200);
    });

    // What a shop paid is not the shop window's business, and anything on the public shape lands
    // in Google's index.
    it('keeps the cost off the shape a visitor is served', async () => {
      await addProduct({ name: 'Blusa', priceCents: 4990, costCents: 2200 });

      const shopWindow = await call('GET', '/api/stores/lessari/catalog');

      expect(shopWindow.statusCode).toBe(200);
      expect(shopWindow.payload).not.toContain('costCents');
      expect(shopWindow.payload).not.toContain('2200');
    });

    it('refuses two sides of a box, which no carrier can quote', async () => {
      const refused = await call('POST', '/api/stores/lessari/products', owner, {
        name: 'Blusa',
        priceCents: 4990,
        lengthMm: 300,
        widthMm: 220,
      });

      expect(refused.statusCode).toBe(400);
      expect(refused.json<ApiErrorBody>().errorCode).toBe('CATALOG_PARCEL_INCOMPLETE');
    });

    it('accepts the third side on a product that already has two', async () => {
      const product = await addProduct({
        name: 'Blusa',
        priceCents: 4990,
        lengthMm: 300,
        widthMm: 220,
        heightMm: 40,
      });

      // A patch is judged against what the row will hold, not against what the request carried.
      const changed = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, {
        heightMm: 50,
      });

      expect(changed.statusCode).toBe(200);
      expect(changed.json<Product>().heightMm).toBe(50);
    });
  });

  describe('a product’s photos', () => {
    it('keeps the order sent, and the first is the card’s image', async () => {
      const product = await addProduct({
        name: 'Blusa',
        priceCents: 4990,
        images: [
          { url: 'https://res.cloudinary.com/demo/a.jpg', alt: 'de frente' },
          { url: 'https://res.cloudinary.com/demo/b.jpg' },
        ],
      });

      expect(product.images.map((i) => i.url)).toEqual([
        'https://res.cloudinary.com/demo/a.jpg',
        'https://res.cloudinary.com/demo/b.jpg',
      ]);
      expect(product.imageUrl).toBe('https://res.cloudinary.com/demo/a.jpg');
      expect(product.images[0]?.alt).toBe('de frente');
    });

    it('replaces the gallery when images are sent, and leaves it when they are not', async () => {
      const product = await addProduct({
        name: 'Blusa',
        priceCents: 4990,
        images: [{ url: 'https://res.cloudinary.com/demo/a.jpg' }],
      });

      await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { name: 'Blusa Nova' });
      const untouched = await call('GET', `/api/stores/lessari/products/${product.id}`, owner);
      expect(untouched.json<Product>().images).toHaveLength(1);

      await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { images: [] });
      const cleared = await call('GET', `/api/stores/lessari/products/${product.id}`, owner);
      expect(cleared.json<Product>().images).toEqual([]);
    });
  });
});
