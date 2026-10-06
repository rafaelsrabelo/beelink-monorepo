// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  LeadPage,
  PageDraft,
  PageVersionSummary,
  Product,
  ProductCategory,
  PublicLanding,
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
const PHOTO = 'https://res.cloudinary.com/demo/whey.jpg';

/**
 * A model applied to a page that already exists, through the real pipe and the real database: it
 * replaces the draft and never what a visitor is served, under the draft's revision, and it leaves
 * the strip, the leads and the page's rules as they were.
 */
describe('pages — a model applied to a draft', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;
  let address = 0;

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

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, session: AuthSession | null, payload?: object, headers: Record<string, string> = {}) {
    return app.inject({
      method,
      url,
      headers: { ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}), ...headers },
      ...(payload ? { payload } : {}),
    });
  }

  async function created<T>(url: string, session: AuthSession, payload: object): Promise<T> {
    const response = await call('POST', url, session, payload);
    if (response.statusCode !== 201) throw new Error(`POST ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  const shop = (slug: string, session: AuthSession = owner) =>
    created<Store>('/api/stores', session, { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: ADDRESS });

  const site = (slug: string) =>
    created<Store>('/api/stores', owner, { name: slug, slug, type: 'INSTITUTIONAL', template: 'servicos-b2b', socialNetworks: {}, address: ADDRESS });

  const blankLanding = (store: string, session: AuthSession = owner) =>
    created<StorePage>(`/api/stores/${store}/pages`, session, { title: 'Campanha de inverno', template: 'em-branco' });

  async function homeOf(store: string): Promise<StorePage> {
    const pages = (await call('GET', `/api/stores/${store}/pages`, owner)).json<StorePage[]>();
    return pages.find((page) => page.kind === 'HOME')!;
  }

  const apply = (store: string, pageId: string, body: object, session: AuthSession | null = owner, revision?: number) =>
    call('POST', `/api/stores/${store}/pages/${pageId}/apply-template`, session, body, revision === undefined ? {} : { 'x-page-revision': String(revision) });

  async function applied(store: string, pageId: string, body: object): Promise<PageDraft> {
    const response = await apply(store, pageId, body);
    if (response.statusCode !== 200) throw new Error(`apply answered ${response.statusCode}: ${response.payload}`);
    return response.json<PageDraft>();
  }

  const draft = (store: string, pageId: string) => draftOf(app, owner.accessToken, store, pageId);
  const kindsOf = (sections: readonly Section[]) => sections.map((section) => section.components.map((component) => component.kind));
  const blocksOf = (sections: readonly Section[]) => sections.flatMap((section) => section.components);

  function expectRefused(response: Awaited<ReturnType<typeof call>>, statusCode: number, errorCode: string) {
    expect(response.statusCode).toBe(statusCode);
    expect(response.json<ApiErrorBody>().errorCode).toBe(errorCode);
  }

  describe('who may apply one', () => {
    it('answers only the shop’s owner, and only for a page of the shop', async () => {
      await shop('lessari');
      await shop('vizinha', stranger);
      const page = await blankLanding('lessari');
      const theirs = await blankLanding('vizinha', stranger);
      const body = { template: 'em-branco' };

      expectRefused(await apply('lessari', page.id, body, null), 401, 'AUTH_UNAUTHENTICATED');
      expectRefused(await apply('lessari', page.id, body, stranger), 403, 'STORE_FORBIDDEN');
      expectRefused(await apply('nenhuma', page.id, body), 404, 'STORE_NOT_FOUND');
      expectRefused(await apply('lessari', theirs.id, body), 404, 'PAGE_NOT_FOUND');
      expectRefused(await apply('lessari', 'nao-e-um-id', body), 404, 'PAGE_NOT_FOUND');

      // Refused, each of them, before anything was written.
      expect((await draft('lessari', page.id)).revision).toBe(0);
    });
  });

  describe('a landing', () => {
    let product: Product;
    let page: StorePage;

    const servedLanding = async () => (await call('GET', '/api/stores/lessari/landings/campanha-de-inverno', null)).json<PublicLanding>();
    const versions = async () => (await call('GET', `/api/stores/lessari/pages/${page.id}/versions`, owner)).json<PageVersionSummary[]>();

    beforeEach(async () => {
      await shop('lessari');
      product = await created<Product>('/api/stores/lessari/products', owner, { name: 'Whey Baunilha', priceCents: 12990, images: [{ url: PHOTO }] });
      page = await blankLanding('lessari');
      const up = await call('PATCH', `/api/stores/lessari/pages/${page.id}`, owner, { status: 'PUBLISHED' });
      if (up.statusCode !== 200) throw new Error(`publishing answered ${up.statusCode}: ${up.payload}`);
    });

    it('replaces the draft with a product model and leaves what is served, and the page itself, as they were', async () => {
      const servedBefore = await servedLanding();
      const before = await draft('lessari', page.id);
      const home = await draft('lessari', (await homeOf('lessari')).id);
      expect(kindsOf(before.sections)).toEqual([['HEADING']]);

      const after = await applied('lessari', page.id, { template: 'lancamento', productId: product.id });

      expect(kindsOf(after.sections)).toEqual([['BANNER'], ['HEADING', 'TEXT'], ['FEATURED_PRODUCT'], ['BENEFITS'], ['PRODUCTS'], ['FAQ'], ['CALL_TO_ACTION']]);
      expect(after.sections.map((section) => section.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(after.revision).toBe(before.revision + 1);
      expect(after.hasUnpublishedChanges).toBe(true);
      // The answer is the draft as the editor would read it next.
      expect(await draft('lessari', page.id)).toEqual(after);

      // Not published: the same version is live, a visitor reads the same page, and the page's own row is untouched.
      expect(after.published).toEqual(before.published);
      expect(await versions()).toHaveLength(1);
      expect(await servedLanding()).toEqual(servedBefore);
      expect(after.page).toEqual(before.page);
      expect(after.page).toMatchObject({ status: 'PUBLISHED', seo: { imageUrl: null } });

      // And no other page of the shop was touched.
      expect(await draft('lessari', home.page.id)).toEqual(home);
    });

    it('serves the model once the owner publishes', async () => {
      await applied('lessari', page.id, { template: 'lancamento', productId: product.id });
      expect((await servedLanding()).sections.map((section) => section.components.map((component) => component.kind))).toEqual([['HEADING']]);

      const published = await call('POST', `/api/stores/lessari/pages/${page.id}/publish`, owner, {});
      expect(published.statusCode).toBe(201);

      const served = (await servedLanding()).sections.flatMap((section) => section.components);
      expect(served[0]).toMatchObject({ kind: 'BANNER', display: 'SPLIT' });
      expect(served.some((component) => component.kind === 'FEATURED_PRODUCT')).toBe(true);
    });

    it('refuses a write from a tab that read an older draft, and writes nothing', async () => {
      await call('POST', `/api/stores/lessari/sections?pageId=${page.id}`, owner, { component: { kind: 'TEXT', body: 'Outra aba' } });
      const before = await draft('lessari', page.id);
      expect(before.revision).toBe(1);

      expectRefused(await apply('lessari', page.id, { template: 'lancamento', productId: product.id }, owner, 0), 409, 'PAGE_DRAFT_STALE');
      expect(await draft('lessari', page.id)).toEqual(before);

      const accepted = await apply('lessari', page.id, { template: 'lancamento', productId: product.id }, owner, 1);
      expect(accepted.statusCode).toBe(200);
      expect(accepted.json<PageDraft>().revision).toBe(2);

      // A caller that names no revision is not checked, like every other write of the draft.
      expect((await applied('lessari', page.id, { template: 'em-branco' })).revision).toBe(3);
    });

    it('refuses a model that is not one, one for another page or store, and one missing what it is built around', async () => {
      await shop('vizinha', stranger);
      const theirs = await created<Product>('/api/stores/vizinha/products', stranger, { name: 'Dela', priceCents: 100 });
      const home = await homeOf('lessari');
      const before = await draft('lessari', page.id);

      expectRefused(await apply('lessari', page.id, { template: 'nao-existe' }), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      expectRefused(await apply('lessari', page.id, {}), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      // A site's home model: not for a shop, and not for a landing.
      expectRefused(await apply('lessari', page.id, { template: 'servicos-b2b' }), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      // A landing's model on the home.
      expectRefused(await apply('lessari', home.id, { template: 'lancamento', productId: product.id }), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      expectRefused(await apply('lessari', home.id, { template: 'em-branco' }), 400, 'PAGE_TEMPLATE_UNAVAILABLE');

      expectRefused(await apply('lessari', page.id, { template: 'lancamento' }), 400, 'PAGE_PRODUCT_REQUIRED');
      expectRefused(await apply('lessari', page.id, { template: 'colecao', productId: null }), 400, 'PAGE_PRODUCT_REQUIRED');
      expectRefused(await apply('lessari', page.id, { template: 'lancamento', productId: theirs.id }), 400, 'PAGE_PRODUCT_INVALID');
      expectRefused(await apply('lessari', page.id, { template: 'lancamento', productId: 'nao-e-um-id' }), 400, 'PAGE_PRODUCT_INVALID');
      expectRefused(await apply('lessari', page.id, { template: 'lancamento', categoryId: 'nao-e-um-id' }), 400, 'PAGE_CATEGORY_INVALID');
      expect((await apply('lessari', page.id, { template: 'em-branco', publish: true })).statusCode).toBe(400);

      expect(await draft('lessari', page.id)).toEqual(before);
      expect((await draft('lessari', home.id)).revision).toBe(0);
    });

    it('arranges a shop with no picture and no category without a hole or an id that is not there', async () => {
      const bare = await created<Product>('/api/stores/lessari/products', owner, { name: 'Creatina', priceCents: 8990 });

      const collection = await applied('lessari', page.id, { template: 'colecao', productId: bare.id });

      // No picture: the cover is its words. No category: the page is about the product, beside the newest.
      expect(kindsOf(collection.sections)).toEqual([['HEADING'], ['TEXT'], ['FEATURED_PRODUCT'], ['PRODUCTS'], ['BENEFITS']]);
      const blocks = blocksOf(collection.sections);
      expect(blocks[0]).toMatchObject({ title: 'Creatina' });
      expect(blocks.every((component) => component.sourceCategoryId === null)).toBe(true);
      expect(blocks.find((component) => component.kind === 'FEATURED_PRODUCT')!.items).toEqual([{ id: 'destaque', productId: bare.id }]);
      expect(collection.sections.every((section) => section.components.length > 0)).toBe(true);
    });

    it('builds a collection around the product’s category when it has one', async () => {
      const category = await created<ProductCategory>('/api/stores/lessari/product-categories', owner, { name: 'Proteínas' });
      const whey = await created<Product>('/api/stores/lessari/products', owner, { name: 'Whey Morango', priceCents: 12990, categoryId: category.id, images: [{ url: PHOTO }] });

      const collection = await applied('lessari', page.id, { template: 'colecao', productId: whey.id });

      const blocks = blocksOf(collection.sections);
      expect(blocks[0]).toMatchObject({ kind: 'BANNER', items: [expect.objectContaining({ imageUrl: PHOTO, target: 'CATEGORY', categoryId: category.id })] });
      expect(blocks.find((component) => component.kind === 'PRODUCTS')).toMatchObject({ source: 'CATEGORY', sourceCategoryId: category.id });
    });
  });

  it('gives a shop with no product the blank model, and refuses it a product’s', async () => {
    await shop('lessari');
    const page = await created<StorePage>('/api/stores/lessari/pages', owner, { title: 'Em breve', template: 'em-branco' });
    await call('POST', `/api/stores/lessari/sections?pageId=${page.id}`, owner, { component: { kind: 'TEXT', body: 'Rascunho antigo' } });

    expectRefused(await apply('lessari', page.id, { template: 'promocao-relampago' }), 400, 'PAGE_PRODUCT_REQUIRED');

    const blank = await applied('lessari', page.id, { template: 'em-branco' });
    expect(kindsOf(blank.sections)).toEqual([['HEADING']]);
    expect(blocksOf(blank.sections)[0]).toMatchObject({ title: 'Em breve' });
  });

  describe('a site’s home', () => {
    const served = async () => (await call('GET', '/api/stores/asfalto-norte/public', null)).json<PublicStore>().sections;
    const sent = (formId: string, name: string) =>
      call(
        'POST',
        '/api/stores/asfalto-norte/contact',
        null,
        { componentId: formId, name, answers: { email: 'a@b.co', telefone: '11988887777', mensagem: 'oi' } },
        { 'x-forwarded-for': `203.0.113.${(address += 1)}` },
      );
    const leads = async () => (await call('GET', '/api/stores/asfalto-norte/leads', owner)).json<LeadPage>();

    let home: StorePage;

    beforeEach(async () => {
      await site('asfalto-norte');
      home = await homeOf('asfalto-norte');
    });

    it('replaces the draft and leaves the site as it is served', async () => {
      const servedBefore = await served();
      await call('POST', '/api/stores/asfalto-norte/sections', owner, { component: { kind: 'HEADING', title: 'Rascunho' } });
      expect((await draft('asfalto-norte', home.id)).sections).toHaveLength(7);

      const after = await applied('asfalto-norte', home.id, { template: 'servicos-b2b' });

      expect(after.sections.map((section) => section.name)).toEqual(['Início', 'Serviços', 'Sobre', 'Como funciona', 'Dúvidas', 'Contato']);
      expect(after.revision).toBe(2);
      expect(await served()).toEqual(servedBefore);
    });

    it('keeps the strip above the header: the same one, and still the only one', async () => {
      const added = await created<Section>('/api/stores/asfalto-norte/sections', owner, { component: { kind: 'ANNOUNCEMENT', title: 'Atendemos todo o Norte' } });
      const strip = added.components[0]!;

      const after = await applied('asfalto-norte', home.id, { template: 'servicos-b2b' });

      const strips = blocksOf(after.sections).filter((component) => component.kind === 'ANNOUNCEMENT');
      expect(strips).toHaveLength(1);
      expect(strips[0]).toMatchObject({ id: strip.id, sectionId: added.id, title: 'Atendemos todo o Norte' });
      expect(after.sections[0]!.id).toBe(added.id);
      expect(after.sections).toHaveLength(7);
      expect(after.sections.map((section) => section.position)).toEqual([0, 1, 2, 3, 4, 5, 6]);

      // Applied again, it is still that one — and the shop's rule about a second still answers.
      const again = await applied('asfalto-norte', home.id, { template: 'servicos-b2b' });
      expect(blocksOf(again.sections).filter((component) => component.kind === 'ANNOUNCEMENT').map((component) => component.id)).toEqual([strip.id]);
      const second = await call('POST', '/api/stores/asfalto-norte/sections', owner, { component: { kind: 'ANNOUNCEMENT', title: 'Outra' } });
      expectRefused(second, 409, 'COMPONENT_KIND_SINGLETON');
    });

    it('keeps every lead, still pointing at the form, which keeps its id', async () => {
      const formId = blocksOf((await draft('asfalto-norte', home.id)).sections).find((component) => component.kind === 'CONTACT')!.id;
      expect((await sent(formId, 'Carlos')).statusCode).toBe(204);

      const after = await applied('asfalto-norte', home.id, { template: 'servicos-b2b' });

      const forms = blocksOf(after.sections).filter((component) => component.kind === 'CONTACT');
      expect(forms.map((component) => component.id)).toEqual([formId]);
      expect((await leads()).leads).toEqual([expect.objectContaining({ name: 'Carlos', componentId: formId })]);

      // The form a visitor still sees is the published one: it goes on taking leads, linked to the same row.
      expect((await sent(formId, 'Marina')).statusCode).toBe(204);
      const page = await leads();
      expect(page.total).toBe(2);
      expect(page.leads.every((lead) => lead.componentId === formId)).toBe(true);
      expect(await prisma.lead.count({ where: { componentId: { not: null }, component: null } })).toBe(0);
    });

    it('keeps the leads of a form the model does not bring, unlinked, as when the block is deleted', async () => {
      const page = await blankLanding('asfalto-norte');
      const band = await created<Section>(`/api/stores/asfalto-norte/sections?pageId=${page.id}`, owner, { component: { kind: 'CONTACT', title: 'Peça um orçamento' } });
      const formId = band.components[0]!.id;
      await call('PATCH', `/api/stores/asfalto-norte/pages/${page.id}`, owner, { status: 'PUBLISHED' });
      expect((await sent(formId, 'Carlos')).statusCode).toBe(204);
      expect((await leads()).leads[0]).toMatchObject({ componentId: formId });

      const after = await applied('asfalto-norte', page.id, { template: 'em-branco' });

      expect(kindsOf(after.sections)).toEqual([['HEADING']]);
      expect((await leads()).leads).toEqual([expect.objectContaining({ name: 'Carlos', componentId: null })]);

      // Still published, the form still takes a lead; it has no row to point at until the next Publicar.
      expect((await sent(formId, 'Marina')).statusCode).toBe(204);
      expect((await leads()).leads.map((lead) => lead.componentId)).toEqual([null, null]);
      expect(await prisma.lead.count()).toBe(2);
    });

    it('refuses a site a shop’s model on its landing', async () => {
      const page = await blankLanding('asfalto-norte');

      expectRefused(await apply('asfalto-norte', page.id, { template: 'lancamento', productId: '0199e000-0000-7000-8000-000000000001' }), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      expectRefused(await apply('asfalto-norte', page.id, { template: 'servicos-b2b' }), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
    });
  });
});
