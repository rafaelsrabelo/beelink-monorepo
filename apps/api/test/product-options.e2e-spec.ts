// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  ProductDetail,
  ProductOptionPayload,
  ProductVariantPayload,
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

describe('the variations editor’s endpoints', () => {
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
    await call('POST', '/api/stores', shopBody);
  });

  function call(method: 'GET' | 'POST' | 'PUT', url: string, payload?: object) {
    return app.inject({
      method,
      url,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      ...(payload ? { payload } : {}),
    });
  }

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await call('POST', '/api/stores/lessari/products', body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  async function putOptions(product: { id: string }, options: ProductOptionPayload[]) {
    return call('PUT', `/api/stores/lessari/products/${product.id}/options`, { options });
  }

  async function putVariants(product: { id: string }, variants: ProductVariantPayload[]) {
    return call('PUT', `/api/stores/lessari/products/${product.id}/variants`, { variants });
  }

  async function withOptions(product: { id: string }, options: ProductOptionPayload[]): Promise<ProductDetail> {
    const response = await putOptions(product, options);
    if (response.statusCode !== 200) throw new Error(`PUT options answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  /** "P · Areia" for a variant, from the detail's own options. */
  function labelsOf(detail: ProductDetail): string[] {
    const names = new Map(detail.options.flatMap((option) => option.values.map((value) => [value.id, value.name])));
    return detail.variants.map((variant) => variant.optionValueIds.map((id) => names.get(id)).join(' · '));
  }

  const sizes = (...names: string[]) => ({ name: 'Tamanho', values: names.map((name) => ({ name })) });

  describe('PUT options', () => {
    it('turns the default variant into the first combination, keeping its price, stock and code', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900, sku: 'BLS', trackStock: true, stockQuantity: 4 });

      const detail = await withOptions(product, [sizes('P', 'M')]);

      expect(labelsOf(detail)).toEqual(['P', 'M']);
      expect(detail.variants[0]).toMatchObject({ id: product.variants[0]!.id, priceCents: 18900, sku: 'BLS', stockQuantity: 4 });
      // A new combination is priced like its neighbour, but its code and stock are its own.
      expect(detail.variants[1]).toMatchObject({ priceCents: 18900, sku: null, trackStock: true, stockQuantity: 0 });
    });

    it('keeps the combinations that survive a removed value, with their data, and archives the other', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const withSizes = await withOptions(product, [sizes('P', 'M', 'G')]);
      const [small, medium] = withSizes.variants;
      await putVariants(product, [{ id: medium!.id, priceCents: 19900, sku: 'BLS-M' }]);
      const [p, m, g] = withSizes.options[0]!.values;

      const detail = await withOptions(product, [
        { id: withSizes.options[0]!.id, name: 'Tamanho', values: [{ id: p!.id, name: 'P' }, { id: m!.id, name: 'M' }] },
      ]);

      expect(labelsOf(detail)).toEqual(['P', 'M']);
      expect(detail.variants.map((variant) => variant.id)).toEqual([small!.id, medium!.id]);
      expect(detail.variants[1]).toMatchObject({ priceCents: 19900, sku: 'BLS-M' });
      const archived = await prisma.productVariant.findMany({ where: { productId: product.id, archivedAt: { not: null } } });
      expect(archived).toHaveLength(1);
      expect(archived[0]).toMatchObject({ isActive: false, sku: null });
      expect(g).toBeDefined();
    });

    it('extends every variant with the first value of a new option', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const withSizes = await withOptions(product, [sizes('P', 'M')]);
      const [small, medium] = withSizes.variants;
      await putVariants(product, [{ id: medium!.id, priceCents: 19900 }]);

      const detail = await withOptions(product, [
        { id: withSizes.options[0]!.id, name: 'Tamanho', values: withSizes.options[0]!.values },
        { name: 'Cor', values: [{ name: 'Areia', colorHex: '#d9c7a7' }, { name: 'Preto', colorHex: '#1c1917' }] },
      ]);

      expect(labelsOf(detail)).toEqual(['P · Areia', 'P · Preto', 'M · Areia', 'M · Preto']);
      expect(detail.variants[0]!.id).toBe(small!.id);
      expect(detail.variants[2]).toMatchObject({ id: medium!.id, priceCents: 19900 });
      expect(detail.variants[3]!.priceCents).toBe(19900);
      expect(detail.options[1]!.values[0]!.colorHex).toBe('#d9c7a7');
    });

    it('collapses back to one default variant when the last option goes', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const withSizes = await withOptions(product, [sizes('P', 'M')]);

      const detail = await withOptions(product, []);

      expect(detail.options).toEqual([]);
      expect(detail.variants).toHaveLength(1);
      expect(detail.variants[0]).toMatchObject({ id: withSizes.variants[0]!.id, optionValueIds: [] });
    });

    it('refuses more than three options', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const option = (name: string) => ({ name, values: [{ name: 'Um' }] });

      const response = await putOptions(product, [option('A'), option('B'), option('C'), option('D')]);

      expect(response.statusCode).toBe(400);
      expect(await prisma.productOption.count()).toBe(0);
    });

    it('refuses options that would make more than 100 combinations', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const many = (name: string, count: number) => ({
        name,
        values: Array.from({ length: count }, (_, index) => ({ name: `${name} ${index}` })),
      });

      const response = await putOptions(product, [many('Tamanho', 11), many('Cor', 10)]);

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_VARIANTS_LIMIT');
    });

    it('refuses two values with one name in an option, whatever their case', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });

      const response = await putOptions(product, [sizes('P', ' p ')]);

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_OPTION_DUPLICATE');
    });

    it('refuses an option of another product', async () => {
      const other = await withOptions(await addProduct({ name: 'Saia', priceCents: 9900 }), [sizes('P')]);
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });

      const response = await putOptions(product, [{ id: other.options[0]!.id, name: 'Tamanho', values: [{ name: 'P' }] }]);

      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_OPTION_NOT_FOUND');
    });

    it('lets the editor save a rename with the product’s own price, once it has options', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const detail = await withOptions(product, [sizes('P', 'M')]);

      const response = await call('PUT', `/api/stores/lessari/products/${product.id}`, {
        name: 'Blusa de alça',
        priceCents: detail.priceCents,
        trackStock: detail.trackStock,
        stockQuantity: detail.stockQuantity,
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('PUT variants', () => {
    it('writes several variants at once and recomputes the product from them', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const detail = await withOptions(product, [sizes('P', 'M', 'G')]);
      const [p, m, g] = detail.variants;

      const response = await putVariants(product, [
        { id: p!.id, priceCents: 17900, trackStock: true, stockQuantity: 2 },
        { id: m!.id, priceCents: 15900, trackStock: true, stockQuantity: 3 },
        { id: g!.id, isActive: false, priceCents: 9900 },
      ]);

      expect(response.statusCode).toBe(200);
      // The cheapest on sale, and the stock of what is on sale — the switched-off G counts for neither.
      expect(response.json<ProductDetail>()).toMatchObject({ priceCents: 15900, trackStock: true, stockQuantity: 5 });
    });

    it('refuses a code another product of the shop uses, with a stable code', async () => {
      await addProduct({ name: 'Saia', priceCents: 9900, sku: 'SAIA-P' });
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const detail = await withOptions(product, [sizes('P', 'M')]);

      const response = await putVariants(product, [{ id: detail.variants[0]!.id, sku: 'SAIA-P' }]);

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SKU_TAKEN');
    });

    it('refuses one code for two variants of the product', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const detail = await withOptions(product, [sizes('P', 'M')]);

      const response = await putVariants(product, [
        { id: detail.variants[0]!.id, sku: 'BLS' },
        { id: detail.variants[1]!.id, sku: 'BLS' },
      ]);

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SKU_TAKEN');
    });

    it('lets two variants trade codes in one save', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const detail = await withOptions(product, [sizes('P', 'M')]);
      const [p, m] = detail.variants;
      await putVariants(product, [{ id: p!.id, sku: 'BLS-P' }, { id: m!.id, sku: 'BLS-M' }]);

      const response = await putVariants(product, [{ id: p!.id, sku: 'BLS-M' }, { id: m!.id, sku: 'BLS-P' }]);

      expect(response.statusCode).toBe(200);
      expect(response.json<ProductDetail>().variants.map((variant) => variant.sku)).toEqual(['BLS-M', 'BLS-P']);
    });

    it('frees the code of an archived variant for what replaced it', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const detail = await withOptions(product, [sizes('P', 'M')]);
      await putVariants(product, [{ id: detail.variants[1]!.id, sku: 'BLS-M' }]);
      await withOptions(product, [{ id: detail.options[0]!.id, name: 'Tamanho', values: [detail.options[0]!.values[0]!] }]);
      const again = await withOptions(product, [
        { id: detail.options[0]!.id, name: 'Tamanho', values: [detail.options[0]!.values[0]!, { name: 'M' }] },
      ]);

      const response = await putVariants(product, [{ id: again.variants[1]!.id, sku: 'BLS-M' }]);

      expect(response.statusCode).toBe(200);
    });

    it('refuses a negative price and a "was" price at or below the price', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const [variant] = product.variants;

      const negative = await putVariants(product, [{ id: variant!.id, priceCents: -1 }]);
      const notADiscount = await putVariants(product, [{ id: variant!.id, compareAtPriceCents: 18900 }]);

      expect(negative.statusCode).toBe(400);
      expect(notADiscount.statusCode).toBe(400);
      expect(notADiscount.json<ApiErrorBody>().errorCode).toBe('CATALOG_PRICE_INVALID');
    });

    it('refuses more than 100 variants in one save', async () => {
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });
      const ids = Array.from({ length: 101 }, (_, index) => `0199a0f1-0000-7000-8000-${String(index).padStart(12, '0')}`);

      const response = await putVariants(product, ids.map((id) => ({ id, priceCents: 100 })));

      expect(response.statusCode).toBe(400);
    });

    it('refuses a variant of another product', async () => {
      const other = await addProduct({ name: 'Saia', priceCents: 9900 });
      const product = await addProduct({ name: 'Blusa', priceCents: 18900 });

      const response = await putVariants(product, [{ id: other.variants[0]!.id, priceCents: 1 }]);

      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_VARIANT_NOT_FOUND');
    });
  });

  it('documents both endpoints in Swagger, with the product detail as the answer', () => {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().addBearerAuth().build());

    for (const route of ['options', 'variants']) {
      const put = document.paths[`/api/stores/{storeSlug}/products/{productId}/${route}`]?.put;
      expect(put?.summary).toBeTruthy();
      expect(JSON.stringify(put?.responses['200'])).toContain('ProductDetailResponse');
    }
  });
});
