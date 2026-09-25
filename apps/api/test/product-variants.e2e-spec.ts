// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Product, ProductPage } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** No address street: the service geocodes through a third party the moment one is complete. */
function shopBody(slug: string) {
  return {
    name: slug,
    slug,
    type: 'ECOMMERCE',
    socialNetworks: { whatsapp: '(11) 99999-8888' },
    address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
  };
}

describe('product variants', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({
      method,
      url,
      headers: session ? { authorization: `Bearer ${session.accessToken}` } : {},
      ...(payload ? { payload } : {}),
    });
  }

  async function addProduct(body: object, shop = 'lessari'): Promise<Product> {
    const response = await call('POST', `/api/stores/${shop}/products`, owner, body);
    if (response.statusCode !== 201) {
      throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    }
    return response.json<Product>();
  }

  function variantsOf(productId: string) {
    return prisma.productVariant.findMany({ where: { productId }, orderBy: { position: 'asc' } });
  }

  /** A product with one option of two values, written the way the variations editor will. */
  async function giveOptions(product: Product): Promise<void> {
    const option = await prisma.productOption.create({
      data: { productId: product.id, name: 'Tamanho', values: { create: [{ name: 'P' }, { name: 'M', position: 1 }] } },
      include: { values: true },
    });
    const [small, medium] = option.values;
    const [base] = await variantsOf(product.id);

    await prisma.productVariantValue.create({ data: { variantId: base!.id, optionId: option.id, valueId: small!.id } });
    await prisma.productVariant.create({
      data: {
        productId: product.id,
        storeId: base!.storeId,
        position: 1,
        priceCents: 5990,
        sku: 'BLS-M',
        values: { create: [{ optionId: option.id, valueId: medium!.id }] },
      },
    });
  }

  describe('every product sells a variant', () => {
    it('creates the default variant with the values sent for the product', async () => {
      const product = await addProduct({
        name: 'Whey',
        priceCents: 4990,
        compareAtPriceCents: 5990,
        costCents: 2000,
        sku: 'WH-900',
        barcode: '0789',
        trackStock: true,
        stockQuantity: 7,
        weightGrams: 900,
        lengthMm: 100,
        widthMm: 100,
        heightMm: 200,
      });

      const variants = await variantsOf(product.id);
      expect(variants).toHaveLength(1);
      expect(variants[0]).toMatchObject({
        isActive: true,
        priceCents: 4990,
        compareAtPriceCents: 5990,
        costCents: 2000,
        sku: 'WH-900',
        barcode: '0789',
        trackStock: true,
        stockQuantity: 7,
        weightGrams: 900,
        lengthMm: 100,
        widthMm: 100,
        heightMm: 200,
      });
    });

    it('writes an edited price or stock to the default variant, and the product reads it back', async () => {
      const product = await addProduct({ name: 'Whey', priceCents: 4990 });

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, {
        priceCents: 3990,
        trackStock: true,
        stockQuantity: 0,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<Product>()).toMatchObject({ priceCents: 3990, trackStock: true, stockQuantity: 0 });
      const [variant] = await variantsOf(product.id);
      expect(variant).toMatchObject({ priceCents: 3990, trackStock: true, stockQuantity: 0 });
    });

    it('leaves the variant alone on an edit that touches no price, stock or code', async () => {
      const product = await addProduct({ name: 'Whey', priceCents: 4990, sku: 'WH-900' });
      const [before] = await variantsOf(product.id);

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { name: 'Whey 900 g' });

      expect(response.statusCode).toBe(200);
      expect(response.json<Product>().name).toBe('Whey 900 g');
      const [after] = await variantsOf(product.id);
      expect(after?.updatedAt).toEqual(before?.updatedAt);
    });

    it('writes a stock edit to a default variant the shop switched off', async () => {
      const product = await addProduct({ name: 'Whey', priceCents: 4990, trackStock: true, stockQuantity: 7 });
      const [base] = await variantsOf(product.id);
      await prisma.productVariant.update({ where: { id: base!.id }, data: { isActive: false } });

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, {
        trackStock: true,
        stockQuantity: 0,
      });

      expect(response.statusCode).toBe(200);
      const [after] = await variantsOf(product.id);
      expect(after?.stockQuantity).toBe(0);
    });

    it('reads a null price as not sent, as it did before variants', async () => {
      const product = await addProduct({ name: 'Whey', priceCents: 4990 });

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, {
        priceCents: null,
        name: 'Whey 900 g',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<Product>().priceCents).toBe(4990);
    });
  });

  describe('a code names one variant in a shop', () => {
    it('refuses a second product with a code the shop already uses', async () => {
      await addProduct({ name: 'Whey', priceCents: 4990, sku: 'WH-900' });

      const response = await call('POST', '/api/stores/lessari/products', owner, {
        name: 'Outro whey',
        priceCents: 4990,
        sku: 'WH-900',
      });

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SKU_TAKEN');
      expect(await prisma.product.count()).toBe(1);
    });

    it('refuses an edit to a code another product uses, and keeps the edit out', async () => {
      await addProduct({ name: 'Whey', priceCents: 4990, sku: 'WH-900' });
      const other = await addProduct({ name: 'Creatina', priceCents: 2990, sku: 'CR-300' });

      const response = await call('PUT', `/api/stores/lessari/products/${other.id}`, owner, {
        name: 'Creatina pura',
        sku: 'WH-900',
      });

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SKU_TAKEN');
      const unchanged = await call('GET', `/api/stores/lessari/products/${other.id}`, owner);
      expect(unchanged.json<Product>()).toMatchObject({ name: 'Creatina', sku: 'CR-300' });
    });

    it('still answers a taken address as the address, not the code', async () => {
      await addProduct({ name: 'Whey', priceCents: 4990 });

      const response = await call('POST', '/api/stores/lessari/products', owner, {
        name: 'Whey',
        priceCents: 4990,
        slug: 'whey',
      });

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SLUG_TAKEN');
    });

    it('lets another shop use the same code, and any number of products have none', async () => {
      await call('POST', '/api/stores', owner, shopBody('bewave'));
      await addProduct({ name: 'Whey', priceCents: 4990, sku: 'WH-900' });

      await expect(addProduct({ name: 'Whey', priceCents: 4990, sku: 'WH-900' }, 'bewave')).resolves.toBeDefined();
      await expect(addProduct({ name: 'Sem código', priceCents: 100 })).resolves.toBeDefined();
      await expect(addProduct({ name: 'Também sem', priceCents: 100 })).resolves.toBeDefined();
    });

    it('finds a product by the code of any of its variants', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990, sku: 'BLS-P' });
      await giveOptions(product);

      const response = await call('GET', '/api/stores/lessari/products?search=bls-m', owner);

      expect(response.json<ProductPage>().products.map((row) => row.id)).toEqual([product.id]);
    });
  });

  describe('a product with options', () => {
    it('says the product has options before judging the price sent', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990, compareAtPriceCents: 5990 });
      await giveOptions(product);

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { priceCents: 6000 });

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_HAS_OPTIONS');
    });

    it('refuses a price sent for the whole product', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990 });
      await giveOptions(product);

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { priceCents: 1 });

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_HAS_OPTIONS');
      expect((await variantsOf(product.id)).map((variant) => variant.priceCents)).toEqual([4990, 5990]);
    });

    it('still takes an edit to its name', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990 });
      await giveOptions(product);

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, owner, { name: 'Blusa de alça' });

      expect(response.statusCode).toBe(200);
      expect(response.json<Product>().name).toBe('Blusa de alça');
    });

    it('holds at most three options, whatever writes them', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990 });
      const option = (position: number) => ({ productId: product.id, name: `Opção ${position}`, position });

      await prisma.productOption.createMany({ data: [option(0), option(1), option(2)] });

      await expect(prisma.productOption.create({ data: option(3) })).rejects.toThrow(/at most 3 options/);
      expect(await prisma.productOption.count({ where: { productId: product.id } })).toBe(3);
    });

    it('holds the line when two writers add options at the same time', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990 });
      const addTwo = (label: string) =>
        prisma.$transaction(async (tx) => {
          await tx.productOption.createMany({
            data: [0, 1].map((position) => ({ productId: product.id, name: `${label} ${position}`, position })),
          });
          // Both hold uncommitted options before either commits.
          await new Promise((resolve) => setTimeout(resolve, 200));
        });

      const outcomes = await Promise.allSettled([addTwo('A'), addTwo('B')]);

      expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
      expect(await prisma.productOption.count({ where: { productId: product.id } })).toBe(2);
    });

    it('files a value only under its own option', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 4990 });
      await giveOptions(product);
      const colour = await prisma.productOption.create({
        data: { productId: product.id, name: 'Cor', position: 1, values: { create: [{ name: 'Areia' }] } },
        include: { values: true },
      });
      const size = await prisma.productOption.findFirstOrThrow({ where: { productId: product.id, name: 'Tamanho' } });
      const [variant] = await variantsOf(product.id);

      await expect(
        prisma.productVariantValue.create({
          data: { variantId: variant!.id, optionId: size.id, valueId: colour.values[0]!.id },
        }),
      ).rejects.toThrow();
    });
  });
});
