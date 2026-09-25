// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, ProductDetail, StorefrontCartProducts } from '@harness-monorepo/contracts';

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

describe('the products a cart names', () => {
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
    await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: shopBody });
  });

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await app.inject({
      method: 'POST',
      url: '/api/stores/lessari/products',
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: body,
    });
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  function cart(ids: string[], store = 'lessari') {
    const query = ids.map((id) => `produto=${encodeURIComponent(id)}`).join('&');
    return app.inject({ method: 'GET', url: `/api/stores/${store}/cart?${query}` });
  }

  it('answers the active products asked for, in the order asked, as their pages show them', async () => {
    const blusa = await addProduct({ name: 'Blusa', priceCents: 5990 });
    const saia = await addProduct({ name: 'Saia', priceCents: 8990, compareAtPriceCents: 9990 });

    const response = await cart([saia.id, blusa.id]);

    expect(response.statusCode).toBe(200);
    const { products } = response.json<StorefrontCartProducts>();
    expect(products.map((product) => product.name)).toEqual(['Saia', 'Blusa']);
    expect(products[0]).toMatchObject({ slug: 'saia', priceCents: 8990, compareAtPriceCents: 9990, soldOut: false });
    expect(products[0]?.variants).toHaveLength(1);
  });

  it('leaves out a draft, an id of nothing and anything that is not an id, without failing', async () => {
    const blusa = await addProduct({ name: 'Blusa', priceCents: 5990 });
    const rascunho = await addProduct({ name: 'Rascunho', priceCents: 1000, status: 'DRAFT' });

    const response = await cart([blusa.id, rascunho.id, '01a0d395-c1ab-7399-a472-000000000000', 'lixo', blusa.id]);

    expect(response.statusCode).toBe(200);
    expect(response.json<StorefrontCartProducts>().products.map((product) => product.name)).toEqual(['Blusa']);
  });

  it('includes a sold-out product, marked, so the cart can say so', async () => {
    const acabou = await addProduct({ name: 'Acabou', priceCents: 1000, trackStock: true, stockQuantity: 0 });

    const { products } = (await cart([acabou.id])).json<StorefrontCartProducts>();

    expect(products[0]).toMatchObject({ name: 'Acabou', soldOut: true });
  });

  it('answers an empty cart with no products, and another shop with 404', async () => {
    expect((await cart([])).json<StorefrontCartProducts>()).toEqual({ products: [] });
    expect((await cart([], 'nao-existe')).statusCode).toBe(404);
  });

  it("never answers another shop's product", async () => {
    const blusa = await addProduct({ name: 'Blusa', priceCents: 5990 });
    const other = await signUpAndSignIn(app, newEmail('outra'));
    await app.inject({
      method: 'POST',
      url: '/api/stores',
      headers: { authorization: `Bearer ${other.accessToken}` },
      payload: { ...shopBody, name: 'Outra', slug: 'outra' },
    });

    expect((await cart([blusa.id], 'outra')).json<StorefrontCartProducts>().products).toEqual([]);
  });
});
