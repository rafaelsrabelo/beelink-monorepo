// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, ProductDetail } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** No address street: the service geocodes through a third party the moment one is complete. */
function shopBody(slug: string) {
  return {
    name: slug,
    slug,
    type: 'ECOMMERCE',
    socialNetworks: { whatsapp: '(11) 99999-8888' },
    address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
  };
}

describe('a visitor’s "Avise-me"', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let visitor = 0;

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
    await ownerCall('POST', '/api/stores', shopBody('lessari'));
  });

  function ownerCall(method: 'POST' | 'PUT', url: string, payload: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, payload });
  }

  /** Each test's visitor has an address of its own, so one test's requests never spend another's limit. */
  function ask(productId: string, payload: object, remoteAddress = `10.0.0.${++visitor}`) {
    return app.inject({
      method: 'POST',
      url: `/api/stores/lessari/products/${productId}/restock-requests`,
      remoteAddress,
      payload,
    });
  }

  async function soldOutBlouse(shop = 'lessari'): Promise<ProductDetail> {
    const response = await ownerCall('POST', `/api/stores/${shop}/products`, {
      name: 'Blusa',
      priceCents: 18900,
      trackStock: true,
      stockQuantity: 0,
    });
    return response.json<ProductDetail>();
  }

  it('saves a request for a sold-out combination, with the number as a shop stores one', async () => {
    const product = await soldOutBlouse();

    const response = await ask(product.id, { variantId: product.variants[0]!.id, phone: '(11) 98888-7777', name: 'Ana' });

    expect(response.statusCode).toBe(201);
    expect(response.payload).toBe('');
    const [saved] = await prisma.restockRequest.findMany();
    expect(saved).toMatchObject({ productId: product.id, variantId: product.variants[0]!.id, phone: '5511988887777', name: 'Ana' });
  });

  it('keeps one request when the same number asks twice', async () => {
    const product = await soldOutBlouse();
    const body = { variantId: product.variants[0]!.id, phone: '11988887777' };

    await ask(product.id, body);
    const again = await ask(product.id, body);

    expect(again.statusCode).toBe(201);
    expect(await prisma.restockRequest.count()).toBe(1);
  });

  it('stores a number typed with the long-distance prefix the way it stores any other', async () => {
    const product = await soldOutBlouse();

    await ask(product.id, { variantId: product.variants[0]!.id, phone: '(011) 98888-7777' });
    const again = await ask(product.id, { variantId: product.variants[0]!.id, phone: '11 98888-7777' });

    expect(again.statusCode).toBe(201);
    expect((await prisma.restockRequest.findMany()).map((request) => request.phone)).toEqual(['5511988887777']);
  });

  it('refuses a name longer than the column, however it is spelled', async () => {
    const product = await soldOutBlouse();

    const response = await ask(product.id, {
      variantId: product.variants[0]!.id,
      phone: '11988887777',
      name: '\u2764\ufe0f'.repeat(80),
    });

    expect(response.statusCode).toBe(400);
  });

  it('refuses a number without its area code', async () => {
    const product = await soldOutBlouse();

    const response = await ask(product.id, { variantId: product.variants[0]!.id, phone: '98888-7777' });

    expect(response.statusCode).toBe(400);
    expect(await prisma.restockRequest.count()).toBe(0);
  });

  it('refuses a combination that is not this product’s, or not this shop’s, with 400', async () => {
    const product = await soldOutBlouse();
    await ownerCall('POST', '/api/stores', shopBody('bewave'));
    const elsewhere = await soldOutBlouse('bewave');
    const phone = '11988887777';

    const otherShop = await ask(elsewhere.id, { variantId: elsewhere.variants[0]!.id, phone });
    const otherProduct = await ask(product.id, { variantId: elsewhere.variants[0]!.id, phone });
    const noSuchVariant = await ask(product.id, { variantId: '0199a0f1-0000-7000-8000-000000000001', phone });
    const noSuchProduct = await ask('not-an-id', { variantId: product.variants[0]!.id, phone });
    const second = (
      await ownerCall('POST', '/api/stores/lessari/products', { name: 'Saia', priceCents: 9900 })
    ).json<ProductDetail>();
    const sameShopOtherProduct = await ask(product.id, { variantId: second.variants[0]!.id, phone });
    const unknownProduct = await ask('0199a0f1-0000-7000-8000-0000000000aa', { variantId: product.variants[0]!.id, phone });

    for (const response of [otherShop, otherProduct, noSuchVariant, sameShopOtherProduct, unknownProduct]) {
      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('RESTOCK_VARIANT_INVALID');
    }
    expect(noSuchProduct.statusCode).toBe(400);
    expect(await prisma.restockRequest.count()).toBe(0);
  });

  it('refuses a combination the shop switched off, and a product still in draft', async () => {
    const product = await soldOutBlouse();
    await ownerCall('PUT', `/api/stores/lessari/products/${product.id}/variants`, {
      variants: [{ id: product.variants[0]!.id, isActive: false }],
    });
    const draft = (
      await ownerCall('POST', '/api/stores/lessari/products', { name: 'Saia', priceCents: 9900, status: 'DRAFT' })
    ).json<ProductDetail>();

    const switchedOff = await ask(product.id, { variantId: product.variants[0]!.id, phone: '11988887777' });
    const inDraft = await ask(draft.id, { variantId: draft.variants[0]!.id, phone: '11988887777' });

    for (const response of [switchedOff, inDraft]) {
      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('RESTOCK_VARIANT_INVALID');
    }
  });

  it('answers a filled trap like a save, and saves nothing', async () => {
    const product = await soldOutBlouse();

    const response = await ask(product.id, {
      variantId: product.variants[0]!.id,
      phone: '11988887777',
      website: 'https://spam.example',
    });

    expect(response.statusCode).toBe(201);
    expect(await prisma.restockRequest.count()).toBe(0);
  });

  it('limits one address to a handful of requests', async () => {
    const product = await soldOutBlouse();
    const statuses: number[] = [];

    for (let index = 0; index < 11; index++) {
      const response = await ask(
        product.id,
        { variantId: product.variants[0]!.id, phone: `1198888${String(index).padStart(4, '0')}` },
        '10.9.9.9',
      );
      statuses.push(response.statusCode);
    }

    expect(statuses.slice(0, 10).every((status) => status === 201)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
