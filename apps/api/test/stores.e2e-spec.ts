// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PublicStore, Store } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/**
 * No address street anywhere in this file, on purpose: the service geocodes through a third party
 * the moment street, city and state are all present, and a suite must not depend on the internet.
 */
const createBody = {
  name: 'Padaria do Bairro',
  slug: 'padaria-do-bairro',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

const updateBody = {
  name: 'Padaria da Esquina',
  type: 'ECOMMERCE',
  layoutType: 'BANNER',
  showProductsByCategory: true,
  colors: { background: '#FFFFFF', primary: '#3B7AF7', text: '#1A202C', header: '#3B7AF7' },
  socialNetworks: { whatsapp: '5511999998888', instagram: '@minhaloja' },
  paymentMethods: ['PIX'],
  layoutSettings: { showBanner: true, productsPerRow: 2 },
};

describe('stores', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let stranger: AuthSession;

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
    stranger = await signUpAndSignIn(app, newEmail('estranha'));
  });

  function as(session: AuthSession): { authorization: string } {
    return { authorization: `Bearer ${session.accessToken}` };
  }

  /** `session` omitted means an anonymous caller, which is how the storefront reads. */
  function call(method: 'GET' | 'POST' | 'PUT', url: string, session?: AuthSession, payload?: object) {
    return app.inject({ method, url, headers: session ? as(session) : {}, ...(payload ? { payload } : {}) });
  }

  async function openShop(session: AuthSession, body: object = createBody): Promise<Store> {
    const response = await call('POST', '/api/stores', session, body);
    if (response.statusCode !== 201) throw new Error(`POST /stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  // The legacy leaned on a Supabase policy that read `auth.role() = 'authenticated'`, so any signed-in
  // person could edit any shop's rows. This is that hole, turned into a regression guard.
  describe('one shopkeeper cannot reach another shopkeeper’s shop', () => {
    it('refuses a stranger the read and the write, and changes nothing', async () => {
      await openShop(owner);

      const read = await call('GET', '/api/stores/padaria-do-bairro', stranger);
      const write = await call('PUT', '/api/stores/padaria-do-bairro', stranger, updateBody);

      expect(read.statusCode).toBe(403);
      expect(read.json<ApiErrorBody>().errorCode).toBe('STORE_FORBIDDEN');
      expect(write.statusCode).toBe(403);

      const stillMine = await call('GET', '/api/stores/padaria-do-bairro', owner);
      expect(stillMine.json<Store>().name).toBe('Padaria do Bairro');
    });

    it('keeps a stranger’s shop out of `mine`', async () => {
      await openShop(owner);

      const mine = await call('GET', '/api/stores/mine', stranger);

      expect(mine.statusCode).toBe(200);
      expect(mine.json<Store[]>()).toEqual([]);
    });

    it('answers 401 with no bearer token at all', async () => {
      await openShop(owner);

      const anonymous = await call('GET', '/api/stores/padaria-do-bairro');

      expect(anonymous.statusCode).toBe(401);
    });
  });

  describe('opening a shop', () => {
    it('keeps the address and the social networks the legacy POST silently dropped', async () => {
      const store = await openShop(owner);

      expect(store).toMatchObject({
        slug: 'padaria-do-bairro',
        ownerId: owner.user.id,
        address: { city: 'São Paulo', state: 'SP', zipCode: '01310930' },
        socialNetworks: { whatsapp: '5511999998888' },
      });
    });

    it('starts on the platform theme and the four payment methods, with no colours sent', async () => {
      const store = await openShop(owner);

      expect(Object.values(store.colors).every((colour) => /^#[0-9A-Fa-f]{6}$/.test(colour))).toBe(true);
      expect(store.paymentMethods).toHaveLength(4);
    });

    it('normalises the slug a person typed rather than storing it as typed', async () => {
      const store = await openShop(owner, { ...createBody, slug: '  Padaria  Do Bairro!! ' });

      expect(store.slug).toBe('padaria-do-bairro');
    });

    it('refuses a slug that would shadow a route of the app itself', async () => {
      const response = await call('POST', '/api/stores', owner, { ...createBody, slug: 'admin' });

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('STORE_SLUG_RESERVED');
    });

    it('refuses a slug another shop already holds, whoever asks', async () => {
      await openShop(owner);

      const response = await call('POST', '/api/stores', stranger, createBody);

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('STORE_SLUG_TAKEN');
    });

    it('refuses a shop with no WhatsApp — an order has nowhere to go without it', async () => {
      const response = await call('POST', '/api/stores', owner, { ...createBody, socialNetworks: {} });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('editing a shop', () => {
    it('replaces every field the body carries and clears what it leaves out', async () => {
      await openShop(owner);

      const response = await call('PUT', '/api/stores/padaria-do-bairro', owner, updateBody);

      expect(response.statusCode).toBe(200);
      expect(response.json<Store>()).toMatchObject({
        name: 'Padaria da Esquina',
        layoutType: 'BANNER',
        paymentMethods: ['PIX'],
        socialNetworks: { instagram: 'minhaloja' },
        layoutSettings: { showBanner: true, productsPerRow: 2 },
        // Sent on create, absent from this body: a PUT replaces.
        address: { city: null, state: null, zipCode: null },
      });
    });

    it('refuses to move the slug or to be handed coordinates', async () => {
      await openShop(owner);

      for (const extra of [{ slug: 'outra-loja' }, { latitude: -23.5 }, { longitude: -46.6 }]) {
        const response = await call('PUT', '/api/stores/padaria-do-bairro', owner, { ...updateBody, ...extra });

        expect(response.statusCode).toBe(400);
      }
    });

    it('refuses a layout key the contract does not declare', async () => {
      await openShop(owner);

      const response = await call('PUT', '/api/stores/padaria-do-bairro', owner, {
        ...updateBody,
        layoutSettings: { showBanner: true, showWhatever: true },
      });

      expect(response.statusCode).toBe(400);
    });

    it('refuses a checkout with no payment method at all', async () => {
      await openShop(owner);

      const response = await call('PUT', '/api/stores/padaria-do-bairro', owner, { ...updateBody, paymentMethods: [] });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('the shop window', () => {
    it('serves an anonymous visitor, and nothing the owner alone may read', async () => {
      await openShop(owner);

      const response = await call('GET', '/api/stores/padaria-do-bairro/public');

      expect(response.statusCode).toBe(200);
      expect(response.json<PublicStore>()).toMatchObject({ slug: 'padaria-do-bairro' });
      expect(response.payload).not.toContain('ownerId');
      expect(response.payload).not.toContain('address');
      expect(response.payload).not.toContain('latitude');
    });

    it('answers 404 for a slug no shop holds', async () => {
      const response = await call('GET', '/api/stores/nao-existe/public');

      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorBody>().errorCode).toBe('STORE_NOT_FOUND');
    });
  });

  describe('the taxonomy', () => {
    it('is closed to a caller with no token', async () => {
      const anonymous = await call('GET', '/api/store-categories');
      const signedIn = await call('GET', '/api/store-categories', owner);

      expect(anonymous.statusCode).toBe(401);
      expect(signedIn.statusCode).toBe(200);
    });
  });
});
