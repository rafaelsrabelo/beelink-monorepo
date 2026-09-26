// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  PagePreview,
  PageSlugAvailability,
  Product,
  PublicLanding,
  PublicStore,
  Section,
  StorePage,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

function shopBody(slug: string) {
  return {
    name: slug,
    slug,
    type: 'ECOMMERCE',
    socialNetworks: { whatsapp: '(11) 99999-8888' },
    address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
  };
}

/**
 * A shop's pages through the real pipe and the real database: the home every shop opens with, a
 * landing made from a template, and what a stranger is served of each.
 */
describe('pages — a home and its landings', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let stranger: AuthSession;
  let product: Product;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('vizinha'));

    await expectCreated(call('POST', '/api/stores', owner, shopBody('lessari')));
    await expectCreated(call('POST', '/api/stores', stranger, shopBody('vizinha')));
    product = await expectCreated<Product>(call('POST', '/api/stores/lessari/products', owner, { name: 'Whey Baunilha', priceCents: 12990 }));
  });

  function call(method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({
      method,
      url,
      headers: session ? { authorization: `Bearer ${session.accessToken}` } : {},
      ...(payload ? { payload } : {}),
    });
  }

  async function expectCreated<T = unknown>(pending: ReturnType<typeof call>): Promise<T> {
    const response = await pending;
    if (response.statusCode !== 201) throw new Error(`answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  function launch(over: object = {}) {
    return expectCreated<StorePage>(
      call('POST', '/api/stores/lessari/pages', owner, { title: 'Lançamento Whey', template: 'lancamento', productId: product.id, ...over }),
    );
  }

  it('opens every shop with its home, published at the shop’s own address', async () => {
    const pages = (await call('GET', '/api/stores/lessari/pages', owner)).json<StorePage[]>();

    expect(pages).toEqual([expect.objectContaining({ kind: 'HOME', slug: null, status: 'PUBLISHED' })]);
  });

  it('makes a draft landing from a template, with its bands on it and none on the home', async () => {
    const home = (await call('GET', '/api/stores/lessari/sections', owner)).json<Section[]>();
    const page = await launch();

    expect(page).toMatchObject({ kind: 'LANDING', slug: 'lancamento-whey', status: 'DRAFT', inMenu: false, usesChrome: true });

    const bands = (await call('GET', `/api/stores/lessari/sections?pageId=${page.id}`, owner)).json<Section[]>();
    expect(bands.flatMap((band) => band.components.map((component) => component.kind))).toEqual(
      expect.arrayContaining(['HEADING', 'TEXT', 'PRODUCTS', 'BENEFITS']),
    );
    expect((await call('GET', '/api/stores/lessari/sections', owner)).json<Section[]>()).toEqual(home);
  });

  it('refuses a second landing on an address the first holds, and says so before it is asked', async () => {
    await launch();

    const again = await call('POST', '/api/stores/lessari/pages', owner, { title: 'Lançamento Whey', template: 'em-branco' });
    expect(again.statusCode).toBe(409);
    expect(again.json<ApiErrorBody>().errorCode).toBe('PAGE_SLUG_TAKEN');

    const availability = (await call('GET', '/api/stores/lessari/pages/availability?slug=Lan%C3%A7amento%20Whey', owner)).json<PageSlugAvailability>();
    expect(availability).toEqual({ slug: 'lancamento-whey', available: false, reason: 'TAKEN' });
  });

  it('refuses a product template built around another shop’s product', async () => {
    const theirs = await expectCreated<Product>(call('POST', '/api/stores/vizinha/products', stranger, { name: 'Dela', priceCents: 100 }));

    const response = await call('POST', '/api/stores/lessari/pages', owner, { title: 'Dela', template: 'lancamento', productId: theirs.id });

    expect(response.statusCode).toBe(400);
    expect(response.json<ApiErrorBody>().errorCode).toBe('PAGE_PRODUCT_INVALID');
  });

  it('serves a landing to strangers only once it is published, and never once it is archived', async () => {
    const page = await launch();
    const url = '/api/stores/lessari/landings/lancamento-whey';

    expect((await call('GET', url, null)).statusCode).toBe(404);

    await call('PATCH', `/api/stores/lessari/pages/${page.id}`, owner, { status: 'PUBLISHED' });
    const served = await call('GET', url, null);
    expect(served.statusCode).toBe(200);
    expect(served.json<PublicLanding>()).toMatchObject({ slug: 'lancamento-whey', title: 'Lançamento Whey', usesChrome: true });
    expect(served.json<PublicLanding>().sections.length).toBeGreaterThan(0);

    await call('PATCH', `/api/stores/lessari/pages/${page.id}`, owner, { status: 'ARCHIVED' });
    expect((await call('GET', url, null)).statusCode).toBe(404);
  });

  it('previews a draft to its owner, and to nobody else', async () => {
    const page = await launch();

    const own = await call('GET', `/api/stores/lessari/pages/${page.id}/preview`, owner);
    expect(own.statusCode).toBe(200);
    expect(own.json<PagePreview>()).toMatchObject({ page: { id: page.id, status: 'DRAFT' } });

    expect((await call('GET', `/api/stores/lessari/pages/${page.id}/preview`, stranger)).statusCode).toBe(403);
    expect((await call('GET', `/api/stores/lessari/pages/${page.id}/preview`, null)).statusCode).toBe(401);
  });

  it('links a published landing from the shop when it is marked for the menu, and not before', async () => {
    const page = await launch({ inMenu: true });
    const links = async () => (await call('GET', '/api/stores/lessari/public', null)).json<PublicStore>().pages;

    expect(await links()).toEqual([]);
    await call('PATCH', `/api/stores/lessari/pages/${page.id}`, owner, { status: 'PUBLISHED' });
    expect(await links()).toEqual([{ slug: 'lancamento-whey', title: 'Lançamento Whey' }]);
  });

  it('keeps the strip on the home, and a landing’s shelves the shopkeeper’s to take off', async () => {
    const page = await launch();

    const strip = await call('POST', `/api/stores/lessari/sections?pageId=${page.id}`, owner, {
      component: { kind: 'ANNOUNCEMENT', title: 'Frete grátis' },
    });
    expect(strip.statusCode).toBe(400);
    expect(strip.json<ApiErrorBody>().errorCode).toBe('COMPONENT_KIND_HOME_ONLY');

    const bands = (await call('GET', `/api/stores/lessari/sections?pageId=${page.id}`, owner)).json<Section[]>();
    for (const band of bands.filter((b) => b.components.some((component) => component.kind === 'PRODUCTS'))) {
      expect((await call('DELETE', `/api/stores/lessari/sections/${band.id}`, owner)).statusCode).toBe(204);
    }
  });

  it('refuses a patch of the home, and answers another shop’s page as one that is not there', async () => {
    const [home] = (await call('GET', '/api/stores/lessari/pages', owner)).json<StorePage[]>();
    const patched = await call('PATCH', `/api/stores/lessari/pages/${home!.id}`, owner, { title: 'Início' });
    expect(patched.json<ApiErrorBody>().errorCode).toBe('PAGE_HOME_FIXED');

    const theirs = (await call('GET', '/api/stores/vizinha/pages', stranger)).json<StorePage[]>()[0]!;
    const foreign = await call('GET', `/api/stores/lessari/sections?pageId=${theirs.id}`, owner);
    expect(foreign.statusCode).toBe(404);
    expect(foreign.json<ApiErrorBody>().errorCode).toBe('PAGE_NOT_FOUND');
  });
});
