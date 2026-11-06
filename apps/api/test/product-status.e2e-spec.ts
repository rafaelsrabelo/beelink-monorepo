// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, Product, ProductStatusResult } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Dindin da Leia',
  slug: 'dindin-da-leia',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(85) 99999-8888' },
  address: { city: 'Fortaleza', state: 'ce', zipCode: '60000-000' },
};

describe('products put in one status at once', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

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
    owner = await signUpAndSignIn(app, newEmail('leia'));
    stranger = await signUpAndSignIn(app, newEmail('estranha'));
    await call('POST', '/api/stores', owner, shopBody);
  });

  function call(method: 'POST' | 'PUT', url: string, session: AuthSession, payload: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${session.accessToken}` }, payload });
  }

  async function addProduct(name: string, status: 'ACTIVE' | 'DRAFT'): Promise<string> {
    const response = await call('POST', '/api/stores/dindin-da-leia/products', owner, { name, priceCents: 400, status });
    return response.json<Product>().id;
  }

  function setStatus(session: AuthSession, ids: string[], status: 'ACTIVE' | 'DRAFT') {
    return call('PUT', '/api/stores/dindin-da-leia/products/status', session, { ids, status });
  }

  async function statusesOf(ids: string[]) {
    const rows = await prisma.product.findMany({ where: { id: { in: ids } }, select: { id: true, status: true } });
    return ids.map((id) => rows.find((row) => row.id === id)?.status);
  }

  it('publishes the drafts asked for, and counts only what changed', async () => {
    const ids = [await addProduct('Dindin de coco', 'DRAFT'), await addProduct('Dindin de uva', 'DRAFT'), await addProduct('Picolé', 'ACTIVE')];

    const response = await setStatus(owner, ids, 'ACTIVE');

    expect(response.statusCode).toBe(200);
    expect(response.json<ProductStatusResult>()).toEqual({ changed: 2 });
    expect(await statusesOf(ids)).toEqual(['ACTIVE', 'ACTIVE', 'ACTIVE']);
  });

  it('takes products back to draft the same way', async () => {
    const ids = [await addProduct('Dindin de coco', 'ACTIVE'), await addProduct('Dindin de uva', 'ACTIVE')];

    expect((await setStatus(owner, ids, 'DRAFT')).json<ProductStatusResult>()).toEqual({ changed: 2 });
    expect(await statusesOf(ids)).toEqual(['DRAFT', 'DRAFT']);
  });

  it('changes nothing when one id is not the shop’s', async () => {
    const mine = await addProduct('Dindin de coco', 'DRAFT');
    await call('POST', '/api/stores', stranger, { ...shopBody, name: 'Outra', slug: 'outra-loja' });
    const theirs = (await call('POST', '/api/stores/outra-loja/products', stranger, { name: 'Alheio', priceCents: 100, status: 'DRAFT' })).json<Product>().id;

    const response = await setStatus(owner, [mine, theirs], 'ACTIVE');

    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_NOT_FOUND');
    expect(await statusesOf([mine, theirs])).toEqual(['DRAFT', 'DRAFT']);
  });

  it('refuses a stranger', async () => {
    const id = await addProduct('Dindin de coco', 'DRAFT');

    expect((await setStatus(stranger, [id], 'ACTIVE')).statusCode).toBe(403);
    expect(await statusesOf([id])).toEqual(['DRAFT']);
  });
});
