// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Order, OrderQuote, OrderStockDetails, ProductDetail, PublicProductDetail, StorefrontKitParts } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

/** Plan 2026-11-10--kits-monte-seu-kit: a kit is put together from a category, at its own price. */
describe('kits', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let dindins: string;
  let outros: string;
  let ninho: string;
  let pacoca: string;
  let whey: string;
  let kit: ProductDetail;
  let kitVariant: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('leia'));
    await call('POST', '/api/stores', owner, shopBody('lessari'));
    dindins = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Dindins' })).json<{ id: string }>().id;
    outros = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Outros' })).json<{ id: string }>().id;
    ninho = await variantOf(await addProduct({ name: 'Ninho com Nutella', priceCents: 700, categoryId: dindins }));
    pacoca = await variantOf(await addProduct({ name: 'Paçoquinha', priceCents: 1020, categoryId: dindins }));
    whey = await variantOf(await addProduct({ name: 'Whey', priceCents: 8990, categoryId: outros }));
    // Its stock switched on as it is created: a kit keeps none of its own, whatever was asked.
    kit = await addProduct({ name: 'Kit Festa', priceCents: 1990, trackStock: true, stockQuantity: 3, kit: { size: 3, scope: 'ONLY', categoryIds: [dindins] } });
    kitVariant = await variantOf(kit);
    await prisma.productVariant.update({ where: { id: ninho }, data: { trackStock: true, stockQuantity: 5 } });
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await call('POST', '/api/stores/lessari/products', owner, body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  async function variantOf(product: { id: string }): Promise<string> {
    return (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  }

  const stockOf = async (variantId: string) => (await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stockQuantity;

  function place(items: object[]) {
    return call('POST', '/api/stores/lessari/orders', owner, { customer: { name: 'Bia Souza', phone: '(11) 98888-7777' }, items, fulfillment: 'PICKUP', paymentMethod: 'PIX' });
  }

  const threeKit = (quantity = 1) => ({ variantId: kitVariant, quantity, kit: [{ variantId: ninho, quantity: 2 }, { variantId: pacoca, quantity: 1 }] });

  it('makes a product a kit — its size and rule — with no stock of its own, and tells the shop window how many to pick', async () => {
    expect(kit.kit).toEqual({ size: 3, scope: 'ONLY', categoryIds: [dindins] });
    expect(kit.trackStock).toBe(false);

    const page = (await call('GET', `/api/stores/lessari/catalog/${kit.slug}`)).json<PublicProductDetail>();
    expect(page.kit).toEqual({ size: 3 });
    // No card adds a kit without a choice.
    const listing = (await call('GET', '/api/stores/lessari/catalog')).json<{ products: { slug: string; hasOptions?: boolean }[] }>();
    expect(listing.products.find((product) => product.slug === kit.slug)?.hasOptions).toBe(true);

    const plain = await call('PUT', `/api/stores/lessari/products/${kit.id}`, owner, { kit: null });
    expect(plain.json<ProductDetail>().kit).toBeNull();
  });

  it("lists what a kit is put together from: its category's products of one combination, a sold-out one marked, never a kit or another category's", async () => {
    const trufados = (await call('POST', '/api/stores/lessari/product-categories', owner, { name: 'Trufados', parentId: dindins })).json<{ id: string }>().id;
    const trufado = await variantOf(await addProduct({ name: 'Ninho Trufado', priceCents: 1020, categoryId: trufados }));
    await prisma.productVariant.update({ where: { id: pacoca }, data: { trackStock: true, stockQuantity: 0 } });

    const response = await call('GET', `/api/stores/lessari/catalog/${kit.slug}/kit`);
    expect(response.statusCode).toBe(200);
    const { size, parts } = response.json<StorefrontKitParts>();
    expect(size).toBe(3);
    expect(parts.map((part) => [part.name, part.variantId, part.available])).toEqual([
      ['Ninho com Nutella', ninho, true],
      ['Paçoquinha', pacoca, false],
      ['Ninho Trufado', trufado, true],
    ]);
    expect((await call('GET', '/api/stores/lessari/catalog/whey/kit')).statusCode).toBe(404);
  });

  it('refuses options on a kit, and a kit of a product with options', async () => {
    const options = await call('PUT', `/api/stores/lessari/products/${kit.id}/options`, owner, { options: [{ name: 'Tamanho', values: [{ name: 'P' }] }] });
    expect(options.statusCode).toBe(409);
    expect(options.json<ApiErrorBody>()).toMatchObject({ errorCode: 'PRODUCT_KIT_OPTIONS' });
  });

  it("quotes and places a kit at the kit's price, records what went in it, and takes each product chosen off the stock", async () => {
    const quote = (await call('POST', '/api/stores/lessari/cart/quote', undefined, { items: [threeKit(2)] })).json<OrderQuote>();
    expect(quote.subtotalCents).toBe(3980);

    const response = await place([threeKit(2), { variantId: ninho, quantity: 1 }]);
    expect(response.statusCode).toBe(201);
    const order = response.json<Order>();
    expect(order.subtotalCents).toBe(3980 + 700);
    expect(order.items[0]).toMatchObject({ productName: 'Kit Festa', unitPriceCents: 1990, quantity: 2, kitParts: [{ productName: 'Ninho com Nutella', variantLabel: null, quantity: 2 }, { productName: 'Paçoquinha', variantLabel: null, quantity: 1 }] });
    expect(order.items[1]).not.toHaveProperty('kitParts');
    // Two kits of two Ninhos each, and one loose: five.
    expect(await stockOf(ninho)).toBe(0);

    await call('PATCH', `/api/stores/lessari/orders/${order.number}/status`, owner, { status: 'CANCELLED' });
    expect(await stockOf(ninho)).toBe(5);
  });

  it('counts a product chosen for a kit and bought loose as one demand, naming it when there is not enough', async () => {
    const response = await place([threeKit(2), { variantId: ninho, quantity: 2 }]);

    expect(response.statusCode).toBe(409);
    expect(response.json<ApiErrorBody & { details: OrderStockDetails }>()).toMatchObject({ errorCode: 'ORDER_STOCK_INSUFFICIENT', details: { shortages: [{ variantId: ninho, available: 5, productName: 'Ninho com Nutella' }] } });
    expect(await stockOf(ninho)).toBe(5);
  });

  it('takes two kits with other products in them as two lines, and the same kit twice as a duplicate', async () => {
    const other = { variantId: kitVariant, quantity: 1, kit: [{ variantId: pacoca, quantity: 3 }] };
    expect((await place([threeKit(), other])).statusCode).toBe(201);
    expect((await place([threeKit(), threeKit()])).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_ITEM_DUPLICATE' });
  });

  it.each([
    ['a kit with nothing in it', () => ({ variantId: kitVariant, quantity: 1 })],
    ['a kit short of its size', () => ({ variantId: kitVariant, quantity: 1, kit: [{ variantId: ninho, quantity: 2 }] })],
    ['a kit past its size', () => ({ variantId: kitVariant, quantity: 1, kit: [{ variantId: ninho, quantity: 4 }] })],
    ['a product twice in one kit', () => ({ variantId: kitVariant, quantity: 1, kit: [{ variantId: ninho, quantity: 2 }, { variantId: ninho, quantity: 1 }] })],
    ["a product outside the kit's category", () => ({ variantId: kitVariant, quantity: 1, kit: [{ variantId: ninho, quantity: 2 }, { variantId: whey, quantity: 1 }] })],
    ['a composition on a line that is no kit', () => ({ variantId: whey, quantity: 1, kit: [{ variantId: ninho, quantity: 3 }] })],
    ['a kit inside a kit', () => ({ variantId: kitVariant, quantity: 1, kit: [{ variantId: kitVariant, quantity: 3 }] })],
  ])('refuses %s, naming the line', async (_case, item) => {
    const response = await place([item()]);

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_KIT_INVALID' });
  });

  it("refuses a kit of some categories once they are all gone: it lets nothing in", async () => {
    await prisma.productKitCategory.deleteMany({ where: { productId: kit.id } });

    expect((await place([threeKit()])).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_KIT_INVALID' });
  });

  it('lets every product in, or every one but some categories\', as its rule says', async () => {
    const withWhey = { variantId: kitVariant, quantity: 1, kit: [{ variantId: ninho, quantity: 2 }, { variantId: whey, quantity: 1 }] };

    await call('PUT', `/api/stores/lessari/products/${kit.id}`, owner, { kit: { size: 3, scope: 'ALL' } });
    expect((await place([withWhey])).statusCode).toBe(201);

    const except = await call('PUT', `/api/stores/lessari/products/${kit.id}`, owner, { kit: { size: 3, scope: 'EXCEPT', categoryIds: [outros] } });
    expect(except.json<ProductDetail>().kit).toEqual({ size: 3, scope: 'EXCEPT', categoryIds: [outros] });
    expect((await place([withWhey])).json<ApiErrorBody>()).toMatchObject({ errorCode: 'ORDER_KIT_INVALID' });
    expect((await place([threeKit()])).statusCode).toBe(201);

    // A product of no category is one of "every one but", on the page as at the order.
    const agua = await variantOf(await addProduct({ name: 'Água', priceCents: 300 }));
    const parts = (await call('GET', `/api/stores/lessari/catalog/${kit.slug}/kit`)).json<StorefrontKitParts>().parts.map((part) => part.name);
    expect(parts).toEqual(['Ninho com Nutella', 'Paçoquinha', 'Água']);
    expect((await place([{ variantId: kitVariant, quantity: 1, kit: [{ variantId: agua, quantity: 3 }] }])).statusCode).toBe(201);
  });

  it('refuses a rule that names no category for some, or one for every product', async () => {
    for (const rule of [{ size: 3, scope: 'ONLY' }, { size: 3, scope: 'EXCEPT', categoryIds: [] }, { size: 3, scope: 'ALL', categoryIds: [dindins] }]) {
      const response = await call('PUT', `/api/stores/lessari/products/${kit.id}`, owner, { kit: rule });
      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>()).toMatchObject({ errorCode: 'PRODUCT_KIT_INVALID' });
    }
  });
});
