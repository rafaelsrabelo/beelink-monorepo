// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PageTemplateSummary, Section, Store, StorePage } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { resetDatabase } from './support/reset-database.js';

const ADDRESS = { city: 'São Paulo', state: 'sp', zipCode: '01310-930' };

/**
 * The gallery of models through the real pipe and the real database: who is answered, what a page of
 * each kind in a store of each type is offered, and what a shop's category does to the order.
 */
describe('page templates — the models a page may be arranged with', () => {
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
    owner = await signUpAndSignIn(app, newEmail('dona'));
    stranger = await signUpAndSignIn(app, newEmail('vizinha'));
  });

  function call(method: 'GET' | 'POST', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({
      method,
      url,
      headers: session ? { authorization: `Bearer ${session.accessToken}` } : {},
      ...(payload ? { payload } : {}),
    });
  }

  async function created<T>(url: string, session: AuthSession, payload: object): Promise<T> {
    const response = await call('POST', url, session, payload);
    if (response.statusCode !== 201) throw new Error(`POST ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  /** The platform's taxonomy is seeded, not migrated, and the reset empties it: a test writes the row it needs. */
  async function category(slug: string): Promise<string> {
    const row = await prisma.storeCategory.create({ data: { slug, name: slug }, select: { id: true } });
    return row.id;
  }

  function shop(slug: string, session: AuthSession = owner, over: object = {}) {
    return created<Store>('/api/stores', session, {
      name: slug,
      slug,
      type: 'ECOMMERCE',
      socialNetworks: { whatsapp: '(11) 99999-8888' },
      address: ADDRESS,
      ...over,
    });
  }

  function site(slug: string, over: object = {}) {
    return created<Store>('/api/stores', owner, { name: slug, slug, type: 'INSTITUTIONAL', socialNetworks: {}, address: ADDRESS, ...over });
  }

  function blankLanding(store: string) {
    return created<StorePage>(`/api/stores/${store}/pages`, owner, { title: 'Campanha', template: 'em-branco' });
  }

  async function offered(url: string): Promise<PageTemplateSummary[]> {
    const response = await call('GET', url, owner);
    if (response.statusCode !== 200) throw new Error(`GET ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<PageTemplateSummary[]>();
  }

  describe('who is answered', () => {
    beforeEach(async () => {
      await shop('lessari');
    });

    it('refuses a visitor with no session', async () => {
      const response = await call('GET', '/api/stores/lessari/page-templates', null);

      expect(response.statusCode).toBe(401);
      expect(response.json<ApiErrorBody>().errorCode).toBe('AUTH_UNAUTHENTICATED');
    });

    it('refuses someone else’s shop', async () => {
      const response = await call('GET', '/api/stores/lessari/page-templates', stranger);

      expect(response.statusCode).toBe(403);
      expect(response.json<ApiErrorBody>().errorCode).toBe('STORE_FORBIDDEN');
    });

    it('answers a shop that is not there as not there', async () => {
      const response = await call('GET', '/api/stores/nenhuma/page-templates', owner);

      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorBody>().errorCode).toBe('STORE_NOT_FOUND');
    });

    it('answers another shop’s page as a page that is not there, and refuses an id that is none', async () => {
      await shop('vizinha', stranger);
      const theirs = await created<StorePage>('/api/stores/vizinha/pages', stranger, { title: 'Dela', template: 'em-branco' });

      const foreign = await call('GET', `/api/stores/lessari/page-templates?pageId=${theirs.id}`, owner);
      expect(foreign.statusCode).toBe(404);
      expect(foreign.json<ApiErrorBody>().errorCode).toBe('PAGE_NOT_FOUND');

      // The same answer every `?pageId=` route gives: the query is refused before the shop is read.
      const malformed = await call('GET', '/api/stores/lessari/page-templates?pageId=nao-e-um-id', owner);
      expect(malformed.statusCode).toBe(400);
      expect(malformed.json<ApiErrorBody>().errorCode).toBe('PAGE_NOT_FOUND');
    });
  });

  describe('what a page is offered', () => {
    it('offers a shop’s landing the four it can be made from, each saying what it asks for', async () => {
      await shop('lessari');
      const page = await blankLanding('lessari');

      expect(await offered(`/api/stores/lessari/page-templates?pageId=${page.id}`)).toEqual([
        { id: 'lancamento', pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE'], recommended: false, needs: ['PRODUCT'] },
        { id: 'promocao-relampago', pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE'], recommended: false, needs: ['PRODUCT'] },
        { id: 'colecao', pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE'], recommended: false, needs: ['PRODUCT'] },
        { id: 'em-branco', pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE', 'INSTITUTIONAL'], recommended: false, needs: [] },
      ]);
    });

    it('offers a shop’s home none yet, with or without the home named', async () => {
      await shop('lessari');
      const [home] = (await call('GET', '/api/stores/lessari/pages', owner)).json<StorePage[]>();

      expect(await offered('/api/stores/lessari/page-templates')).toEqual([]);
      expect(await offered(`/api/stores/lessari/page-templates?pageId=${home!.id}`)).toEqual([]);
    });

    it('offers a site’s home its own model, and its landing a blank page only', async () => {
      await site('asfalto-norte');
      const page = await blankLanding('asfalto-norte');

      expect(await offered('/api/stores/asfalto-norte/page-templates')).toEqual([
        { id: 'servicos-b2b', pageKinds: ['HOME'], storeTypes: ['INSTITUTIONAL'], recommended: false, needs: [] },
      ]);
      expect((await offered(`/api/stores/asfalto-norte/page-templates?pageId=${page.id}`)).map((template) => template.id)).toEqual(['em-branco']);
    });
  });

  describe('what the shop’s category does', () => {
    it('puts the models suggested for it first, and still offers the others', async () => {
      await shop('lessari', owner, { categoryId: await category('moda') });
      const page = await blankLanding('lessari');

      const templates = await offered(`/api/stores/lessari/page-templates?pageId=${page.id}`);

      expect(templates.map((template) => [template.id, template.recommended])).toEqual([
        ['colecao', true],
        ['lancamento', false],
        ['promocao-relampago', false],
        ['em-branco', false],
      ]);
    });

    it('suggests a site of services its model', async () => {
      await site('asfalto-norte', { categoryId: await category('servicos') });

      expect(await offered('/api/stores/asfalto-norte/page-templates')).toEqual([expect.objectContaining({ id: 'servicos-b2b', recommended: true })]);
    });

    it('suggests none to a shop whose category no model names, in the catalogue’s order', async () => {
      await shop('lessari', owner, { categoryId: await category('outros') });
      const page = await blankLanding('lessari');

      const templates = await offered(`/api/stores/lessari/page-templates?pageId=${page.id}`);

      expect(templates.map((template) => template.id)).toEqual(['lancamento', 'promocao-relampago', 'colecao', 'em-branco']);
      expect(templates.some((template) => template.recommended)).toBe(false);
    });
  });

  it('only lists: asking changes no band of the page', async () => {
    await site('asfalto-norte');
    const before = (await call('GET', '/api/stores/asfalto-norte/sections', owner)).json<Section[]>();

    await offered('/api/stores/asfalto-norte/page-templates');

    expect((await call('GET', '/api/stores/asfalto-norte/sections', owner)).json<Section[]>()).toEqual(before);
  });
});
