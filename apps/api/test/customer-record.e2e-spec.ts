// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile, Order, OrderPage, Product, StoreCustomer, StoreCustomerDetail } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe("a customer's record in the panel", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let whey: string;

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
    const product = (await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey', priceCents: 8990 })).json<Product>();
    whey = (await prisma.productVariant.findFirstOrThrow({ where: { productId: product.id } })).id;
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  /** An order for `customer` of `quantity` wheys, R$ 89,90 each, with no fee or discount. */
  async function place(customer: object, quantity: number, placedAt?: string): Promise<Order> {
    const response = await call('POST', '/api/stores/lessari/orders', owner, {
      customer,
      items: [{ variantId: whey, quantity }],
      fulfillment: 'PICKUP',
      paymentMethod: 'PIX',
      ...(placedAt ? { placedAt } : {}),
    });
    if (response.statusCode !== 201) throw new Error(`POST orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<Order>();
  }

  async function register(payload: object, slug = 'lessari'): Promise<StoreCustomer> {
    const response = await call('POST', `/api/stores/${slug}/customers`, owner, payload);
    if (response.statusCode !== 201) throw new Error(`POST customers answered ${response.statusCode}: ${response.payload}`);
    return response.json<StoreCustomer>();
  }

  const record = (id: string, slug = 'lessari', session = owner) => call('GET', `/api/stores/${slug}/customers/${id}`, session);
  const edit = (id: string, payload: object, slug = 'lessari', session = owner) => call('PATCH', `/api/stores/${slug}/customers/${id}`, session, payload);

  it('reads the numbers from the valid orders: the average ticket is the total spent over them, in cents', async () => {
    const bia = { name: 'Bia Souza', phone: '(11) 98888-7777' };
    const first = await place(bia, 1, '2026-09-01T12:00:00.000Z');
    const last = await place(bia, 2);
    const cancelled = await place(bia, 5);
    await call('PATCH', `/api/stores/lessari/orders/${cancelled.number}/status`, owner, { status: 'CANCELLED' });

    const read = await record(first.customer.id);

    expect(read.statusCode).toBe(200);
    expect(read.json<StoreCustomerDetail>()).toMatchObject({
      name: 'Bia Souza',
      stage: 'CUSTOMER',
      ordersCount: 2,
      totalSpentCents: 8990 + 17980,
      // 26970 ÷ 2, the cancelled order counting for nothing.
      averageTicketCents: 13485,
      firstOrderAt: first.placedAt,
      lastOrderAt: last.placedAt,
      daysSinceLastOrder: 0,
    });
  });

  it('gives a lead no average ticket and no first order, and the whole address', async () => {
    const { id } = await register({
      name: 'Rita Balcão',
      phone: '11966665555',
      address: { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', city: 'São Paulo', state: 'sp' },
    });

    expect((await record(id)).json<StoreCustomerDetail>()).toMatchObject({
      stage: 'LEAD',
      ordersCount: 0,
      totalSpentCents: 0,
      averageTicketCents: null,
      firstOrderAt: null,
      lastOrderAt: null,
      email: null,
      emailVerified: false,
      address: { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', complement: null, neighborhood: null, city: 'São Paulo', state: 'SP' },
    });
  });

  it("lists one customer's orders, cancelled ones included, newest first and in pages", async () => {
    const bia = await place({ name: 'Bia Souza', phone: '11988887777' }, 1, '2026-09-01T12:00:00.000Z');
    await place({ name: 'Caio Lima', phone: '11977776666' }, 1);
    await place({ id: bia.customer.id }, 2);
    await call('PATCH', '/api/stores/lessari/orders/3/status', owner, { status: 'CANCELLED' });
    const history = (query: string) => call('GET', `/api/stores/lessari/orders?${query}`, owner);

    const page = (await history(`customerId=${bia.customer.id}`)).json<OrderPage>();
    expect(page.orders.map((order) => [order.number, order.status])).toEqual([
      [3, 'CANCELLED'],
      [1, 'ACCEPTED'],
    ]);
    expect(page.total).toBe(2);
    expect((await history(`customerId=${bia.customer.id.toUpperCase()}&pageSize=1&page=2`)).json<OrderPage>()).toMatchObject({
      total: 2,
      orders: [{ number: 1 }],
    });

    // The filter adds to the shop's: another shop's customer finds nothing here.
    const elsewhere = await register({ name: 'Outra Bia', phone: '11988887777' }, 'outra');
    expect((await history(`customerId=${elsewhere.id}`)).json<OrderPage>().total).toBe(0);
    expect((await history('customerId=nao-e-um-id')).statusCode).toBe(400);
  });

  it('corrects the name, the phone and the address, keeping the parts not sent', async () => {
    const { id } = await register({ name: 'Rita', phone: '11966665555', address: { street: 'Rua A', number: '10', city: 'Campinas', state: 'SP' } });

    const saved = await edit(id, { name: '  Rita Balcão ', phone: '(21) 97777-6666', address: { number: '12', complement: 'fundos', city: '' } });

    expect(saved.statusCode).toBe(200);
    expect(saved.json<StoreCustomerDetail>()).toMatchObject({
      name: 'Rita Balcão',
      phone: '5521977776666',
      city: null,
      state: 'SP',
      address: { street: 'Rua A', number: '12', complement: 'fundos', city: null, state: 'SP' },
    });
    expect((await record(id)).json<StoreCustomerDetail>()).toMatchObject({ name: 'Rita Balcão', phone: '5521977776666' });
    // Its own phone again is no conflict.
    expect((await edit(id, { phone: '21977776666' })).statusCode).toBe(200);
  });

  it('refuses a phone another customer of the shop has, and saves nothing of the request', async () => {
    const rita = await register({ name: 'Rita', phone: '11966665555' });
    await register({ name: 'Caio Lima', phone: '11977776666' });
    // The same number at the owner's other shop is that shop's business.
    await register({ name: 'Rita de lá', phone: '11955554444' }, 'outra');

    const refused = await edit(rita.id, { name: 'Rita Nova', phone: '+55 (11) 97777-6666' });

    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ errorCode: 'CUSTOMER_PHONE_TAKEN' });
    expect((await record(rita.id)).json<StoreCustomerDetail>()).toMatchObject({ name: 'Rita', phone: '5511966665555' });
    expect((await edit(rita.id, { phone: '11955554444' })).statusCode).toBe(200);
  });

  it("refuses what is not the shop's to change, and a name or a phone it cannot store", async () => {
    const { id } = await register({ name: 'Rita', phone: '11966665555' });

    for (const payload of [{ email: 'rita@exemplo.com' }, { name: 'R' }, { name: null }, { phone: null }, { phone: '' }, { phone: '1234' }, { address: { state: 'São Paulo' } }]) {
      expect((await edit(id, payload)).statusCode, JSON.stringify(payload)).toBe(400);
    }
    expect((await record(id)).json<StoreCustomerDetail>()).toMatchObject({ name: 'Rita', phone: '5511966665555' });
  });

  it("edits the one record a shopper also sees, and never the account's e-mail", async () => {
    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    const me = (await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>();

    const saved = (await edit(me.id, { name: 'Bia Souza', phone: '11988887777' })).json<StoreCustomerDetail>();

    expect(saved).toMatchObject({ email, emailVerified: true, name: 'Bia Souza' });
    expect((await call('GET', '/api/stores/lessari/customer/me', shopper)).json<CustomerProfile>()).toMatchObject({
      email,
      name: 'Bia Souza',
      phone: '5511988887777',
    });
  });

  it("is the owner's alone: another shop's customer is not found, a stranger gets 403 and a shopper's token 401", async () => {
    const { id } = await register({ name: 'Rita', phone: '11966665555' });
    const stranger = await signUpAndSignIn(app, newEmail('estranho'));

    expect((await record(id, 'outra')).json()).toMatchObject({ errorCode: 'CUSTOMER_NOT_FOUND' });
    expect((await edit(id, { name: 'Outra' }, 'outra')).json()).toMatchObject({ errorCode: 'CUSTOMER_NOT_FOUND' });
    expect((await edit('nao-e-um-id', { name: 'Outra' })).statusCode).toBe(404);
    expect((await edit(id, { name: 'Estranha' }, 'lessari', stranger)).statusCode).toBe(403);

    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name: 'Cliente', email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const shopper = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    expect((await edit(id, { name: 'Cliente' }, 'lessari', shopper)).statusCode).toBe(401);

    expect((await record(id)).json<StoreCustomerDetail>().name).toBe('Rita');
  });
});
