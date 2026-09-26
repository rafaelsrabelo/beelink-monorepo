// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile, Order, OrderPage, Product, StoreCustomer, StoreCustomerDetail, StoreCustomerPage } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };
}

describe('two records of one person, made one by the shopkeeper', () => {
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

  async function register(payload: object, slug = 'lessari'): Promise<StoreCustomer> {
    const response = await call('POST', `/api/stores/${slug}/customers`, owner, payload);
    if (response.statusCode !== 201) throw new Error(`POST customers answered ${response.statusCode}: ${response.payload}`);
    return response.json<StoreCustomer>();
  }

  /** A shopper who opened an account at the shop and signed in: their session and their record. */
  async function shopper(name: string): Promise<{ session: AuthSession; me: CustomerProfile }> {
    const email = newEmail('cliente');
    await call('POST', '/api/stores/lessari/customer/register', undefined, { name, email, password: PASSWORD });
    await verifyEmailOf(app, email);
    const session = (await call('POST', '/api/stores/lessari/customer/login', undefined, { email, password: PASSWORD })).json<AuthSession>();
    return { session, me: (await call('GET', '/api/stores/lessari/customer/me', session)).json<CustomerProfile>() };
  }

  async function place(customerId: string, quantity: number): Promise<Order> {
    const response = await call('POST', '/api/stores/lessari/orders', owner, {
      customer: { id: customerId },
      items: [{ variantId: whey, quantity }],
      fulfillment: 'PICKUP',
      paymentMethod: 'PIX',
    });
    if (response.statusCode !== 201) throw new Error(`POST orders answered ${response.statusCode}: ${response.payload}`);
    return response.json<Order>();
  }

  const record = (id: string) => call('GET', `/api/stores/lessari/customers/${id}`, owner).then((response) => response.json<StoreCustomerDetail>());
  const flagsOf = async () =>
    Object.fromEntries(
      (await call('GET', '/api/stores/lessari/customers', owner)).json<StoreCustomerPage>().customers.map((row) => [row.name, row.possibleDuplicate]),
    );
  const merge = (id: string, otherId: string, session = owner, slug = 'lessari') =>
    call('POST', `/api/stores/${slug}/customers/${id}/merge`, session, { otherId });

  it("flags the shopkeeper's record and the account that tried to save its phone, and nobody else", async () => {
    const registered = await register({ name: 'Maria WhatsApp', phone: '(11) 97777-6666' });
    await register({ name: 'Outra Pessoa', phone: '(11) 95555-4444' });
    const { session, me } = await shopper('Maria Souza');

    expect(await flagsOf()).toEqual({ 'Maria WhatsApp': false, 'Outra Pessoa': false, 'Maria Souza': false });

    const refused = await call('PATCH', '/api/stores/lessari/customer/me', session, { phone: '11977776666', address: { city: 'Santos' } });
    expect(refused.statusCode).toBe(409);
    expect(refused.json()).toMatchObject({ errorCode: 'CUSTOMER_PHONE_TAKEN' });
    // Refused whole: the phone is only remembered as a claim, and the rest of the request is not saved.
    expect((await call('GET', '/api/stores/lessari/customer/me', session)).json<CustomerProfile>()).toMatchObject({ phone: null, address: { city: null } });

    expect(await flagsOf()).toEqual({ 'Maria WhatsApp': true, 'Outra Pessoa': false, 'Maria Souza': true });
    expect((await record(me.id)).duplicates).toEqual([
      { id: registered.id, name: 'Maria WhatsApp', phone: '5511977776666', email: null, hasAccount: false, ordersCount: 0, reason: 'PHONE' },
    ]);
    expect((await record(registered.id)).duplicates).toMatchObject([{ id: me.id, name: 'Maria Souza', phone: null, hasAccount: true, reason: 'PHONE' }]);
  });

  it('moves the orders to the record with an account, fills its phone and address, and deletes the other', async () => {
    const registered = await register({ name: 'Maria WhatsApp', phone: '(11) 97777-6666', address: { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', city: 'São Paulo', state: 'SP' } });
    const first = await place(registered.id, 1);
    await place(registered.id, 2);
    await call('PATCH', `/api/stores/lessari/orders/${first.number}/status`, owner, { status: 'CANCELLED' });
    const { session, me } = await shopper('Maria Souza');
    await call('PATCH', '/api/stores/lessari/customer/me', session, { phone: '11977776666' });

    // Asked from the shopkeeper's record: the one kept is still the account's.
    const response = await merge(registered.id, me.id);

    expect(response.statusCode).toBe(200);
    const kept = response.json<StoreCustomerDetail>();
    expect(kept).toMatchObject({
      id: me.id,
      name: 'Maria Souza',
      phone: '5511977776666',
      address: { zipCode: '01310-930', street: 'Av. Paulista', number: '1000', city: 'São Paulo', state: 'SP' },
      ordersCount: 1,
      totalSpentCents: 17980,
      possibleDuplicate: false,
      duplicates: [],
    });
    expect((await call('GET', `/api/stores/lessari/customers/${registered.id}`, owner)).statusCode).toBe(404);
    // The cancelled one moves too: the history is the person's, whatever the books count.
    const history = (await call('GET', `/api/stores/lessari/orders?customerId=${me.id}`, owner)).json<OrderPage>();
    expect(history.total).toBe(2);
    expect(await prisma.customer.findUniqueOrThrow({ where: { id: me.id } })).toMatchObject({ claimedPhone: null });
    // What the shopper sees at the shop is the merged record.
    expect((await call('GET', '/api/stores/lessari/customer/me', session)).json<CustomerProfile>()).toMatchObject({ phone: '5511977776666' });
  });

  it('flags the same name, accents and spaces aside, and keeps the record in the address when neither has an account', async () => {
    const here = await register({ name: 'Rita  Balcão', phone: '(21) 97777-6666', address: { city: 'Niterói' } });
    const other = await register({ name: 'rita balcao', phone: '(21) 95555-4444', address: { zipCode: '01310-930', street: 'Rua B' } });
    await place(other.id, 1);

    expect(await flagsOf()).toEqual({ 'Rita  Balcão': true, 'rita balcao': true });
    expect((await record(here.id)).duplicates).toMatchObject([{ id: other.id, reason: 'NAME' }]);

    const kept = (await merge(here.id, other.id)).json<StoreCustomerDetail>();

    // Its own phone, and its own address — never half of each.
    expect(kept).toMatchObject({ id: here.id, phone: '5521977776666', ordersCount: 1, address: { city: 'Niterói', zipCode: null, street: null } });
  });

  it('refuses itself, another shop, two accounts and anyone but the owner', async () => {
    const registered = await register({ name: 'Ana', phone: '(11) 97777-6666' });
    const elsewhere = await register({ name: 'Ana', phone: '(11) 97777-6666' }, 'outra');
    const ana = await shopper('Ana');
    const otherAna = await shopper('Ana');
    const stranger = await signUpAndSignIn(app, newEmail('estranha'));

    expect((await merge(registered.id, registered.id.toUpperCase())).json()).toMatchObject({ errorCode: 'CUSTOMER_MERGE_SELF' });
    expect((await merge(registered.id, elsewhere.id)).json()).toMatchObject({ errorCode: 'CUSTOMER_NOT_FOUND' });
    expect((await merge(registered.id, 'nao-e-um-id')).statusCode).toBe(400);
    expect((await merge(ana.me.id, otherAna.me.id)).json()).toMatchObject({ errorCode: 'CUSTOMER_MERGE_TWO_ACCOUNTS' });
    expect((await merge(registered.id, ana.me.id, stranger)).statusCode).toBe(403);
    expect((await merge(registered.id, ana.me.id, ana.session)).statusCode).toBe(401);
    // Two accounts with one name are not offered to each other; the record without one is offered to both.
    expect((await record(ana.me.id)).duplicates.map((duplicate) => duplicate.id)).toEqual([registered.id]);
    expect(await prisma.customer.count()).toBe(4);
  });

  it('forgets the claim once the shopper saves a phone that sticks', async () => {
    await register({ name: 'Maria WhatsApp', phone: '(11) 97777-6666' });
    const { session, me } = await shopper('Maria Souza');
    await call('PATCH', '/api/stores/lessari/customer/me', session, { phone: '11977776666' });
    expect((await record(me.id)).possibleDuplicate).toBe(true);

    // Clearing the phone is not a phone that sticks: the claim stands.
    await call('PATCH', '/api/stores/lessari/customer/me', session, { phone: null });
    expect((await record(me.id)).possibleDuplicate).toBe(true);

    expect((await call('PATCH', '/api/stores/lessari/customer/me', session, { phone: '11966665555' })).statusCode).toBe(200);
    expect((await record(me.id)).possibleDuplicate).toBe(false);
  });
});
