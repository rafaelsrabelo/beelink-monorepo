// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { AuthSession, CustomerProfile } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
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
    expect(updated.json<CustomerProfile>()).toMatchObject({ phone: '11988887777', address: { city: 'São Paulo', state: 'SP' } });
  });

  it('is two customers at two shops, and neither shop sees the other', async () => {
    const email = newEmail('cliente');
    const atLessari = await shopperAt('lessari', email);
    await app.inject({
      method: 'PATCH',
      url: '/api/stores/lessari/customer/me',
      headers: { authorization: `Bearer ${atLessari.accessToken}` },
      payload: { phone: '11988887777' },
    });

    const atOutra = (await post('/api/stores/outra/customer/login', { email, password: PASSWORD })).json<AuthSession>();
    const there = (await me('outra', atOutra.accessToken)).json<CustomerProfile>();

    expect(there.phone).toBeNull();
    expect(there.id).not.toBe((await me('lessari', atLessari.accessToken)).json<CustomerProfile>().id);
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
});
