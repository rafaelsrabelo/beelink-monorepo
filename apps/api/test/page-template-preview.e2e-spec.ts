// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, PagePreview, Product, PublicSection, Section, Store, StorePage } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { draftOf } from './support/publish.js';
import { resetDatabase } from './support/reset-database.js';

const ADDRESS = { city: 'São Paulo', state: 'sp', zipCode: '01310-930' };
const PHOTO = 'https://res.cloudinary.com/demo/whey.jpg';

/**
 * A model previewed through the real pipe and the real database: who is answered, that it is drawn
 * from the shop's own products as the shop would serve it, that it is what applying then writes —
 * and that asking writes nothing.
 */
describe('page templates — a model previewed on a page', () => {
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

  const shop = (slug: string, session: AuthSession = owner) =>
    created<Store>('/api/stores', session, { name: slug, slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: ADDRESS });

  const site = (slug: string) =>
    created<Store>('/api/stores', owner, { name: slug, slug, type: 'INSTITUTIONAL', template: 'servicos-b2b', socialNetworks: {}, address: ADDRESS });

  const blankLanding = (store: string, session: AuthSession = owner) =>
    created<StorePage>(`/api/stores/${store}/pages`, session, { title: 'Campanha de inverno', template: 'em-branco' });

  const preview = (store: string, template: string, query = '', session: AuthSession | null = owner) =>
    call('GET', `/api/stores/${store}/page-templates/${template}/preview${query}`, session);

  async function previewed(store: string, template: string, query = ''): Promise<PagePreview> {
    const response = await preview(store, template, query);
    if (response.statusCode !== 200) throw new Error(`preview answered ${response.statusCode}: ${response.payload}`);
    return response.json<PagePreview>();
  }

  function expectRefused(response: Awaited<ReturnType<typeof call>>, statusCode: number, errorCode: string) {
    expect(response.statusCode).toBe(statusCode);
    expect(response.json<ApiErrorBody>().errorCode).toBe(errorCode);
  }

  const kindsOf = (sections: readonly PublicSection[]) => sections.map((section) => section.components.map((component) => component.kind));

  /** A band without the ids, which a preview makes up: what is left is what a visitor would see. */
  const drawn = (sections: readonly PublicSection[]) =>
    sections.map(({ id: _band, components, ...band }) => ({ ...band, components: components.map(({ id: _block, ...block }) => block) }));

  /** Every row a preview could have written, counted. */
  async function rows() {
    const [pages, sections, components, versions, leads, revisions] = await Promise.all([
      prisma.storePage.count(),
      prisma.storeSection.count(),
      prisma.storeComponent.count(),
      prisma.storePageVersion.count(),
      prisma.lead.count(),
      prisma.storePage.findMany({ select: { id: true, draftRevision: true, updatedAt: true, seoImageUrl: true, status: true }, orderBy: { id: 'asc' } }),
    ]);
    return { pages, sections, components, versions, leads, revisions };
  }

  describe('a shop’s landing', () => {
    let product: Product;
    let page: StorePage;

    beforeEach(async () => {
      await shop('lessari');
      product = await created<Product>('/api/stores/lessari/products', owner, { name: 'Whey Baunilha', priceCents: 12990, images: [{ url: PHOTO }] });
      page = await blankLanding('lessari');
    });

    it('answers only the shop’s owner, and only for a page of the shop', async () => {
      await shop('vizinha', stranger);
      const theirs = await blankLanding('vizinha', stranger);

      expectRefused(await preview('lessari', 'em-branco', `?pageId=${page.id}`, null), 401, 'AUTH_UNAUTHENTICATED');
      expectRefused(await preview('lessari', 'em-branco', `?pageId=${page.id}`, stranger), 403, 'STORE_FORBIDDEN');
      expectRefused(await preview('nenhuma', 'em-branco', `?pageId=${page.id}`), 404, 'STORE_NOT_FOUND');
      expectRefused(await preview('lessari', 'em-branco', `?pageId=${theirs.id}`), 404, 'PAGE_NOT_FOUND');
      // The same answer every `?pageId=` route gives: the query is refused before the shop is read.
      expectRefused(await preview('lessari', 'em-branco', '?pageId=nao-e-um-id'), 400, 'PAGE_NOT_FOUND');
    });

    it('draws the model from the shop’s own product, resolved as the shop would serve it', async () => {
      const answer = await previewed('lessari', 'lancamento', `?pageId=${page.id}&productId=${product.id}`);

      expect(answer.page).toEqual(page);
      expect(kindsOf(answer.sections)).toEqual([['BANNER'], ['HEADING', 'TEXT'], ['FEATURED_PRODUCT'], ['BENEFITS'], ['PRODUCTS'], ['FAQ'], ['CALL_TO_ACTION']]);

      const blocks = answer.sections.flatMap((section) => section.components);
      // The cover is the product's own picture, and it leads to the product by its address, not its id.
      expect(blocks[0]).toMatchObject({ kind: 'BANNER', display: 'SPLIT', items: [expect.objectContaining({ imageUrl: PHOTO, title: 'Whey Baunilha' })] });
      expect(JSON.stringify(blocks[0]!.items)).toContain(product.slug);
      expect(JSON.stringify(blocks[0]!.items)).not.toContain(product.id);
      // The product itself and the shelf are today's catalogue: name and price, read now.
      expect(blocks.find((component) => component.kind === 'FEATURED_PRODUCT')!.items).toEqual([expect.objectContaining({ name: 'Whey Baunilha', priceCents: 12990 })]);
      expect(blocks.find((component) => component.kind === 'PRODUCTS')!.items).toEqual([expect.objectContaining({ name: 'Whey Baunilha' })]);
    });

    it('writes nothing: every row, and the draft’s revision, are as they were', async () => {
      const before = await rows();
      const draftBefore = await draftOf(app, owner.accessToken, 'lessari', page.id);

      await previewed('lessari', 'lancamento', `?pageId=${page.id}&productId=${product.id}`);
      await previewed('lessari', 'promocao-relampago', `?pageId=${page.id}&productId=${product.id}`);
      await previewed('lessari', 'colecao', `?pageId=${page.id}&productId=${product.id}`);
      await previewed('lessari', 'em-branco', `?pageId=${page.id}`);
      expectRefused(await preview('lessari', 'lancamento', `?pageId=${page.id}`), 400, 'PAGE_PRODUCT_REQUIRED');

      expect(await rows()).toEqual(before);
      const draftAfter = await draftOf(app, owner.accessToken, 'lessari', page.id);
      expect(draftAfter).toEqual(draftBefore);
      expect(draftAfter.revision).toBe(0);
    });

    it('shows what applying then writes: the same bands, drawn the same', async () => {
      const query = `?pageId=${page.id}&productId=${product.id}`;
      const shown = await previewed('lessari', 'lancamento', query);

      const applied = await call('POST', `/api/stores/lessari/pages/${page.id}/apply-template`, owner, { template: 'lancamento', productId: product.id });
      expect(applied.statusCode).toBe(200);
      const canvas = (await call('GET', `/api/stores/lessari/pages/${page.id}/preview`, owner)).json<PagePreview>();

      expect(drawn(canvas.sections)).toEqual(drawn(shown.sections));
      // And previewed again over the draft it left, it is the same page still.
      expect(drawn((await previewed('lessari', 'lancamento', query)).sections)).toEqual(drawn(shown.sections));
    });

    it('refuses what applying refuses, by the same codes', async () => {
      await shop('vizinha', stranger);
      const theirs = await created<Product>('/api/stores/vizinha/products', stranger, { name: 'Dela', priceCents: 100 });
      const at = `?pageId=${page.id}`;

      expectRefused(await preview('lessari', 'nao-existe', at), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      // A site's home model: not for a shop. A landing's model: not for the home, which is the page when none is named.
      expectRefused(await preview('lessari', 'servicos-b2b', at), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      expectRefused(await preview('lessari', 'lancamento', `?productId=${product.id}`), 400, 'PAGE_TEMPLATE_UNAVAILABLE');

      expectRefused(await preview('lessari', 'lancamento', at), 400, 'PAGE_PRODUCT_REQUIRED');
      expectRefused(await preview('lessari', 'lancamento', `${at}&productId=${theirs.id}`), 400, 'PAGE_PRODUCT_INVALID');
      expectRefused(await preview('lessari', 'lancamento', `${at}&productId=nao-e-um-id`), 400, 'PAGE_PRODUCT_INVALID');
      expectRefused(await preview('lessari', 'lancamento', `${at}&productId=${product.id}&categoryId=nao-e-um-id`), 400, 'PAGE_CATEGORY_INVALID');
      expect((await preview('lessari', 'em-branco', `${at}&publish=true`)).statusCode).toBe(400);
    });

    it('draws a shop with no picture and nothing to promise without a hole', async () => {
      const bare = await created<Product>('/api/stores/lessari/products', owner, { name: 'Creatina', priceCents: 8990 });
      await prisma.store.update({ where: { slug: 'lessari' }, data: { paymentMethods: [] } });

      const answer = await previewed('lessari', 'lancamento', `?pageId=${page.id}&productId=${bare.id}`);

      // No picture: the cover is its words. No promise: the band is written hidden, and a visitor is not served it.
      expect(kindsOf(answer.sections)).toEqual([['HEADING'], ['HEADING', 'TEXT'], ['FEATURED_PRODUCT'], ['PRODUCTS'], ['FAQ'], ['CALL_TO_ACTION']]);
      expect(answer.sections[0]!.components[0]).toMatchObject({ title: 'Creatina' });
      expect(answer.sections.every((section) => section.components.length > 0)).toBe(true);
    });
  });

  describe('a site’s home', () => {
    beforeEach(async () => {
      await site('asfalto-norte');
    });

    it('is the page previewed when none is named, with the strip and the form the draft already holds', async () => {
      const strip = await created<Section>('/api/stores/asfalto-norte/sections', owner, { component: { kind: 'ANNOUNCEMENT', title: 'Atendemos todo o Norte' } });
      const home = await draftOf(app, owner.accessToken, 'asfalto-norte');
      const form = home.sections.flatMap((section) => section.components).find((component) => component.kind === 'CONTACT')!;
      const before = await rows();

      const answer = await previewed('asfalto-norte', 'servicos-b2b');

      expect(answer.page).toEqual(home.page);
      expect(answer.sections.map((section) => section.name)).toEqual([null, 'Início', 'Serviços', 'Sobre', 'Como funciona', 'Dúvidas', 'Contato']);
      expect(answer.sections[0]).toMatchObject({ id: strip.id, components: [{ id: strip.components[0]!.id, kind: 'ANNOUNCEMENT', title: 'Atendemos todo o Norte' }] });
      expect(answer.sections.at(-1)!.components[0]).toMatchObject({ id: form.id, kind: 'CONTACT' });
      expect(await previewed('asfalto-norte', 'servicos-b2b', `?pageId=${home.page.id}`)).toMatchObject({ page: home.page });

      expect(await rows()).toEqual(before);
      expect(await draftOf(app, owner.accessToken, 'asfalto-norte')).toEqual(home);
    });

    it('is refused a shop’s model on its landing, and offered the blank one', async () => {
      const page = await blankLanding('asfalto-norte');

      expectRefused(await preview('asfalto-norte', 'lancamento', `?pageId=${page.id}&productId=0199e000-0000-7000-8000-000000000001`), 400, 'PAGE_TEMPLATE_UNAVAILABLE');
      expect(kindsOf((await previewed('asfalto-norte', 'em-branco', `?pageId=${page.id}`)).sections)).toEqual([['HEADING']]);
    });
  });
});
