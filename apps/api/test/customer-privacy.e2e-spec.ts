// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerDataExport, CustomerProfile, Order, ProductDetail, PublicProductReviews } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

const ADDRESS = { label: 'Casa', zipCode: '60160-230', street: 'Rua Tibúrcio Cavalcante', number: '1200', neighborhood: 'Meireles', city: 'Fortaleza', state: 'CE' };

describe("a shopper's data at a shop: the copy, and the end of the account", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let email: string;
  let shopper: AuthSession;
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
    email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Souza', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    shopper = await signIn();
    whey = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', slug: 'whey', priceCents: 18990 })).json<ProductDetail>();
  });

  function call(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function signIn(): Promise<AuthSession> {
    const response = await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD });
    if (response.statusCode !== 200) throw new Error(`login answered ${response.statusCode}: ${response.payload}`);
    return response.json<AuthSession>();
  }

  /** The shopper's full record: a CPF, an address, a favourite, a delivered order with a review and a message. */
  async function filledIn(): Promise<{ customerId: string; order: Order }> {
    await call('PATCH', '/api/stores/lessari/customer/me', shopper, { phone: '5585998764321', cpf: '52998224725', birthDate: '1990-04-12' });
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, ADDRESS);
    await call('PUT', `/api/stores/lessari/customer/favorites/${whey.id}`, shopper, {});
    const me = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();
    const order = (await call('POST', '/api/stores/lessari/orders', owner, { customer: { id: me.id }, items: [{ variantId: whey.variants[0]!.id, quantity: 1 }], fulfillment: 'PICKUP', paymentMethod: 'PIX' })).json<Order>();
    expect((await call('POST', `/api/stores/lessari/customer/orders/${order.number}/conversation/messages`, shopper, { body: 'Chega amanhã?' })).statusCode).toBe(201);
    await call('PATCH', `/api/stores/lessari/orders/${order.number}/status`, owner, { status: 'DELIVERED' });
    expect((await call('POST', '/api/stores/lessari/customer/reviews', shopper, { productId: whey.id, rating: 5, comment: 'Ótimo' })).statusCode).toBe(201);
    return { customerId: me.id, order };
  }

  const remove = (payload: object, session = shopper) => call('DELETE', '/api/stores/lessari/customer/me', session, payload);

  it('hands the shopper everything the shop keeps about them, in one file and never a page', async () => {
    const { order } = await filledIn();

    const response = await call('GET', '/api/stores/lessari/customer/me/data', shopper);
    expect(response.statusCode).toBe(200);
    const data = response.json<CustomerDataExport>();

    expect(data.shop).toEqual({ name: 'lessari', slug: 'lessari' });
    expect(data.account).toMatchObject({ name: 'Bia Souza', email, signInWith: ['PASSWORD'], emailVerifiedAt: expect.any(String) });
    expect(data.account.termsAccepted).toEqual([expect.objectContaining({ via: 'SIGN_UP', version: expect.any(String) })]);
    expect(data.profile).toMatchObject({ name: 'Bia Souza', cpf: '52998224725', birthDate: '1990-04-12', addresses: [expect.objectContaining({ label: 'Casa', city: 'Fortaleza' })] });
    expect(data.orders.map((row) => [row.number, row.status])).toEqual([[order.number, 'DELIVERED']]);
    expect(data.favorites.map((row) => row.name)).toEqual(['Whey']);
    expect(data.reviews).toEqual([expect.objectContaining({ name: 'Whey', rating: 5, comment: 'Ótimo' })]);
    expect(data.conversations).toHaveLength(1);
    expect(data.conversations[0]!.messages).toContainEqual(expect.objectContaining({ kind: 'MESSAGE', author: 'CUSTOMER', body: 'Chega amanhã?' }));
    // Never what opens the account.
    expect(response.payload).not.toMatch(/passwordHash|refreshToken|tokenHash/);

    expect((await call('GET', '/api/stores/lessari/customer/me/data')).statusCode).toBe(401);
    expect((await call('GET', '/api/stores/outra/customer/me/data', shopper)).statusCode).toBe(401);
    expect((await call('GET', '/api/stores/lessari/customer/me/data', owner)).statusCode).toBe(401);
  });

  it("ends the account given its password: the shop keeps the orders, forgetting the rest, and the review reads 'Cliente'", async () => {
    const { customerId, order } = await filledIn();
    const elsewhere = await signIn();
    const account = await prisma.user.findFirstOrThrow({ where: { email, storeId: { not: null } } });

    expect((await remove({ password: PASSWORD })).statusCode).toBe(204);

    for (const session of [shopper, elsewhere]) {
      expect((await call('GET', '/api/stores/lessari/customer/me', session)).statusCode).toBe(401);
      expect((await call('POST', '/api/stores/lessari/customer/refresh', undefined, { refreshToken: session.refreshToken })).statusCode).toBe(401);
    }
    expect((await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).statusCode).toBe(401);
    expect(await prisma.user.findUnique({ where: { id: account.id } })).toBeNull();
    expect(await prisma.session.count({ where: { userId: account.id } })).toBe(0);
    expect(await prisma.legalAcceptance.count({ where: { userId: account.id } })).toBe(0);

    // The shop's books: the record stays, down to a name and a phone, and the order is whole.
    expect(await prisma.customer.findUniqueOrThrow({ where: { id: customerId } })).toMatchObject({
      userId: null,
      name: 'Bia Souza',
      phone: '5585998764321',
      cpf: null,
      birthDate: null,
      notifyOffers: false,
      notifyOffersAt: null,
    });
    expect(await prisma.customerAddress.count({ where: { customerId } })).toBe(0);
    expect(await prisma.customerFavorite.count({ where: { customerId } })).toBe(0);
    const kept = await call('GET', `/api/stores/lessari/orders/${order.number}`, owner);
    expect(kept.statusCode).toBe(200);
    expect(kept.json<Order>()).toMatchObject({ number: order.number, status: 'DELIVERED' });
    expect(await prisma.orderMessage.count({ where: { conversation: { orderId: order.id }, author: 'CUSTOMER' } })).toBe(1);

    const reviews = (await call('GET', `/api/stores/lessari/products/${whey.id}/reviews`)).json<PublicProductReviews>();
    expect(reviews.reviews).toEqual([expect.objectContaining({ authorName: 'Cliente', rating: 5 })]);
    expect(reviews.summary.count).toBe(1);

    // The address may open a new account at the shop, which starts with nothing of the old one.
    expect((await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia', email, password: PASSWORD })).statusCode).toBe(202);
  });

  it('deletes a record the shop never sold to, with its addresses and favourites', async () => {
    await call('POST', '/api/stores/lessari/customer/addresses', shopper, ADDRESS);
    await call('PUT', `/api/stores/lessari/customer/favorites/${whey.id}`, shopper, {});
    const { id } = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();

    expect((await remove({ password: PASSWORD })).statusCode).toBe(204);

    expect(await prisma.customer.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.customerAddress.count({ where: { customerId: id } })).toBe(0);
  });

  it('refuses a wrong or missing password and anything else in the body, ending nothing', async () => {
    for (const payload of [{ password: 'nao-e-essa' }, {}, { email }]) {
      const refused = await remove(payload);
      expect(refused.statusCode, JSON.stringify(payload)).toBe(403);
      expect(refused.json()).toMatchObject({ errorCode: 'AUTH_PASSWORD_WRONG' });
    }
    expect((await remove({ password: PASSWORD, motivo: 'x' })).statusCode).toBe(400);
    expect((await remove({ password: PASSWORD }, owner)).statusCode).toBe(401);
    expect((await call('DELETE', '/api/stores/outra/customer/me', shopper, { password: PASSWORD })).statusCode).toBe(401);

    expect((await call('GET', '/api/stores/lessari/customer/me', shopper)).statusCode).toBe(200);
  });

  it("confirms an account with no password — Google's — by its e-mail typed again", async () => {
    const account = await prisma.user.findFirstOrThrow({ where: { email, storeId: { not: null } } });
    await prisma.user.update({ where: { id: account.id }, data: { passwordHash: null } });

    const refused = await remove({ email: 'outra@exemplo.com' });
    expect(refused.statusCode).toBe(403);
    expect(refused.json()).toMatchObject({ errorCode: 'CUSTOMER_DELETE_EMAIL_MISMATCH' });
    expect((await remove({ password: PASSWORD })).json()).toMatchObject({ errorCode: 'CUSTOMER_DELETE_EMAIL_MISMATCH' });

    expect((await remove({ email: `  ${email.toUpperCase()} ` })).statusCode).toBe(204);
    expect(await prisma.user.findUnique({ where: { id: account.id } })).toBeNull();
  });
});
