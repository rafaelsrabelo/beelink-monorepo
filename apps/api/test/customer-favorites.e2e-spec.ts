// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerFavoriteIds, CustomerFavoritePage, ProductDetail } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a shopper's favourites at a shop", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;

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
    for (const slug of ['lessari', 'outra']) await call('POST', '/api/stores', owner, shopBody(slug));
    shopper = await shopperOf('lessari', 'Rafael Souza');
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string, name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  async function addProduct(body: object, shop = 'lessari'): Promise<ProductDetail> {
    const response = await call('POST', `/api/stores/${shop}/products`, owner, body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  /** Haze in Uva and Maçã verde, both R$ 239,90, both counted with stock. */
  async function hazeInTwoFlavours(): Promise<ProductDetail> {
    const product = await addProduct({ name: 'Pré-Treino Haze', slug: 'haze', priceCents: 23990 });
    const options = await call('PUT', `/api/stores/lessari/products/${product.id}/options`, owner, {
      options: [{ name: 'Sabor', values: [{ name: 'Uva' }, { name: 'Maçã verde' }] }],
    });
    const [grape, apple] = options.json<ProductDetail>().variants;
    const variants = await call('PUT', `/api/stores/lessari/products/${product.id}/variants`, owner, {
      variants: [
        { id: grape!.id, priceCents: 23990, trackStock: true, stockQuantity: 5 },
        { id: apple!.id, priceCents: 23990, trackStock: true, stockQuantity: 5 },
      ],
    });
    return variants.json<ProductDetail>();
  }

  const url = (rest = '', slug = 'lessari') => `/api/stores/${slug}/customer/favorites${rest}`;
  const like = (productId: string, payload: object = {}, session = shopper, slug = 'lessari') => call('PUT', url(`/${productId}`, slug), session, payload);
  const pageOf = async (query = '', session = shopper) => {
    const response = await call('GET', url(query), session);
    if (response.statusCode !== 200) throw new Error(`GET favorites answered ${response.statusCode}: ${response.payload}`);
    return response.json<CustomerFavoritePage>();
  };
  const idsOf = async (session = shopper) => (await call('GET', url('/ids'), session)).json<CustomerFavoriteIds>().productIds;

  it('likes a product as a whole at today’s price, keeps the first like when liked again, and unlikes', async () => {
    const whey = await addProduct({ name: 'Whey Isolado', slug: 'whey', priceCents: 18990 });

    expect((await like(whey.id)).statusCode).toBe(204);
    const [first] = (await pageOf()).favorites;
    expect(first).toMatchObject({ productId: whey.id, slug: 'whey', name: 'Whey Isolado', variant: null, hasOptions: false, priceCents: 18990, likedPriceCents: 18990, priceDropCents: 0, onSale: false, soldOut: false });
    expect(await idsOf()).toEqual([whey.id]);

    // Liking it again changes nothing: the price and the date are what "it got cheaper" measures against.
    await call('PUT', `/api/stores/lessari/products/${whey.id}`, owner, { priceCents: 15990 });
    expect((await like(whey.id)).statusCode).toBe(204);
    const [again] = (await pageOf()).favorites;
    expect(again).toMatchObject({ likedPriceCents: 18990, likedAt: first!.likedAt, priceCents: 15990, priceDropCents: 3000 });

    expect((await call('DELETE', url(`/${whey.id}`), shopper)).statusCode).toBe(204);
    // Unliking what is not liked answers the same, so a double tap never errs.
    expect((await call('DELETE', url(`/${whey.id}`), shopper)).statusCode).toBe(204);
    expect((await call('DELETE', url('/nao-e-um-id'), shopper)).statusCode).toBe(204);
    expect(await pageOf()).toMatchObject({ favorites: [], total: 0, counts: { ALL: 0, PRICE_DROPPED: 0, ON_SALE: 0, SOLD_OUT: 0 } });
  });

  it('likes the combination chosen on the page, and choosing another is a new like at its price', async () => {
    const haze = await hazeInTwoFlavours();
    const [grape, apple] = haze.variants;

    await like(haze.id, { variantId: grape!.id });
    const [liked] = (await pageOf()).favorites;
    expect(liked).toMatchObject({ variant: { id: grape!.id, label: 'Sabor: Uva' }, hasOptions: true, likedPriceCents: 23990 });

    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: grape!.id, priceCents: 20990 }, { id: apple!.id, priceCents: 21990 }] });
    expect((await pageOf()).favorites[0]).toMatchObject({ priceCents: 20990, priceDropCents: 3000 });

    // One favourite per product: the other flavour replaces it, liked now at its own price.
    await like(haze.id, { variantId: apple!.id.toUpperCase() });
    const page = await pageOf();
    expect(page.total).toBe(1);
    expect(page.favorites[0]).toMatchObject({ variant: { id: apple!.id, label: 'Sabor: Maçã verde' }, likedPriceCents: 21990, priceDropCents: 0 });
    expect(Date.parse(page.favorites[0]!.likedAt)).toBeGreaterThanOrEqual(Date.parse(liked!.likedAt));

    // Back to the product as a whole: a new like too, at the "a partir de".
    await like(haze.id, { variantId: null });
    expect((await pageOf()).favorites[0]).toMatchObject({ variant: null, likedPriceCents: 20990, priceCents: 20990 });
  });

  it("prices a product liked as a whole by its cheapest combination, so stock coming back is no drop", async () => {
    const haze = await hazeInTwoFlavours();
    const [grape, apple] = haze.variants;
    // Uva is the cheaper, and has none left: the shelf's "a partir de" is Maçã verde's.
    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: grape!.id, priceCents: 19990, stockQuantity: 0 }] });

    await like(haze.id);
    expect((await pageOf()).favorites[0]).toMatchObject({ variant: null, likedPriceCents: 19990, priceCents: 19990, priceDropCents: 0 });

    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: grape!.id, stockQuantity: 4 }] });
    expect((await pageOf()).favorites[0]).toMatchObject({ priceCents: 19990, priceDropCents: 0 });

    // A real drop reads as one.
    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: grape!.id, priceCents: 17990 }, { id: apple!.id, priceCents: 21990 }] });
    expect((await pageOf()).favorites[0]).toMatchObject({ priceCents: 17990, priceDropCents: 2000 });
  });

  it('filters and counts dropped, on sale and sold out, and orders by the like, the price and the saving', async () => {
    const dropped = await addProduct({ name: 'Baixou', slug: 'baixou', priceCents: 10000 });
    const onSale = await addProduct({ name: 'Promoção', slug: 'promocao', priceCents: 5000 });
    const soldOut = await addProduct({ name: 'Esgotado', slug: 'esgotado', priceCents: 20000, trackStock: true, stockQuantity: 2 });
    for (const product of [dropped, onSale, soldOut]) await like(product.id);

    await call('PUT', `/api/stores/lessari/products/${dropped.id}`, owner, { priceCents: 9000 });
    await call('PUT', `/api/stores/lessari/products/${onSale.id}`, owner, { compareAtPriceCents: 10000 });
    await call('PUT', `/api/stores/lessari/products/${soldOut.id}`, owner, { stockQuantity: 0 });

    const all = await pageOf();
    expect(all.counts).toEqual({ ALL: 3, PRICE_DROPPED: 1, ON_SALE: 1, SOLD_OUT: 1 });
    expect(all.favorites.map((favorite) => favorite.name)).toEqual(['Esgotado', 'Promoção', 'Baixou']);
    expect(all.favorites.find((favorite) => favorite.name === 'Esgotado')).toMatchObject({ soldOut: true });

    const names = async (query: string) => (await pageOf(query)).favorites.map((favorite) => favorite.name);
    expect(await names('?filter=PRICE_DROPPED')).toEqual(['Baixou']);
    expect(await names('?filter=ON_SALE')).toEqual(['Promoção']);
    expect(await names('?filter=SOLD_OUT')).toEqual(['Esgotado']);
    expect(await names('?sort=PRICE_ASC')).toEqual(['Promoção', 'Baixou', 'Esgotado']);
    expect(await names('?sort=DISCOUNT')).toEqual(['Promoção', 'Baixou', 'Esgotado']);
    // The counts follow no filter, so each filter keeps saying how many it holds.
    expect((await pageOf('?filter=ON_SALE&pageSize=1&page=1')).counts.ALL).toBe(3);
    expect(await pageOf('?pageSize=2&page=2')).toMatchObject({ total: 3, page: 2, pageSize: 2 });

    for (const query of ['?filter=CHEAP', '?sort=NAME', '?pageSize=49', '?page=0']) {
      expect((await call('GET', url(query), shopper)).statusCode, query).toBe(400);
    }
  });

  it('hides a favourite the shop drafted and brings it back when published; a draft cannot be liked', async () => {
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 18990 });
    const draft = await addProduct({ name: 'Rascunho', slug: 'rascunho', priceCents: 1000, status: 'DRAFT' });
    await like(whey.id);

    const refused = await like(draft.id);
    expect(refused.statusCode).toBe(404);
    expect(refused.json()).toMatchObject({ errorCode: 'CUSTOMER_FAVORITE_PRODUCT_NOT_FOUND' });

    await call('PUT', `/api/stores/lessari/products/${whey.id}`, owner, { status: 'DRAFT' });
    expect(await pageOf()).toMatchObject({ favorites: [], counts: { ALL: 0 } });
    expect(await idsOf()).toEqual([]);

    await call('PUT', `/api/stores/lessari/products/${whey.id}`, owner, { status: 'ACTIVE' });
    expect(await idsOf()).toEqual([whey.id]);

    // Deleting the product takes the favourite with it, a combination's too.
    const haze = await hazeInTwoFlavours();
    await like(haze.id, { variantId: haze.variants[0]!.id });
    for (const product of [whey, haze]) expect((await call('DELETE', `/api/stores/lessari/products/${product.id}`, owner)).statusCode).toBe(204);
    expect(await prisma.customerFavorite.count()).toBe(0);
  });

  it("refuses another shop's product, a combination the product does not sell, and needs a shopper", async () => {
    const haze = await hazeInTwoFlavours();
    const elsewhere = await addProduct({ name: 'Outro', slug: 'outro', priceCents: 1000 }, 'outra');
    const whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 18990 });
    await call('PUT', `/api/stores/lessari/products/${haze.id}/variants`, owner, { variants: [{ id: haze.variants[1]!.id, isActive: false }] });

    for (const productId of [elsewhere.id, 'nao-e-um-id', '01a0ffff-ffff-7fff-bfff-ffffffffffff']) {
      const response = await like(productId);
      expect(response.statusCode, productId).toBe(404);
      expect(response.json(), productId).toMatchObject({ errorCode: 'CUSTOMER_FAVORITE_PRODUCT_NOT_FOUND' });
    }
    for (const variantId of [whey.variants[0]!.id, haze.variants[1]!.id]) {
      const response = await like(haze.id, { variantId });
      expect(response.statusCode, variantId).toBe(404);
      expect(response.json(), variantId).toMatchObject({ errorCode: 'CUSTOMER_FAVORITE_VARIANT_NOT_FOUND' });
    }
    expect((await like(haze.id, { variantId: 'uva' })).statusCode).toBe(400);

    // The same person at another shop is another record, with none of these.
    await like(whey.id);
    const there = await shopperOf('outra', 'Rafael Souza');
    expect((await call('GET', url('/ids', 'outra'), there)).json<CustomerFavoriteIds>().productIds).toEqual([]);
    expect((await call('GET', url('/ids', 'outra'), shopper)).statusCode).toBe(401);

    expect((await call('GET', url())).statusCode).toBe(401);
    expect((await call('GET', url(), owner)).statusCode).toBe(401);
    expect((await like(whey.id, {}, owner)).statusCode).toBe(401);
  });

  it('keeps at most 200 favourites', async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' }, select: { id: true } });
    const customer = await prisma.customer.findFirstOrThrow({ where: { storeId: store.id }, select: { id: true } });
    await prisma.product.createMany({
      data: Array.from({ length: 200 }, (_, index) => ({ storeId: store.id, slug: `p-${index}`, name: `Produto ${index}`, priceCents: 1000, maxPriceCents: 1000 })),
    });
    const products = await prisma.product.findMany({ where: { storeId: store.id }, select: { id: true } });
    await prisma.customerFavorite.createMany({ data: products.map((product) => ({ customerId: customer.id, productId: product.id, likedPriceCents: 1000, seenPriceCents: 1000 })) });

    const one = await addProduct({ name: 'Mais um', slug: 'mais-um', priceCents: 1000 });
    const refused = await like(one.id);
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ errorCode: 'CUSTOMER_FAVORITE_LIMIT' });

    // A product already liked is still a like, not a two-hundred-and-first.
    expect((await like(products[0]!.id)).statusCode).toBe(204);
    expect((await pageOf('?pageSize=48')).total).toBe(200);
  });
});
