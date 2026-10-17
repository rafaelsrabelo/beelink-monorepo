// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Store, StoreSlugAvailability, StoreSlugMove } from '@harness-monorepo/contracts';

// App
import { PlatformAsaas } from '../src/modules/billing/platform-asaas.client.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { PASSWORD, newEmail, signUpAndSignIn, verifyEmailOf } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { FakePlatformAsaas } from './support/fake-platform-asaas.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

// Hoisted above the imports: `env.ts` reads the environment once. Pages lock in this file — the fake's
// key is bee-link's — so a locked page's change of address is seen refused; every other page is in trial.
vi.hoisted(() => {
  process.env.BILLING_ENFORCED = 'true';
});

const DAY = 86_400_000;

describe("a page's address changes, and the old one leads to it (BEELINK-331)", () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(PlatformAsaas).useValue(new FakePlatformAsaas()));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('outra'));
  });

  /** `session` omitted is an anonymous caller, as a shop window's visitor is. */
  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function openShop(slug: string, session: AuthSession = owner): Promise<Store> {
    const response = await call('POST', '/api/stores', session, { name: 'Padaria da Lia', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  const change = (from: string, to: string, session: AuthSession = owner) => call('PUT', `/api/stores/${from}/slug`, session, { slug: to });
  /** The last change, moved `days` days back: the 30 days are counted from it. */
  const changedDaysAgo = (slug: string, days: number) => prisma.store.update({ where: { slug }, data: { slugChangedAt: new Date(Date.now() - days * DAY) } });

  describe('the change', () => {
    it("moves the page, keeps the old address in its history, and the page's own reads answer at the new one", async () => {
      await openShop('padaria-da-lia-errada');

      const response = await change('padaria-da-lia-errada', 'Padaria da Lia!');

      expect(response.statusCode).toBe(200);
      const store = response.json<Store>();
      expect(store.slug).toBe('padaria-da-lia');
      expect(store.slugChangeableOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect((await call('GET', '/api/stores/padaria-da-lia', owner)).json<Store>()).toMatchObject({ id: store.id, slug: 'padaria-da-lia' });
      expect((await call('GET', '/api/stores/padaria-da-lia/public')).statusCode).toBe(200);
      expect(await prisma.storeSlugHistory.findMany({ select: { slug: true, storeId: true } })).toEqual([{ slug: 'padaria-da-lia-errada', storeId: store.id }]);
      expect((await call('GET', '/api/stores/mine', owner)).json<Store[]>().map(({ slug }) => slug)).toEqual(['padaria-da-lia']);
    });

    it('answers the old address with STORE_MOVED and the new one, on the shop window, the panel and a customer’s routes — and acts on nothing there', async () => {
      await openShop('padaria-velha');
      const product = await call('POST', '/api/stores/padaria-velha/products', owner, { name: 'Pão de Queijo', priceCents: 990 });
      expect(product.statusCode).toBe(201);
      expect((await change('padaria-velha', 'padaria-nova')).statusCode).toBe(200);

      const moved = { statusCode: 404, errorCode: 'STORE_MOVED', details: { slug: 'padaria-nova' } };
      for (const [method, url, session, payload] of [
        ['GET', '/api/stores/padaria-velha/public', undefined, undefined],
        ['GET', '/api/stores/padaria-velha/catalog', undefined, undefined],
        ['GET', '/api/stores/padaria-velha', owner, undefined],
        ['GET', '/api/stores/padaria-velha/products', owner, undefined],
        ['POST', '/api/stores/padaria-velha/products', owner, { name: 'Broa', priceCents: 500 }],
        ['PUT', '/api/stores/padaria-velha/slug', owner, { slug: 'padaria-terceira' }],
        ['POST', '/api/stores/padaria-velha/customer/login', undefined, { email: 'ninguem@exemplo.test', password: PASSWORD }],
      ] as const) {
        const response = await call(method, url, session, payload);
        expect({ url: `${method} ${url}`, body: response.json<ApiErrorBody>() }).toMatchObject({ url: `${method} ${url}`, body: moved });
      }

      // Nothing was written through the old address: one product, and the page still at the new one.
      expect(await prisma.product.count()).toBe(1);
      expect((await call('GET', '/api/stores/padaria-nova/catalog')).statusCode).toBe(200);
      expect((await call('GET', '/api/stores/padaria-nunca-existiu/public')).json<ApiErrorBody>()).toMatchObject({ errorCode: 'STORE_NOT_FOUND' });
    });

    it('lists every address left with the one its page has now, for the web, with no session — even after a second change', async () => {
      await openShop('primeira');
      await openShop('outra-loja', stranger);
      expect((await change('primeira', 'segunda')).statusCode).toBe(200);
      await changedDaysAgo('segunda', 31);
      expect((await change('segunda', 'terceira')).statusCode).toBe(200);

      const moves = await call('GET', '/api/store-slug-moves');

      expect(moves.statusCode).toBe(200);
      expect(moves.json<StoreSlugMove[]>()).toEqual([
        { from: 'primeira', to: 'terceira' },
        { from: 'segunda', to: 'terceira' },
      ]);
    });
  });

  describe("the creation's rules", () => {
    it('refuses the address the page has, a route of the app, what is no address, and a stranger', async () => {
      await openShop('padaria');

      const refusals = [
        [await change('padaria', 'padaria'), 400, 'STORE_SLUG_UNCHANGED'],
        [await change('padaria', 'Padaria'), 400, 'STORE_SLUG_UNCHANGED'],
        [await change('padaria', 'admin'), 400, 'STORE_SLUG_RESERVED'],
        [await change('padaria', 'Zé'), 400, 'STORE_SLUG_INVALID'],
        [await change('padaria', 'a'.repeat(41)), 400, 'STORE_SLUG_INVALID'],
        [await change('padaria', 'padaria-nova', stranger), 403, 'STORE_FORBIDDEN'],
        [await call('PUT', '/api/stores/padaria/slug', undefined, { slug: 'padaria-nova' }), 401, 'AUTH_UNAUTHENTICATED'],
      ] as const;

      for (const [response, status, errorCode] of refusals) expect({ status: response.statusCode, ...response.json<ApiErrorBody>() }).toMatchObject({ status, errorCode });
      expect((await prisma.store.findFirstOrThrow()).slug).toBe('padaria');
      expect(await prisma.storeSlugHistory.count()).toBe(0);
    });

    it("refuses another page's address", async () => {
      await openShop('padaria');
      await openShop('confeitaria', stranger);

      expect((await change('padaria', 'confeitaria')).json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'STORE_SLUG_TAKEN' });
    });

    it('says, before the change, what the change would answer', async () => {
      await openShop('padaria');
      await openShop('confeitaria', stranger);
      const ask = async (slug: string) => (await call('GET', `/api/stores/padaria/slug-availability?slug=${encodeURIComponent(slug)}`, owner)).json<StoreSlugAvailability>();

      expect(await ask('Padaria da Lia')).toEqual({ slug: 'padaria-da-lia', available: true, reason: null });
      expect(await ask('confeitaria')).toEqual({ slug: 'confeitaria', available: false, reason: 'TAKEN' });
      expect(await ask('login')).toEqual({ slug: 'login', available: false, reason: 'RESERVED' });
      expect(await ask('Zé')).toEqual({ slug: 'ze', available: false, reason: 'INVALID' });
      expect(await ask('padaria')).toEqual({ slug: 'padaria', available: false, reason: 'UNCHANGED' });
      expect((await call('GET', '/api/stores/padaria/slug-availability?slug=x', stranger)).statusCode).toBe(403);
    });
  });

  describe('an address left is reserved', () => {
    it('for its page alone: no other page takes it, by a change or by being created with it', async () => {
      await openShop('padaria-antiga');
      await openShop('confeitaria', stranger);
      expect((await change('padaria-antiga', 'padaria-nova')).statusCode).toBe(200);

      expect((await change('confeitaria', 'padaria-antiga', stranger)).json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'STORE_SLUG_TAKEN' });
      const created = await call('POST', '/api/stores', stranger, { name: 'Outra', slug: 'padaria-antiga', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } });
      expect(created.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'STORE_SLUG_TAKEN' });
      expect((await call('GET', '/api/stores/confeitaria/slug-availability?slug=padaria-antiga', stranger)).json<StoreSlugAvailability>()).toMatchObject({ available: false, reason: 'TAKEN' });
    });

    it('and its page may take it back: it leaves the history, and the address it leaves goes in', async () => {
      const { id } = await openShop('padaria-antiga');
      expect((await call('GET', '/api/stores/padaria-antiga/slug-availability?slug=padaria-nova', owner)).json<StoreSlugAvailability>().available).toBe(true);
      expect((await change('padaria-antiga', 'padaria-nova')).statusCode).toBe(200);
      await changedDaysAgo('padaria-nova', 30);

      expect((await call('GET', '/api/stores/padaria-nova/slug-availability?slug=padaria-antiga', owner)).json<StoreSlugAvailability>()).toMatchObject({ available: true });
      const back = await change('padaria-nova', 'padaria-antiga');

      expect(back.statusCode).toBe(200);
      expect(await prisma.storeSlugHistory.findMany({ select: { slug: true, storeId: true } })).toEqual([{ slug: 'padaria-nova', storeId: id }]);
      expect((await call('GET', '/api/stores/padaria-nova/public')).json<ApiErrorBody>()).toMatchObject({ errorCode: 'STORE_MOVED', details: { slug: 'padaria-antiga' } });
    });
  });

  describe('once every 30 days', () => {
    it('refuses a second change with the first day it is accepted, and takes it once the days have passed', async () => {
      await openShop('padaria');
      const first = await change('padaria', 'padaria-dois');
      const changeableOn = first.json<Store>().slugChangeableOn;

      const again = await change('padaria-dois', 'padaria-tres');
      expect(again.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'STORE_SLUG_CHANGE_TOO_SOON', details: { changeableOn } });
      expect((await call('GET', '/api/stores/padaria-dois', owner)).json<Store>().slugChangeableOn).toBe(changeableOn);

      await changedDaysAgo('padaria-dois', 31);
      expect((await call('GET', '/api/stores/padaria-dois', owner)).json<Store>().slugChangeableOn).toBeNull();
      expect((await change('padaria-dois', 'padaria-tres')).statusCode).toBe(200);
    });

    it("counts each page's changes apart", async () => {
      await openShop('padaria');
      await openShop('confeitaria');
      expect((await change('padaria', 'padaria-dois')).statusCode).toBe(200);
      expect((await change('confeitaria', 'confeitaria-dois')).statusCode).toBe(200);
    });
  });

  describe('a race', () => {
    it('of two pages for one free address ends with one of them on it', async () => {
      await openShop('padaria');
      await openShop('confeitaria', stranger);

      const answers = await Promise.all([change('padaria', 'esquina'), change('confeitaria', 'esquina', stranger)]);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 409]);
      expect(answers.find((answer) => answer.statusCode === 409)!.json<ApiErrorBody>().errorCode).toBe('STORE_SLUG_TAKEN');
      expect(await prisma.store.count({ where: { slug: 'esquina' } })).toBe(1);
    });

    it('of a change and a new page for one address ends with one of them on it', async () => {
      await openShop('padaria');

      const [changed, created] = await Promise.all([
        change('padaria', 'esquina'),
        call('POST', '/api/stores', stranger, { name: 'Esquina', slug: 'esquina', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } }),
      ]);

      expect([changed.statusCode, created.statusCode].filter((status) => status === 409)).toHaveLength(1);
      expect(await prisma.store.count({ where: { slug: 'esquina' } })).toBe(1);
    });

    it('of a new page for an address being left never takes it', async () => {
      await openShop('padaria');

      const [changed, created] = await Promise.all([
        change('padaria', 'padaria-nova'),
        call('POST', '/api/stores', stranger, { name: 'Outra', slug: 'padaria', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' } }),
      ]);

      expect(changed.statusCode).toBe(200);
      expect(created.json<ApiErrorBody>()).toMatchObject({ statusCode: 409, errorCode: 'STORE_SLUG_TAKEN' });
      expect(await prisma.store.count()).toBe(1);
    });

    it('of two changes of one page makes one', async () => {
      await openShop('padaria');

      const answers = await Promise.all([change('padaria', 'padaria-um'), change('padaria', 'padaria-dois')]);

      expect(answers.map((answer) => answer.statusCode).sort()).toEqual([200, 404]);
      expect(answers.find((answer) => answer.statusCode === 404)!.json<ApiErrorBody>().errorCode).toBe('STORE_MOVED');
      expect(await prisma.storeSlugHistory.count()).toBe(1);
    });
  });

  describe("a page's customers", () => {
    it('keep their accounts, signing in at the new address, and the links e-mailed from now on spell it', async () => {
      await openShop('padaria');
      const email = newEmail('cliente');
      expect((await call('POST', '/api/stores/padaria/customer/register', undefined, { name: 'Bia Cliente', email, password: PASSWORD })).statusCode).toBe(202);
      await verifyEmailOf(app, email);
      expect((await change('padaria', 'padaria-da-lia')).statusCode).toBe(200);
      await clearInbox();

      const login = await call('POST', '/api/stores/padaria-da-lia/customer/login', undefined, { email, password: PASSWORD });
      expect(login.statusCode).toBe(200);

      expect((await call('POST', '/api/stores/padaria-da-lia/customer/forgot-password', undefined, { email })).statusCode).toBeLessThan(300);
      expect((await waitForMessage(email)).Text).toContain('http://localhost:3000/padaria-da-lia/');
    });
  });

  describe('a page locked for want of payment', () => {
    it('is refused the change, and its old address answers STORE_MOVED like any other', async () => {
      await openShop('padaria');
      expect((await change('padaria', 'padaria-nova')).statusCode).toBe(200);
      await changedDaysAgo('padaria-nova', 31);
      await prisma.storeSubscription.updateMany({ data: { trialStartedAt: new Date(Date.now() - 9 * DAY), trialEndsAt: new Date(Date.now() - DAY) } });

      expect((await change('padaria-nova', 'padaria-tres')).json<ApiErrorBody>()).toMatchObject({ statusCode: 403, errorCode: 'PAGE_LOCKED' });
      expect((await call('GET', '/api/stores/padaria/public')).json<ApiErrorBody>()).toMatchObject({ errorCode: 'STORE_MOVED', details: { slug: 'padaria-nova' } });
    });
  });
});
