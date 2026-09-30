// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AuthSession,
  CustomerPendingReview,
  CustomerProfile,
  CustomerReview,
  Order,
  ProductDetail,
  PublicProductDetail,
  PublicProductReviews,
  StoreReview,
  StoreReviewPage,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("products' reviews", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let shopper: AuthSession;
  let haze: ProductDetail;
  let whey: ProductDetail;

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
    shopper = await shopperOf('lessari', 'Bia Souza');

    whey = await addProduct({ name: 'Whey', slug: 'whey', priceCents: 18990 });
    haze = await addProduct({ name: 'Pré-Treino Haze', slug: 'haze', priceCents: 23990 });
    const options = await call('PUT', `/api/stores/lessari/products/${haze.id}/options`, owner, { options: [{ name: 'Sabor', values: [{ name: 'Uva' }, { name: 'Maçã verde' }] }] });
    haze = options.json<ProductDetail>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function shopperOf(slug: string, name: string): Promise<AuthSession> {
    const email = newEmail('cliente');
    await call('POST', `/api/stores/${slug}/customer/register`, undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    return (await call('POST', `/api/stores/${slug}/customer/login`, undefined, { email, password: PASSWORD })).json<AuthSession>();
  }

  async function addProduct(body: object): Promise<ProductDetail> {
    const response = await call('POST', '/api/stores/lessari/products', owner, body);
    if (response.statusCode !== 201) throw new Error(`POST products answered ${response.statusCode}: ${response.payload}`);
    return response.json<ProductDetail>();
  }

  /** An order the shop registers for the shopper, moved to the status asked. */
  async function orderFor(session: AuthSession, variantIds: readonly string[], status = 'DELIVERED'): Promise<Order> {
    const me = (await call('GET', '/api/stores/lessari/customer/me', session)).json<CustomerProfile>();
    const items = variantIds.map((variantId) => ({ variantId, quantity: 1 }));
    const order = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: me.id }, items, fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();
    if (status !== order.status) await call('PATCH', `/api/stores/lessari/orders/${order.number}/status`, owner, { status });
    return order;
  }

  const review = (payload: object, session = shopper) => call('POST', '/api/stores/lessari/customer/reviews', session, payload);
  const publicPage = async (productId: string, query = '') => (await call('GET', `/api/stores/lessari/products/${productId}/reviews${query}`)).json<PublicProductReviews>();
  const cacheOf = (productId: string) => prisma.product.findUniqueOrThrow({ where: { id: productId }, select: { reviewCount: true, reviewRatingSum: true } });

  it('offers what was delivered and not rated, takes a review of it with the combination bought, and shows it', async () => {
    const [grape] = haze.variants;
    await orderFor(shopper, [grape!.id, whey.variants[0]!.id]);
    await orderFor(shopper, [whey.variants[0]!.id], 'ACCEPTED');

    const pending = (await call('GET', '/api/stores/lessari/customer/reviews/pending', shopper)).json<CustomerPendingReview[]>();
    expect(pending.map((line) => [line.name, line.variantLabel])).toEqual([
      ['Pré-Treino Haze', 'Sabor: Uva'],
      ['Whey', null],
    ]);

    const created = await review({ productId: haze.id, rating: 5, comment: '  Muito bom, dá energia.  ' });
    expect(created.statusCode).toBe(201);
    expect(created.json<CustomerReview>()).toMatchObject({ name: 'Pré-Treino Haze', rating: 5, comment: 'Muito bom, dá energia.', variantLabel: 'Sabor: Uva', hidden: false });
    expect((await call('GET', '/api/stores/lessari/customer/reviews/pending', shopper)).json<CustomerPendingReview[]>().map((line) => line.name)).toEqual(['Whey']);

    await review({ productId: whey.id, rating: 4, comment: '' });
    expect(await publicPage(haze.id)).toMatchObject({
      summary: { average: 5, count: 1, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 } },
      reviews: [{ rating: 5, comment: 'Muito bom, dá energia.', authorName: 'Bia S.', variantLabel: 'Sabor: Uva' }],
      total: 1,
    });
    expect((await publicPage(whey.id)).reviews[0]).toMatchObject({ rating: 4, comment: null });

    // The product's page carries the rating the card line reads.
    const page = (await call('GET', '/api/stores/lessari/catalog/haze')).json<PublicProductDetail>();
    expect(page.rating).toEqual({ average: 5, count: 1 });
  });

  it('refuses what was not delivered, another shop’s product, a second review and a rating out of range', async () => {
    await orderFor(shopper, [whey.variants[0]!.id], 'OUT_FOR_DELIVERY');
    const elsewhere = (await call('POST', '/api/stores/outra/products', owner, { name: 'Outro', priceCents: 1000 })).json<ProductDetail>();

    for (const productId of [whey.id, elsewhere.id, '01a0ffff-ffff-7fff-bfff-ffffffffffff']) {
      const refused = await review({ productId, rating: 5 });
      expect(refused.statusCode, productId).toBe(403);
      expect(refused.json(), productId).toMatchObject({ errorCode: 'CUSTOMER_REVIEW_NOT_ELIGIBLE' });
    }

    await orderFor(shopper, [whey.variants[0]!.id]);
    for (const payload of [{ productId: whey.id, rating: 6 }, { productId: whey.id, rating: 0 }, { productId: whey.id, rating: 5, comment: 'x'.repeat(1001) }, { productId: 'whey', rating: 5 }]) {
      expect((await review(payload)).statusCode, JSON.stringify(payload).slice(0, 60)).toBe(400);
    }
    expect((await review({ productId: whey.id, rating: 3 })).statusCode).toBe(201);
    const again = await review({ productId: whey.id, rating: 4 });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ errorCode: 'CUSTOMER_REVIEW_EXISTS' });

    expect((await call('GET', '/api/stores/lessari/customer/reviews')).statusCode).toBe(401);
    expect((await call('GET', '/api/stores/lessari/customer/reviews', owner)).statusCode).toBe(401);
  });

  it('lets the shopper rewrite theirs and nobody else’s, and keeps the average true', async () => {
    const other = await shopperOf('lessari', 'Carlos');
    await orderFor(shopper, [whey.variants[0]!.id]);
    await orderFor(other, [whey.variants[0]!.id]);
    const mine = (await review({ productId: whey.id, rating: 2 })).json<CustomerReview>();
    await review({ productId: whey.id, rating: 5 }, other);
    expect(await cacheOf(whey.id)).toEqual({ reviewCount: 2, reviewRatingSum: 7 });

    const edited = await call('PUT', `/api/stores/lessari/customer/reviews/${mine.id}`, shopper, { rating: 4, comment: 'Melhorou.' });
    expect(edited.json<CustomerReview>()).toMatchObject({ rating: 4, comment: 'Melhorou.' });
    expect(await cacheOf(whey.id)).toEqual({ reviewCount: 2, reviewRatingSum: 9 });
    expect((await publicPage(whey.id)).summary).toMatchObject({ average: 4.5, count: 2 });

    for (const reviewId of [mine.id, 'nao-e-um-id']) {
      const refused = await call('PUT', `/api/stores/lessari/customer/reviews/${reviewId}`, other, { rating: 1 });
      expect(refused.statusCode, reviewId).toBe(404);
      expect(refused.json(), reviewId).toMatchObject({ errorCode: 'CUSTOMER_REVIEW_NOT_FOUND' });
    }
    // The author is who the shop window names: no account left, "Cliente".
    await prisma.customer.updateMany({ where: { name: 'Carlos' }, data: { userId: null } });
    expect((await publicPage(whey.id)).reviews.map((row) => row.authorName).sort()).toEqual(['Bia S.', 'Cliente']);
  });

  it('lets the shopkeeper hide and publish again, off the shop window and its average, and the shopper still sees theirs', async () => {
    await orderFor(shopper, [whey.variants[0]!.id]);
    const mine = (await review({ productId: whey.id, rating: 1, comment: 'Chegou aberto.' })).json<CustomerReview>();

    const listed = (await call('GET', '/api/stores/lessari/reviews', owner)).json<StoreReviewPage>();
    expect(listed).toMatchObject({ total: 1, counts: { ALL: 1, PUBLISHED: 1, HIDDEN: 0 } });
    expect(listed.reviews[0]).toMatchObject({ rating: 1, customer: { name: 'Bia Souza' }, product: { name: 'Whey' }, hidden: false });

    const hidden = await call('PATCH', `/api/stores/lessari/reviews/${mine.id}`, owner, { hidden: true });
    expect(hidden.json<StoreReview>().hidden).toBe(true);
    expect(await publicPage(whey.id)).toMatchObject({ summary: { average: null, count: 0 }, reviews: [], total: 0 });
    expect(await cacheOf(whey.id)).toEqual({ reviewCount: 0, reviewRatingSum: 0 });
    // Asked twice, nothing moves twice.
    await call('PATCH', `/api/stores/lessari/reviews/${mine.id}`, owner, { hidden: true });
    expect(await cacheOf(whey.id)).toEqual({ reviewCount: 0, reviewRatingSum: 0 });

    // The shopper's edit does not publish what the shop took down.
    await call('PUT', `/api/stores/lessari/customer/reviews/${mine.id}`, shopper, { rating: 2 });
    expect((await call('GET', '/api/stores/lessari/customer/reviews', shopper)).json<CustomerReview[]>()[0]).toMatchObject({ rating: 2, hidden: true });
    expect(await cacheOf(whey.id)).toEqual({ reviewCount: 0, reviewRatingSum: 0 });
    expect((await call('GET', '/api/stores/lessari/reviews?status=HIDDEN', owner)).json<StoreReviewPage>()).toMatchObject({ total: 1, counts: { ALL: 1, PUBLISHED: 0, HIDDEN: 1 } });

    await call('PATCH', `/api/stores/lessari/reviews/${mine.id}`, owner, { hidden: false });
    expect(await cacheOf(whey.id)).toEqual({ reviewCount: 1, reviewRatingSum: 2 });
    expect((await publicPage(whey.id)).summary).toMatchObject({ average: 2, count: 1 });

    const stranger = await signUpAndSignIn(app, newEmail('outra-dona'));
    expect((await call('GET', '/api/stores/lessari/reviews', stranger)).statusCode).toBe(403);
    expect((await call('PATCH', `/api/stores/lessari/reviews/${mine.id}`, shopper, { hidden: true })).statusCode).toBe(401);
    expect((await call('PATCH', '/api/stores/outra/reviews/' + mine.id, owner, { hidden: true })).json()).toMatchObject({ errorCode: 'REVIEW_NOT_FOUND' });
  });

  it('pages a product’s published reviews, filters by rating, and answers a draft as its page does', async () => {
    const buyers = await Promise.all(['Ana Lima', 'Caio', 'Duda Reis'].map((name) => shopperOf('lessari', name)));
    for (const [index, buyer] of buyers.entries()) {
      await orderFor(buyer, [whey.variants[0]!.id]);
      await review({ productId: whey.id, rating: [5, 4, 5][index] }, buyer);
    }

    const first = await publicPage(whey.id, '?pageSize=2');
    expect(first).toMatchObject({ summary: { average: 4.7, count: 3, histogram: { 4: 1, 5: 2 } }, total: 3, page: 1, pageSize: 2 });
    expect(first.reviews.map((row) => row.authorName)).toEqual(['Duda R.', 'Caio']);
    expect((await publicPage(whey.id, '?pageSize=2&page=2')).reviews.map((row) => row.authorName)).toEqual(['Ana L.']);
    expect(await publicPage(whey.id, '?rating=4')).toMatchObject({ total: 1, reviews: [{ authorName: 'Caio' }], summary: { count: 3 } });
    expect((await call('GET', `/api/stores/lessari/products/${whey.id}/reviews?rating=7`)).statusCode).toBe(400);

    await call('PUT', `/api/stores/lessari/products/${whey.id}`, owner, { status: 'DRAFT' });
    const draft = await call('GET', `/api/stores/lessari/products/${whey.id}/reviews`);
    expect(draft.statusCode).toBe(404);
    expect(draft.json()).toMatchObject({ errorCode: 'PRODUCT_NOT_FOUND' });
    expect((await call('GET', '/api/stores/lessari/products/nao-e-um-id/reviews')).statusCode).toBe(404);
  });
});
