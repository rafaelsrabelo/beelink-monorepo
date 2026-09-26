// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  PageProblem,
  Product,
  PublicComponent,
  PublicFeaturedProduct,
  PublicStore,
  Section,
  StorePage,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';
import { publishPage } from './support/publish.js';

const shopBody = (slug: string) => ({
  name: slug,
  slug,
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
});

/**
 * A featured product through the real pipe and database: resolved when the page is read, so its price
 * and stock are the catalogue's now, and gone from the shop when the product is not on sale.
 */
describe('a featured product, read', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let byName: Record<string, Product>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    await created(call(owner, 'POST', '/api/stores', shopBody('lessari')));

    const bodies = [
      { name: 'Blusa Azul', priceCents: 5000, compareAtPriceCents: 7000 },
      { name: 'Blusa Rascunho', priceCents: 5000, status: 'DRAFT' },
      { name: 'Blusa Esgotada', priceCents: 5000, trackStock: true, stockQuantity: 0 },
      { name: 'Blusa Apagada', priceCents: 5000 },
    ];
    byName = {};
    for (const body of bodies) byName[body.name] = await created<Product>(call(owner, 'POST', '/api/stores/lessari/products', body));
  });

  function call(as: AuthSession, method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${as.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  async function created<T = unknown>(pending: ReturnType<typeof call>): Promise<T> {
    const response = await pending;
    if (response.statusCode !== 201) throw new Error(`answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  /** A featured product added to the home, as its own band. */
  async function feature(productName: string, over: object = {}): Promise<string> {
    const band = await created<Section>(
      call(owner, 'POST', '/api/stores/lessari/sections', {
        component: { kind: 'FEATURED_PRODUCT', title: 'Destaque', items: [{ id: 'p', productId: byName[productName]!.id }], ...over },
      }),
    );
    return band.components[0]!.id;
  }

  async function served(componentId: string): Promise<PublicComponent | undefined> {
    const store = (await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<PublicStore>();
    return store.sections.flatMap((section) => section.components).find((row) => row.id === componentId);
  }

  it('serves the product as a card with its price and discount, opening beside its words', async () => {
    const id = await feature('Blusa Azul');
    await publishPage(app, owner.accessToken, 'lessari');

    const block = await served(id);
    expect(block).toMatchObject({ kind: 'FEATURED_PRODUCT', display: 'IMAGE_LEFT' });
    expect(block?.items).toEqual([
      expect.objectContaining({ id: byName['Blusa Azul']!.id, name: 'Blusa Azul', priceCents: 5000, compareAtPriceCents: 7000, soldOut: false }),
    ]);
  });

  it('shows a price changed since Publicar without publishing again', async () => {
    const id = await feature('Blusa Azul');
    await publishPage(app, owner.accessToken, 'lessari');

    const edited = await call(owner, 'PUT', `/api/stores/lessari/products/${byName['Blusa Azul']!.id}`, { priceCents: 4500 });
    expect(edited.statusCode, edited.payload).toBe(200);
    const [card] = (await served(id))!.items as PublicFeaturedProduct[];
    expect(card?.priceCents).toBe(4500);
  });

  it('draws a sold-out product marked so, and nothing for a draft or a deleted one', async () => {
    const soldOut = await feature('Blusa Esgotada');
    const draft = await feature('Blusa Rascunho');
    const deleted = await feature('Blusa Apagada');
    await call(owner, 'DELETE', `/api/stores/lessari/products/${byName['Blusa Apagada']!.id}`);
    await publishPage(app, owner.accessToken, 'lessari');

    expect((await served(soldOut))?.items).toEqual([expect.objectContaining({ name: 'Blusa Esgotada', soldOut: true })]);
    expect((await served(draft))?.items).toEqual([]);
    expect((await served(deleted))?.items).toEqual([]);
  });

  it('warns at Publicar about a featured product the shop cannot draw', async () => {
    const draft = await feature('Blusa Rascunho');
    const pages = (await call(owner, 'GET', '/api/stores/lessari/pages')).json<StorePage[]>();
    const home = pages.find((page) => page.kind === 'HOME')!;

    const problems = (await call(owner, 'GET', `/api/stores/lessari/pages/${home.id}/problems`)).json<PageProblem[]>();
    expect(problems).toContainEqual(expect.objectContaining({ kind: 'FEATURED_PRODUCT_UNAVAILABLE', componentId: draft }));
  });

  it('refuses another shop\'s product, and drops a deleted one from the pick', async () => {
    const stranger = await signUpAndSignIn(app, newEmail('outra'));
    await created(call(stranger, 'POST', '/api/stores', shopBody('outra')));
    const theirs = await created<Product>(call(stranger, 'POST', '/api/stores/outra/products', { name: 'Deles', priceCents: 100 }));

    const refused = await call(owner, 'POST', '/api/stores/lessari/sections', {
      component: { kind: 'FEATURED_PRODUCT', items: [{ id: 'p', productId: theirs.id }] },
    });
    expect(refused.statusCode).toBe(400);
    expect(refused.json<ApiErrorBody>().errorCode).toBe('FEATURED_PRODUCT_INVALID');

    await call(owner, 'DELETE', `/api/stores/lessari/products/${byName['Blusa Apagada']!.id}`);
    const kept = await created<Section>(
      call(owner, 'POST', '/api/stores/lessari/sections', {
        component: { kind: 'FEATURED_PRODUCT', items: [{ id: 'p', productId: byName['Blusa Apagada']!.id }] },
      }),
    );
    expect(kept.components[0]!.items).toEqual([]);
  });
});
