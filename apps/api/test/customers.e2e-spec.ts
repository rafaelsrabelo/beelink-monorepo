// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile, StoreCustomerPage } from '@harness-monorepo/contracts';

// App
import { CustomersService } from '../src/modules/customers/customers.service.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, register, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, tokenFromLink, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const shop = (slug: string) => ({
  name: slug,
  slug,
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
});

describe("a shopper's door into a shop", () => {
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
    for (const slug of ['lessari', 'outra']) {
      await app.inject({ method: 'POST', url: '/api/stores', headers: { authorization: `Bearer ${owner.accessToken}` }, payload: shop(slug) });
    }
  });

  function post(url: string, payload: object) {
    return app.inject({ method: 'POST', url, payload });
  }

  async function shopperAt(slug: string, email = newEmail('cliente')): Promise<AuthSession> {
    expect((await post(`/api/stores/${slug}/customer/register`, { name: 'Bia Cliente', email, password: PASSWORD })).statusCode).toBe(202);
    await verifyEmailOf(app, email);
    const response = await post(`/api/stores/${slug}/customer/login`, { email, password: PASSWORD });
    expect(response.statusCode).toBe(200);
    return response.json<AuthSession>();
  }

  function me(slug: string, token: string) {
    return app.inject({ method: 'GET', url: `/api/stores/${slug}/customer/me`, headers: { authorization: `Bearer ${token}` } });
  }

  it('signs up from a shop, with a verification link that leads back to it', async () => {
    const email = newEmail('cliente');

    await post('/api/stores/lessari/customer/register', { name: 'Bia', email, password: PASSWORD });

    expect((await waitForMessage(email)).Text).toContain('voltar=%2Flessari');
  });

  it('answers a sign-up with an address already in use exactly as a new one', async () => {
    const email = newEmail('cliente');
    await shopperAt('lessari', email);

    const again = await post('/api/stores/lessari/customer/register', { name: 'Outra Pessoa', email, password: 'outra-senha-comprida' });

    expect(again.statusCode).toBe(202);
    expect(again.payload).toBe('');
    expect(await app.get(PrismaService).user.count({ where: { email } })).toBe(1);
  });

  it("keeps a shop's record of the shopper, made on first sign-in, and lets them change it", async () => {
    const session = await shopperAt('lessari');

    const first = (await me('lessari', session.accessToken)).json<CustomerProfile>();
    expect(first).toMatchObject({ name: 'Bia Cliente', phone: null, address: { city: null } });

    const updated = await app.inject({
      method: 'PATCH',
      url: '/api/stores/lessari/customer/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
      payload: { phone: '(11) 98888-7777', address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } },
    });
    expect(updated.statusCode).toBe(200);
    // Kept as a WhatsApp link wants it: the key an order finds the customer by.
    expect(updated.json<CustomerProfile>()).toMatchObject({ phone: '5511988887777', address: { city: 'São Paulo', state: 'SP' } });
  });

  it("keeps an account to the shop it was opened at: anywhere else, its password is an unknown e-mail's", async () => {
    const email = newEmail('cliente');
    await shopperAt('lessari', email);

    const atOutra = await post('/api/stores/outra/customer/login', { email, password: PASSWORD });
    expect(atOutra.statusCode).toBe(401);
    expect(atOutra.json()).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' });
    // Nor does it open the panel, and the panel's sign-up takes the same address as a new account.
    expect((await post('/api/auth/login', { email, password: PASSWORD })).json()).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' });
    await expect(register(app, email)).resolves.toMatchObject({ email });
  });

  it('opens a second account with the same e-mail at another shop, with its own password, link and record', async () => {
    const email = newEmail('cliente');
    const atLessari = await shopperAt('lessari', email);
    await clearInbox();

    expect((await post('/api/stores/outra/customer/register', { name: 'Bia na Outra', email, password: 'outra-senha-comprida' })).statusCode).toBe(202);
    expect((await waitForMessage(email)).Text).toContain('voltar=%2Foutra');
    await verifyEmailOf(app, email);

    expect((await post('/api/stores/outra/customer/login', { email, password: PASSWORD })).statusCode).toBe(401);
    const atOutra = await post('/api/stores/outra/customer/login', { email, password: 'outra-senha-comprida' });
    expect(atOutra.statusCode).toBe(200);

    const there = (await me('outra', atOutra.json<AuthSession>().accessToken)).json<CustomerProfile>();
    expect(there).toMatchObject({ name: 'Bia na Outra', phone: null });
    expect(there.id).not.toBe((await me('lessari', atLessari.accessToken)).json<CustomerProfile>().id);
  });

  it("refuses one shop's tokens at another, and makes no record there", async () => {
    const atLessari = await shopperAt('lessari');

    expect((await me('outra', atLessari.accessToken)).statusCode).toBe(401);
    const patched = await app.inject({
      method: 'PATCH',
      url: '/api/stores/outra/customer/me',
      headers: { authorization: `Bearer ${atLessari.accessToken}` },
      payload: { name: 'Intrusa' },
    });
    expect(patched.statusCode).toBe(401);
    expect((await post('/api/stores/outra/customer/refresh', { refreshToken: atLessari.refreshToken })).statusCode).toBe(401);
    expect(await app.get(PrismaService).customer.count({ where: { store: { slug: 'outra' } } })).toBe(0);
    // Refused elsewhere, still good at home.
    expect((await post('/api/stores/lessari/customer/refresh', { refreshToken: atLessari.refreshToken })).statusCode).toBe(200);
  });

  it("replaces the password of this shop's account only, through a link back to the shop", async () => {
    const email = newEmail('cliente');
    await shopperAt('lessari', email);
    await clearInbox();
    await shopperAt('outra', email);
    await clearInbox();

    expect((await post('/api/stores/lessari/customer/forgot-password', { email })).statusCode).toBe(202);
    const message = await waitForMessage(email);
    expect(message.Text).toContain('voltar=%2Flessari');
    const reset = await post('/api/auth/reset-password', { token: tokenFromLink(message.Text, '/reset-password'), password: 'senha-nova-comprida' });
    expect(reset.statusCode).toBe(204);

    expect((await post('/api/stores/lessari/customer/login', { email, password: 'senha-nova-comprida' })).statusCode).toBe(200);
    expect((await post('/api/stores/outra/customer/login', { email, password: PASSWORD })).statusCode).toBe(200);

    // The panel's "forgot password" looks among bee-link's accounts, where this address has none.
    await clearInbox();
    expect((await post('/api/auth/forgot-password', { email })).statusCode).toBe(202);
    await expect(waitForMessage(email, 1_000)).rejects.toThrow();
  });

  it("never lets one door's token through the other", async () => {
    const shopper = await shopperAt('lessari');

    expect((await me('lessari', owner.accessToken)).statusCode).toBe(401);
    const panel = await app.inject({ method: 'GET', url: '/api/stores/lessari', headers: { authorization: `Bearer ${shopper.accessToken}` } });
    expect(panel.statusCode).toBe(401);

    // Refresh tokens stay on their own door too.
    expect((await post('/api/auth/refresh', { refreshToken: shopper.refreshToken })).statusCode).toBe(401);
    expect((await post('/api/stores/lessari/customer/refresh', { refreshToken: owner.refreshToken })).statusCode).toBe(401);
    expect((await post('/api/stores/lessari/customer/refresh', { refreshToken: shopper.refreshToken })).statusCode).toBe(200);
  });

  it('refuses an unverified sign-in, a wrong password alike to an unknown e-mail, and signs out', async () => {
    const email = newEmail('cliente');
    await post('/api/stores/lessari/customer/register', { name: 'Bia', email, password: PASSWORD });

    expect((await post('/api/stores/lessari/customer/login', { email, password: PASSWORD })).statusCode).toBe(403);
    const wrong = await post('/api/stores/lessari/customer/login', { email, password: 'errada-e-comprida' });
    const unknown = await post('/api/stores/lessari/customer/login', { email: newEmail('ninguem'), password: 'errada-e-comprida' });
    expect(wrong.statusCode).toBe(401);
    expect(wrong.json()).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' });
    expect(unknown.json()).toMatchObject({ errorCode: 'AUTH_INVALID_CREDENTIALS' });

    const shopper = await shopperAt('lessari');
    expect((await post('/api/stores/lessari/customer/logout', { refreshToken: shopper.refreshToken })).statusCode).toBe(204);
    expect((await me('lessari', shopper.accessToken)).statusCode).toBe(401);
  });

  it('makes one record of a shopper however many first uses race', async () => {
    const prisma = app.get(PrismaService);
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } });

    // Several rounds: one race can be won by luck, and a record made twice fails loudly.
    for (let round = 0; round < 10; round += 1) {
      const user = await prisma.user.create({ data: { name: 'Bia', email: newEmail('corrida'), storeId: store.id, emailVerifiedAt: new Date() } });
      const records = await Promise.all(Array.from({ length: 5 }, () => app.get(CustomersService).recordOf(store.id, user)));

      expect(new Set(records.map((record) => record.id)).size).toBe(1);
      expect(await prisma.customer.count({ where: { userId: user.id } })).toBe(1);
    }
  });

  it('keeps a phone to one customer per shop', async () => {
    const first = await shopperAt('lessari');
    const second = await shopperAt('lessari');
    const patch = (token: string) =>
      app.inject({ method: 'PATCH', url: '/api/stores/lessari/customer/me', headers: { authorization: `Bearer ${token}` }, payload: { phone: '11977776666' } });

    expect((await patch(first.accessToken)).statusCode).toBe(200);
    const taken = await patch(second.accessToken);
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toMatchObject({ errorCode: 'CUSTOMER_PHONE_TAKEN' });
  });

  it('answers a shop that does not exist with 404', async () => {
    expect((await post('/api/stores/nao-existe/customer/register', { name: 'Bia', email: newEmail('x'), password: PASSWORD })).statusCode).toBe(404);
  });

  describe("the owner's list of the shop's customers", () => {
    function list(slug: string, token: string, query = '') {
      return app.inject({ method: 'GET', url: `/api/stores/${slug}/customers${query}`, headers: { authorization: `Bearer ${token}` } });
    }

    it('lists an account opened at the shop at once, as a lead, before its first sign-in', async () => {
      const email = newEmail('cliente');
      await post('/api/stores/lessari/customer/register', { name: 'Bia Nova', email, password: PASSWORD });

      const page = (await list('lessari', owner.accessToken)).json<StoreCustomerPage>();
      expect(page.total).toBe(1);
      expect(page.customers[0]).toMatchObject({ name: 'Bia Nova', email, emailVerified: false, stage: 'LEAD' });

      await verifyEmailOf(app, email);
      expect((await list('lessari', owner.accessToken)).json<StoreCustomerPage>().customers[0]).toMatchObject({ emailVerified: true });
      // The other shop of the same owner never saw this shopper.
      expect((await list('outra', owner.accessToken)).json<StoreCustomerPage>().total).toBe(0);
    });

    it("lists an e-mail that has an account at another shop as a new customer here", async () => {
      const email = newEmail('cliente');
      await shopperAt('outra', email);
      await post('/api/stores/lessari/customer/register', { name: 'Alguém', email, password: PASSWORD });

      const page = (await list('lessari', owner.accessToken)).json<StoreCustomerPage>();
      expect(page.total).toBe(1);
      expect(page.customers[0]).toMatchObject({ name: 'Alguém', email, emailVerified: false });
    });

    it('finds a customer by part of the name, the e-mail or the phone', async () => {
      const bia = await shopperAt('lessari', newEmail('bia'));
      await shopperAt('lessari', newEmail('caio'));
      await app.inject({ method: 'PATCH', url: '/api/stores/lessari/customer/me', headers: { authorization: `Bearer ${bia.accessToken}` }, payload: { phone: '11977776666' } });

      expect((await list('lessari', owner.accessToken, '?q=caio')).json<StoreCustomerPage>().total).toBe(1);
      expect((await list('lessari', owner.accessToken, '?q=(11)%2097777')).json<StoreCustomerPage>().total).toBe(1);
      expect((await list('lessari', owner.accessToken, '?q=ninguem')).json<StoreCustomerPage>().total).toBe(0);
    });

    it("is the owner's alone: another account gets 403, and a shopper's token is refused", async () => {
      const shopper = await shopperAt('lessari');
      const stranger = await signUpAndSignIn(app, newEmail('estranho'));

      expect((await list('lessari', stranger.accessToken)).statusCode).toBe(403);
      expect((await list('lessari', shopper.accessToken)).statusCode).toBe(401);
    });
  });
});
