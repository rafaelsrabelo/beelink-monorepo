// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  PageDraft,
  PagePreview,
  PageTemplateSummary,
  Product,
  ProductCategory,
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
import { draftOf, publishPage } from './support/publish.js';
import { resetDatabase } from './support/reset-database.js';

const ADDRESS = { city: 'São Paulo', state: 'sp', zipCode: '01310-930' };
const photo = (name: string) => `https://res.cloudinary.com/demo/${name}.jpg`;
const HOME_MODELS = ['vitrine-com-capa', 'por-categorias', 'ofertas', 'catalogo-enxuto'] as const;

/**
 * The four models a shop's home is rearranged with, through the real pipe and the real database:
 * listed, previewed and applied from what the shop has — and from a shop that has nothing.
 */
describe('page templates — the models of a shop’s home', () => {
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

  function call(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, session: AuthSession | null, payload?: object) {
    return app.inject({ method, url, headers: session ? { authorization: `Bearer ${session.accessToken}` } : {}, ...(payload ? { payload } : {}) });
  }

  async function created<T>(url: string, payload: object): Promise<T> {
    const response = await call('POST', url, owner, payload);
    if (response.statusCode !== 201) throw new Error(`POST ${url} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  const shop = (slug: string, over: object = {}) =>
    created<Store>('/api/stores', { name: 'Lessari Suplementos', slug, type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: ADDRESS, ...over });

  const product = (store: string, body: object) => created<Product>(`/api/stores/${store}/products`, { priceCents: 9990, ...body });

  async function homeOf(store: string): Promise<StorePage> {
    return (await call('GET', `/api/stores/${store}/pages`, owner)).json<StorePage[]>().find((page) => page.kind === 'HOME')!;
  }

  async function applied(store: string, pageId: string, template: string): Promise<PageDraft> {
    const response = await call('POST', `/api/stores/${store}/pages/${pageId}/apply-template`, owner, { template });
    if (response.statusCode !== 200) throw new Error(`apply answered ${response.statusCode}: ${response.payload}`);
    return response.json<PageDraft>();
  }

  async function previewed(store: string, template: string, query = ''): Promise<PagePreview> {
    const response = await call('GET', `/api/stores/${store}/page-templates/${template}/preview${query}`, owner);
    if (response.statusCode !== 200) throw new Error(`preview answered ${response.statusCode}: ${response.payload}`);
    return response.json<PagePreview>();
  }

  const served = async (store: string) => (await call('GET', `/api/stores/${store}/public`, null)).json<PublicStore>().sections;
  const kindsOf = (sections: readonly (Section | PublicSection)[]) => sections.map((section) => section.components.map((component) => component.kind));
  const blocksOf = (sections: readonly Section[]) => sections.flatMap((section) => section.components);

  /** A shop with what every model reads: six products, five pictured, two on sale, two categories with products and one without. */
  async function stocked(store: string) {
    await shop(store);
    const proteins = await created<ProductCategory>(`/api/stores/${store}/product-categories`, { name: 'Proteínas' });
    const vitamins = await created<ProductCategory>(`/api/stores/${store}/product-categories`, { name: 'Vitaminas' });
    await created<ProductCategory>(`/api/stores/${store}/product-categories`, { name: 'Acessórios' });

    const products: Product[] = [];
    // One at a time: "newest" is the order they were made in.
    for (const body of [
      { name: 'Whey Baunilha', categoryId: proteins.id, images: [{ url: photo('whey') }] },
      { name: 'Creatina', categoryId: proteins.id, compareAtPriceCents: 12990, images: [{ url: photo('creatina') }] },
      { name: 'Vitamina C', categoryId: vitamins.id, images: [{ url: photo('vitamina-c') }] },
      { name: 'Ômega 3', categoryId: vitamins.id, compareAtPriceCents: 14990 },
      { name: 'Barra de proteína', images: [{ url: photo('barra') }] },
      { name: 'Pré-treino', images: [{ url: photo('pre-treino') }] },
    ]) {
      products.push(await product(store, body));
    }

    return { proteins, vitamins, products };
  }

  describe('listed', () => {
    it('offers a shop’s home the four, each asking the shopkeeper for nothing', async () => {
      await shop('lessari');
      const home = await homeOf('lessari');
      const four = HOME_MODELS.map((id) => ({ id, pageKinds: ['HOME'], storeTypes: ['ECOMMERCE'], recommended: false, needs: [] }));

      expect((await call('GET', '/api/stores/lessari/page-templates', owner)).json<PageTemplateSummary[]>()).toEqual(four);
      expect((await call('GET', `/api/stores/lessari/page-templates?pageId=${home.id}`, owner)).json<PageTemplateSummary[]>()).toEqual(four);
    });

    it('puts the one suggested for the shop’s category first', async () => {
      const category = await prisma.storeCategory.create({ data: { slug: 'padaria', name: 'Padaria' }, select: { id: true } });
      await shop('lessari', { categoryId: category.id });

      const offered = (await call('GET', '/api/stores/lessari/page-templates', owner)).json<PageTemplateSummary[]>();

      expect(offered.map((template) => [template.id, template.recommended])).toEqual([
        ['ofertas', true],
        ['vitrine-com-capa', false],
        ['por-categorias', false],
        ['catalogo-enxuto', false],
      ]);
    });

    it('offers them to no landing and to no site, and refuses them there', async () => {
      await shop('lessari');
      const landing = await created<StorePage>('/api/stores/lessari/pages', { title: 'Campanha', template: 'em-branco' });
      await created<Store>('/api/stores', { name: 'Asfalto Norte', slug: 'asfalto-norte', type: 'INSTITUTIONAL', socialNetworks: {}, address: ADDRESS });
      const siteHome = await homeOf('asfalto-norte');

      const onLanding = (await call('GET', `/api/stores/lessari/page-templates?pageId=${landing.id}`, owner)).json<PageTemplateSummary[]>();
      const onSite = (await call('GET', '/api/stores/asfalto-norte/page-templates', owner)).json<PageTemplateSummary[]>();
      for (const id of HOME_MODELS) {
        expect(onLanding.map((template) => template.id)).not.toContain(id);
        expect(onSite.map((template) => template.id)).not.toContain(id);
      }

      for (const [store, pageId] of [['lessari', landing.id], ['asfalto-norte', siteHome.id]] as const) {
        const refusedApply = await call('POST', `/api/stores/${store}/pages/${pageId}/apply-template`, owner, { template: 'vitrine-com-capa' });
        const refusedPreview = await call('GET', `/api/stores/${store}/page-templates/vitrine-com-capa/preview?pageId=${pageId}`, owner);

        for (const response of [refusedApply, refusedPreview]) {
          expect(response.statusCode).toBe(400);
          expect(response.json<ApiErrorBody>().errorCode).toBe('PAGE_TEMPLATE_UNAVAILABLE');
        }
      }
    });
  });

  it('leaves the page a new shop opens with as it was: its promises and one shelf', async () => {
    await shop('lessari');

    const draft = await draftOf(app, owner.accessToken, 'lessari');

    expect(kindsOf(draft.sections)).toEqual([['BENEFITS'], ['PRODUCTS']]);
    expect(blocksOf(draft.sections)[1]).toMatchObject({ display: 'RAIL', source: 'ALL', title: null });
    expect(draft.revision).toBe(0);
  });

  describe('in a shop with products, pictures, a sale and categories', () => {
    it('previews each model from what the shop has, as a visitor would be served it, writing nothing', async () => {
      const { products } = await stocked('lessari');
      const before = await draftOf(app, owner.accessToken, 'lessari');

      const cover = await previewed('lessari', 'vitrine-com-capa');
      // Six products: too few for "Novidades", which would repeat the shelf under it.
      expect(kindsOf(cover.sections)).toEqual([['BANNER'], ['BENEFITS'], ['CATEGORIES'], ['PRODUCTS'], ['PRODUCTS']]);
      // The three newest with a picture, newest first, each leading to its own product.
      expect(cover.sections[0]!.components[0]).toMatchObject({ display: 'CAROUSEL' });
      expect(cover.sections[0]!.components[0]!.items).toEqual(
        [products[5]!, products[4]!, products[2]!].map((row) => expect.objectContaining({ title: row.name, imageUrl: row.images[0]!.url, href: expect.stringContaining(row.slug) })),
      );
      const [sale, all] = cover.sections.slice(3).map((section) => section.components[0]!);
      expect(sale).toMatchObject({ title: 'Ofertas', source: 'ON_SALE' });
      expect(sale!.items.map((card) => ('name' in card ? card.name : null)).sort()).toEqual(['Creatina', 'Ômega 3']);
      expect(all!.items).toHaveLength(6);

      const aisles = await previewed('lessari', 'por-categorias');
      // The category with nothing on the shelf gets no shelf of its own.
      expect(kindsOf(aisles.sections)).toEqual([['HEADING'], ['CATEGORIES'], ['PRODUCTS'], ['PRODUCTS'], ['PRODUCTS'], ['BENEFITS']]);
      expect(aisles.sections[0]!.components[0]).toMatchObject({ title: 'Lessari Suplementos' });
      expect(aisles.sections.slice(2, 4).map((section) => [section.components[0]!.title, section.components[0]!.sourceCategory?.name, section.components[0]!.items.length])).toEqual([
        ['Proteínas', 'Proteínas', 2],
        ['Vitaminas', 'Vitaminas', 2],
      ]);

      const sales = await previewed('lessari', 'ofertas');
      expect(kindsOf(sales.sections)).toEqual([['BANNER'], ['FEATURED_PRODUCT'], ['PRODUCTS'], ['BENEFITS'], ['PRODUCTS']]);
      expect(sales.sections[0]!.components[0]!.items).toEqual([expect.objectContaining({ title: 'Ofertas', imageUrl: photo('creatina') })]);
      expect(sales.sections[1]!.components[0]!.items).toEqual([expect.objectContaining({ name: 'Creatina', compareAtPriceCents: 12990 })]);

      const lean = await previewed('lessari', 'catalogo-enxuto');
      expect(kindsOf(lean.sections)).toEqual([['CATEGORIES'], ['PRODUCTS'], ['BENEFITS']]);
      expect(lean.sections[1]!.components[0]).toMatchObject({ display: 'GRID', columns: 4 });

      expect(await draftOf(app, owner.accessToken, 'lessari')).toEqual(before);
    });

    it('applies a model over a home with a strip and content of its own: the strip stays, the rest is replaced, and nothing is published', async () => {
      await stocked('lessari');
      const home = await homeOf('lessari');
      const strip = await created<Section>('/api/stores/lessari/sections', { component: { kind: 'ANNOUNCEMENT', title: 'Retire na loja' } });
      await created<Section>('/api/stores/lessari/sections', { component: { kind: 'TEXT', body: 'Texto antigo do rascunho' } });
      const before = await draftOf(app, owner.accessToken, 'lessari');
      const servedBefore = await served('lessari');

      const after = await applied('lessari', home.id, 'vitrine-com-capa');

      expect(kindsOf(after.sections)).toEqual([['ANNOUNCEMENT'], ['BANNER'], ['BENEFITS'], ['CATEGORIES'], ['PRODUCTS'], ['PRODUCTS']]);
      expect(after.sections[0]).toMatchObject({ id: strip.id, components: [expect.objectContaining({ id: strip.components[0]!.id, title: 'Retire na loja' })] });
      expect(JSON.stringify(after.sections)).not.toContain('Texto antigo do rascunho');
      expect(after.sections.map((section) => section.position)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(after.revision).toBe(before.revision + 1);
      expect(after.hasUnpublishedChanges).toBe(true);
      expect(await served('lessari')).toEqual(servedBefore);

      // What the preview drew is what was written, band for band.
      expect(kindsOf((await previewed('lessari', 'vitrine-com-capa')).sections)).toEqual(kindsOf(after.sections));
    });

    it('serves the model to a visitor once the owner publishes', async () => {
      await stocked('lessari');
      const home = await homeOf('lessari');
      await created<Section>('/api/stores/lessari/sections', { component: { kind: 'ANNOUNCEMENT', title: 'Retire na loja' } });

      await applied('lessari', home.id, 'ofertas');
      expect(kindsOf(await served('lessari'))).toEqual([['BENEFITS'], ['PRODUCTS']]);

      await publishPage(app, owner.accessToken, 'lessari');

      const sections = await served('lessari');
      expect(kindsOf(sections)).toEqual([['ANNOUNCEMENT'], ['BANNER'], ['FEATURED_PRODUCT'], ['PRODUCTS'], ['BENEFITS'], ['PRODUCTS']]);
      expect(sections[3]!.components[0]!.items).toHaveLength(2);
      expect(sections[5]!.components[0]!.items).toHaveLength(6);
    });

    it('applies every model, one over the other, each leaving one strip at most and the shelves a home needs', async () => {
      await stocked('lessari');
      const home = await homeOf('lessari');

      for (const [index, template] of HOME_MODELS.entries()) {
        const draft = await applied('lessari', home.id, template);
        const blocks = blocksOf(draft.sections);

        expect(draft.revision).toBe(index + 1);
        expect(blocks.some((component) => component.kind === 'PRODUCTS')).toBe(true);
        expect(blocks.filter((component) => component.kind === 'ANNOUNCEMENT')).toHaveLength(0);
        expect(draft.sections.every((section) => section.isActive && section.components.length > 0)).toBe(true);
      }

      // The last showcase is still protected: the home's rule answers on what a model wrote.
      const last = await draftOf(app, owner.accessToken, 'lessari');
      const showcase = blocksOf(last.sections).find((component) => component.kind === 'PRODUCTS')!;
      const removed = await call('DELETE', `/api/stores/lessari/components/${showcase.id}`, owner);
      expect(removed.json<ApiErrorBody>().errorCode).toBe('COMPONENT_REQUIRED');
    });
  });

  describe('in a shop that lacks something', () => {
    it.each(HOME_MODELS)('applies %s to a shop with no product, no picture, no category and nothing to promise: a showcase, and no hole', async (template) => {
      await shop('lessari');
      await prisma.store.update({ where: { slug: 'lessari' }, data: { paymentMethods: [] } });
      const home = await homeOf('lessari');

      const draft = await applied('lessari', home.id, template);
      const blocks = blocksOf(draft.sections);

      // The home of a shop that sells is never left without its showcase, even with nothing to put on it.
      expect(blocks.filter((component) => component.kind === 'PRODUCTS')).toEqual([expect.objectContaining({ source: 'ALL', sourceCategoryId: null, isActive: true })]);
      expect(blocks.map((component) => component.kind).filter((kind) => kind !== 'PRODUCTS' && kind !== 'HEADING')).toEqual([]);
      expect(draft.sections.every((section) => section.isActive && section.components.length > 0)).toBe(true);
      expect(JSON.stringify(draft.sections)).not.toMatch(/ofert/i);

      await publishPage(app, owner.accessToken, 'lessari');
      const sections = await served('lessari');
      expect(sections.every((section) => section.components.length > 0)).toBe(true);
      expect(sections.flatMap((section) => section.components).some((component) => component.kind === 'PRODUCTS')).toBe(true);
    });

    it('arranges products with no picture and no category around the shop’s name, with no category band', async () => {
      await shop('lessari');
      for (const name of ['Um', 'Dois', 'Três', 'Quatro', 'Cinco', 'Seis', 'Sete', 'Oito', 'Nove']) await product('lessari', { name });
      const home = await homeOf('lessari');

      // Nine products: more than "Novidades" draws, so it is a shelf of its own above them all.
      const cover = await applied('lessari', home.id, 'vitrine-com-capa');
      expect(kindsOf(cover.sections)).toEqual([['HEADING'], ['BENEFITS'], ['PRODUCTS'], ['PRODUCTS']]);
      expect(blocksOf(cover.sections).slice(2).map((component) => [component.title, component.source])).toEqual([['Novidades', 'NEWEST'], ['Todos os produtos', 'ALL']]);
      expect(kindsOf((await applied('lessari', home.id, 'por-categorias')).sections)).toEqual([['HEADING'], ['PRODUCTS'], ['BENEFITS']]);
      expect(kindsOf((await applied('lessari', home.id, 'ofertas')).sections)).toEqual([['HEADING'], ['PRODUCTS'], ['BENEFITS'], ['PRODUCTS']]);

      const lean = await applied('lessari', home.id, 'catalogo-enxuto');
      expect(kindsOf(lean.sections)).toEqual([['PRODUCTS'], ['BENEFITS']]);
      expect(blocksOf(lean.sections).every((component) => component.sourceCategoryId === null)).toBe(true);
    });

    it('counts only what a visitor could buy or browse: a draft, a sold-out sale and a hidden category arrange nothing', async () => {
      await shop('lessari');
      const hidden = await created<ProductCategory>('/api/stores/lessari/product-categories', { name: 'Escondida' });
      const hid = await call('PUT', `/api/stores/lessari/product-categories/${hidden.id}`, owner, { name: 'Escondida', isActive: false });
      if (hid.statusCode !== 200) throw new Error(`hiding answered ${hid.statusCode}: ${hid.payload}`);
      await product('lessari', { name: 'Na categoria escondida', categoryId: hidden.id });
      await product('lessari', { name: 'Esgotado em oferta', compareAtPriceCents: 19990, trackStock: true, stockQuantity: 0, images: [{ url: photo('esgotado') }] });
      await product('lessari', { name: 'Rascunho', status: 'DRAFT', images: [{ url: photo('rascunho') }] });
      const home = await homeOf('lessari');

      const sales = await applied('lessari', home.id, 'ofertas');
      expect(JSON.stringify(sales.sections)).not.toMatch(/ofert|ON_SALE/i);
      // No picture on the shelf: the cover is the shop's name.
      expect(blocksOf(sales.sections)[0]).toMatchObject({ kind: 'HEADING', title: 'Lessari Suplementos' });

      const aisles = await applied('lessari', home.id, 'por-categorias');
      expect(kindsOf(aisles.sections)).toEqual([['HEADING'], ['PRODUCTS'], ['BENEFITS']]);
    });

    it('arranges a sale a running promotion makes, though no product has a price crossed out', async () => {
      await shop('lessari');
      const whey = await product('lessari', { name: 'Whey', images: [{ url: photo('whey') }] });
      await product('lessari', { name: 'Creatina' });
      const home = await homeOf('lessari');
      expect(JSON.stringify((await applied('lessari', home.id, 'ofertas')).sections)).not.toMatch(/ON_SALE/);

      const promotion = await call('POST', '/api/stores/lessari/promotions', owner, { name: 'Semana do whey', scope: 'PRODUCTS', discountKind: 'PERCENT', percentBps: 1000, startsAt: new Date(Date.now() - 86_400_000).toISOString(), productIds: [whey.id] });
      if (promotion.statusCode !== 201) throw new Error(`promotion answered ${promotion.statusCode}: ${promotion.payload}`);

      const sales = await applied('lessari', home.id, 'ofertas');
      expect(kindsOf(sales.sections)).toEqual([['BANNER'], ['PRODUCTS'], ['BENEFITS'], ['PRODUCTS']]);
      expect(blocksOf(sales.sections)[0]!.items).toEqual([expect.objectContaining({ imageUrl: photo('whey'), productId: whey.id })]);
    });
  });
});
