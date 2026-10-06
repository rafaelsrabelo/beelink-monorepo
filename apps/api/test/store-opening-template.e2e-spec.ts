// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  PageProblem,
  PageTemplateSummary,
  PageVersionSummary,
  PublicSection,
  PublicStore,
  Section,
  Store,
  StorePage,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { draftOf } from './support/publish.js';
import { resetDatabase } from './support/reset-database.js';

const ADDRESS = { city: 'São Paulo', state: 'sp', zipCode: '01310-930' };
const HOME_MODELS = ['vitrine-com-capa', 'por-categorias', 'ofertas', 'catalogo-enxuto'] as const;

/**
 * A store opened with a model, through the real pipe and the real database: what the model picker
 * of the create form is offered before any store exists, what a store opens with when it names a
 * model, and that one that names none opens exactly as it did.
 */
describe('store opening — the model a new store picks', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    owner = await signUpAndSignIn(app, newEmail('dona'));
  });

  function call(method: 'GET' | 'POST', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  const opened = (slug: string, over: object = {}) =>
    call('POST', '/api/stores', owner, { name: 'Lessari Suplementos', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: ADDRESS, ...over });

  async function shop(slug: string, over: object = {}): Promise<Store> {
    const response = await opened(slug, over);
    if (response.statusCode !== 201) throw new Error(`POST /api/stores answered ${response.statusCode}: ${response.payload}`);
    return response.json<Store>();
  }

  async function offered(url: string, session: AuthSession | null = owner): Promise<PageTemplateSummary[]> {
    const response = await call('GET', url, session);
    if (response.statusCode !== 200) throw new Error(`GET ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<PageTemplateSummary[]>();
  }

  const served = async (store: string) => (await call('GET', `/api/stores/${store}/public`, null)).json<PublicStore>().sections;
  const kindsOf = (sections: readonly (Section | PublicSection)[]) => sections.map((section) => section.components.map((component) => component.kind));
  /** A page's bands without what differs between two shops: ids, the shop, the clock. */
  const shapeOf = (sections: readonly Section[]) =>
    sections.map((section) => ({
      name: section.name,
      width: section.width,
      isActive: section.isActive,
      components: section.components.map(({ kind, title, subtitle, display, source, items, span, isActive }) => ({ kind, title, subtitle, display, source, items, span, isActive })),
    }));

  describe('what the create form is offered, before there is a store', () => {
    it('refuses a visitor with no session', async () => {
      const response = await call('GET', '/api/page-templates?storeType=ECOMMERCE', null);

      expect(response.statusCode).toBe(401);
      expect(response.json<ApiErrorBody>().errorCode).toBe('AUTH_UNAUTHENTICATED');
    });

    it('offers a shop the four models of a home, each asking for nothing, to someone who owns no store', async () => {
      const list = await offered('/api/page-templates?storeType=ECOMMERCE');

      expect(list.map((template) => template.id)).toEqual([...HOME_MODELS]);
      expect(list.every((template) => template.needs.length === 0 && !template.recommended)).toBe(true);
      expect(await prisma.store.count()).toBe(0);
    });

    it('offers a site its one model', async () => {
      expect((await offered('/api/page-templates?storeType=INSTITUTIONAL')).map((template) => template.id)).toEqual(['servicos-b2b']);
    });

    // Decision 3 of the epic: the category orders the suggested ones and hides none.
    it('puts the models suggested for the category picked first, and still offers every one', async () => {
      const market = await prisma.storeCategory.create({ data: { slug: 'mercado', name: 'Mercado' }, select: { id: true } });

      const list = await offered(`/api/page-templates?storeType=ECOMMERCE&categoryId=${market.id}`);

      expect(list.map((template) => [template.id, template.recommended])).toEqual([
        ['por-categorias', true],
        ['vitrine-com-capa', false],
        ['ofertas', false],
        ['catalogo-enxuto', false],
      ]);
    });

    it('suggests nothing for a category that is not there, and refuses a type that is none', async () => {
      const unknown = await offered('/api/page-templates?storeType=ECOMMERCE&categoryId=0199f000-0000-7000-8000-00000000dead');
      expect(unknown.map((template) => template.id)).toEqual([...HOME_MODELS]);
      expect(unknown.some((template) => template.recommended)).toBe(false);

      for (const query of ['', '?storeType=MARKETPLACE']) {
        const refused = await call('GET', `/api/page-templates${query}`, owner);
        expect(refused.statusCode).toBe(400);
        expect(refused.json<ApiErrorBody>().errorCode).toBe('PAGE_TEMPLATE_UNAVAILABLE');
      }
    });
  });

  describe('what "Nova landing" is offered, before the page exists', () => {
    it('offers a shop the four landings and a site the blank one, reading the shop and no page', async () => {
      await shop('lessari');
      await shop('asfalto', { type: 'INSTITUTIONAL', socialNetworks: {} });

      const forShop = await offered('/api/stores/lessari/page-templates?kind=LANDING');
      expect(forShop.map((template) => [template.id, template.needs])).toEqual([
        ['lancamento', ['PRODUCT']],
        ['promocao-relampago', ['PRODUCT']],
        ['colecao', ['PRODUCT']],
        ['em-branco', []],
      ]);
      expect((await offered('/api/stores/asfalto/page-templates?kind=LANDING')).map((template) => template.id)).toEqual(['em-branco']);
      // Asking made no page.
      expect(await prisma.storePage.count({ where: { kind: 'LANDING' } })).toBe(0);
    });

    it('orders them by the shop’s own category', async () => {
      const fashion = await prisma.storeCategory.create({ data: { slug: 'moda', name: 'Moda' }, select: { id: true } });
      await shop('lessari', { categoryId: fashion.id });

      const list = await offered('/api/stores/lessari/page-templates?kind=LANDING');

      expect(list[0]).toMatchObject({ id: 'colecao', recommended: true });
      expect(list).toHaveLength(4);
    });

    it('refuses a kind of page that is none, and someone else’s shop', async () => {
      await shop('lessari');
      const stranger = await signUpAndSignIn(app, newEmail('vizinha'));

      const unknown = await call('GET', '/api/stores/lessari/page-templates?kind=POPUP', owner);
      expect(unknown.statusCode).toBe(400);
      expect(unknown.json<ApiErrorBody>().errorCode).toBe('PAGE_TEMPLATE_UNAVAILABLE');

      const foreign = await call('GET', '/api/stores/lessari/page-templates?kind=LANDING', stranger);
      expect(foreign.statusCode).toBe(403);
    });
  });

  describe('a shop that names no model', () => {
    it('opens exactly as it did: its promises and one rail of every product, published', async () => {
      await shop('lessari');

      const draft = await draftOf(app, owner.accessToken, 'lessari');

      expect(kindsOf(draft.sections)).toEqual([['BENEFITS'], ['PRODUCTS']]);
      expect(draft.sections[1]!.components[0]).toMatchObject({ display: 'RAIL', source: 'ALL', title: null });
      expect(draft.revision).toBe(0);
      expect(draft.hasUnpublishedChanges).toBe(false);
      expect(kindsOf(await served('lessari'))).toEqual([['BENEFITS'], ['PRODUCTS']]);
    });

    // What `POST /stores` has always done with a site's model sent by a shop: the default page.
    it('opens the same page when it is sent a model that is not a shop’s', async () => {
      await shop('sem-modelo');
      await shop('com-modelo-de-site', { template: 'servicos-b2b' });

      const plain = await draftOf(app, owner.accessToken, 'sem-modelo');
      const ignored = await draftOf(app, owner.accessToken, 'com-modelo-de-site');

      expect(shapeOf(ignored.sections)).toEqual(shapeOf(plain.sections));
    });
  });

  describe('a shop that picks a model', () => {
    it.each(HOME_MODELS)('opens with %s, published, with the one shelf a home needs and no band it could not fill', async (template) => {
      const store = await shop('lessari', { template });

      const draft = await draftOf(app, owner.accessToken, 'lessari');
      const kinds = kindsOf(draft.sections).flat();

      expect(kinds.filter((kind) => kind === 'PRODUCTS')).toHaveLength(1);
      expect(kinds).not.toContain('CATEGORIES');
      expect(kinds).not.toContain('BANNER');
      expect(kinds).not.toContain('ANNOUNCEMENT');
      expect(draft.sections.every((section) => section.isActive && section.components.length > 0)).toBe(true);
      // Published with the store, like the default page: nothing waits for Publicar.
      expect(draft.page).toMatchObject({ kind: 'HOME', status: 'PUBLISHED' });
      expect(draft.revision).toBe(0);
      expect(draft.hasUnpublishedChanges).toBe(false);
      const versions = (await call('GET', `/api/stores/lessari/pages/${draft.page.id}/versions`, owner)).json<PageVersionSummary[]>();
      expect(versions.map((version) => [version.number, version.live])).toEqual([[1, true]]);
      expect(store.slug).toBe('lessari');

      // The one thing the page says is missing is the one thing a new shop lacks: a product.
      const problems = (await call('GET', `/api/stores/lessari/pages/${draft.page.id}/problems`, owner)).json<PageProblem[]>();
      expect(problems.map((problem) => problem.kind)).toEqual(['SHOWCASE_EMPTY']);
    });

    it('opens with the shop’s name over the page, and serves the first product in the shelf the moment it exists', async () => {
      await shop('lessari', { template: 'vitrine-com-capa' });

      const before = await served('lessari');
      expect(before.flatMap((section) => section.components).find((component) => component.kind === 'HEADING')).toMatchObject({ title: 'Lessari Suplementos' });

      const created = await call('POST', '/api/stores/lessari/products', owner, { name: 'Whey Baunilha', priceCents: 9990 });
      expect(created.statusCode).toBe(201);

      const shelf = (await served('lessari')).flatMap((section) => section.components).find((component) => component.kind === 'PRODUCTS');
      expect(shelf?.items).toHaveLength(1);
    });

    it('differs from the default page, which a shop that picks none still gets', async () => {
      await shop('padrao');
      await shop('com-capa', { template: 'vitrine-com-capa' });

      const plain = await draftOf(app, owner.accessToken, 'padrao');
      const model = await draftOf(app, owner.accessToken, 'com-capa');

      expect(kindsOf(plain.sections)).toEqual([['BENEFITS'], ['PRODUCTS']]);
      expect(kindsOf(model.sections)).toEqual([['HEADING'], ['BENEFITS'], ['PRODUCTS']]);
    });

    it('refuses an id that is no model, and a landing’s model, writing no store', async () => {
      for (const template of ['nao-existe', 'lancamento', 'em-branco']) {
        const response = await opened('lessari', { template });
        expect(response.statusCode).toBe(400);
      }
      expect(await prisma.store.count()).toBe(0);
    });
  });

  describe('a site', () => {
    it('opens with its model as it did, named or not, and whatever shop model it is sent', async () => {
      const site = { type: 'INSTITUTIONAL', socialNetworks: {} };
      await shop('sem-nome', site);
      await shop('com-nome', { ...site, template: 'servicos-b2b' });
      await shop('com-modelo-de-loja', { ...site, template: 'ofertas' });

      const plain = await draftOf(app, owner.accessToken, 'sem-nome');
      expect(plain.sections.map((section) => section.name)).toEqual(['Início', 'Serviços', 'Sobre', 'Como funciona', 'Dúvidas', 'Contato']);
      for (const slug of ['com-nome', 'com-modelo-de-loja']) {
        expect(shapeOf((await draftOf(app, owner.accessToken, slug)).sections)).toEqual(shapeOf(plain.sections));
      }
      const pages = (await call('GET', '/api/stores/com-modelo-de-loja/pages', owner)).json<StorePage[]>();
      expect(pages).toHaveLength(1);
    });
  });
});
