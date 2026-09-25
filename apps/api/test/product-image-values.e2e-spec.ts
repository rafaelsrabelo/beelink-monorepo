// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, ProductDetail, PublicProductDetail } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Lessari',
  slug: 'lessari',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

const photo = (name: string) => `https://res.cloudinary.com/demo/image/upload/${name}.jpg`;

describe('photos that belong to option values', () => {
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

  /** A whey in 900g and 750g, Chocolate and Morango. */
  async function whey(): Promise<ProductDetail> {
    const created = await call('POST', '/api/stores/lessari/products', { name: 'Whey', priceCents: 14990 });
    const product = created.json<ProductDetail>();
    const options = await call('PUT', `/api/stores/lessari/products/${product.id}/options`, {
      options: [
        { name: 'Peso', values: [{ name: '900g' }, { name: '750g' }] },
        { name: 'Sabor', values: [{ name: 'Chocolate' }, { name: 'Morango' }] },
      ],
    });
    return options.json<ProductDetail>();
  }

  const valueId = (product: ProductDetail, name: string) =>
    product.options.flatMap((option) => option.values).find((value) => value.name === name)!.id;

  it('saves the values each photo is of, and serves them to the editor and to the shop window', async () => {
    const product = await whey();
    const morango = valueId(product, 'Morango');
    const g900 = valueId(product, '900g');

    const saved = await call('PUT', `/api/stores/lessari/products/${product.id}`, {
      images: [
        { url: photo('geral') },
        { url: photo('morango'), optionValueIds: [morango] },
        // Sent twice on purpose: a repeat is the same value, not a second row.
        { url: photo('morango-900'), optionValueIds: [morango, g900, g900] },
      ],
    });

    expect(saved.statusCode).toBe(200);
    expect(saved.json<ProductDetail>().images.map((image) => [image.url, image.optionValueIds.toSorted()])).toEqual([
      [photo('geral'), []],
      [photo('morango'), [morango]],
      [photo('morango-900'), [morango, g900].toSorted()],
    ]);

    const page = await app.inject({ method: 'GET', url: '/api/stores/lessari/catalog/whey' });
    expect(page.json<PublicProductDetail>().images[1]?.optionValueIds).toEqual([morango]);
  });

  it('refuses a value of another product, and any value on a product being created', async () => {
    const product = await whey();
    const other = await call('POST', '/api/stores/lessari/products', { name: 'Blusa', priceCents: 9900 });
    const blouse = await call('PUT', `/api/stores/lessari/products/${other.json<ProductDetail>().id}/options`, {
      options: [{ name: 'Tamanho', values: [{ name: 'P' }] }],
    });
    const foreign = valueId(blouse.json<ProductDetail>(), 'P');

    const refused = await call('PUT', `/api/stores/lessari/products/${product.id}`, {
      images: [{ url: photo('morango'), optionValueIds: [valueId(product, 'Morango'), foreign] }],
    });
    expect(refused.statusCode).toBe(404);
    expect(refused.json<ApiErrorBody>().errorCode).toBe('PRODUCT_OPTION_NOT_FOUND');

    const created = await call('POST', '/api/stores/lessari/products', {
      name: 'Novo',
      priceCents: 100,
      images: [{ url: photo('novo'), optionValueIds: [foreign] }],
    });
    expect(created.statusCode).toBe(404);
  });

  it('keeps the photo when its value is removed, and it becomes a photo of every combination', async () => {
    const product = await whey();
    await call('PUT', `/api/stores/lessari/products/${product.id}`, {
      images: [{ url: photo('morango'), optionValueIds: [valueId(product, 'Morango')] }],
    });

    const peso = product.options[0]!;
    const sabor = product.options[1]!;
    const withoutMorango = await call('PUT', `/api/stores/lessari/products/${product.id}/options`, {
      options: [
        { id: peso.id, name: peso.name, values: peso.values.map(({ id, name }) => ({ id, name })) },
        { id: sabor.id, name: sabor.name, values: [{ id: valueId(product, 'Chocolate'), name: 'Chocolate' }] },
      ],
    });

    expect(withoutMorango.json<ProductDetail>().images).toEqual([
      expect.objectContaining({ url: photo('morango'), optionValueIds: [] }),
    ]);
  });
});
