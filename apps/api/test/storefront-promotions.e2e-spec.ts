// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  AuthSession,
  OrderQuote,
  ProductCategory,
  ProductDetail,
  Promotion,
  PublicProductCard,
  PublicProductDetail,
  PublicStore,
  Section,
  StorefrontCartProducts,
  StorefrontCatalog,
} from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { publishPage } from './support/publish.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = { name: 'Lessari', slug: 'lessari', type: 'ECOMMERCE', socialNetworks: { whatsapp: '(11) 99999-8888' }, address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' } };

const DAY = 24 * 60 * 60 * 1000;
const daysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

/**
 * The shop window while promotions run: the price a visitor reads, what is "on sale", and the order
 * "maior desconto" puts the shelf in. Whey sits in a subcategory of Proteínas; the kit is marked
 * down by the shop itself (de 120 por 100); the bar's price is one a percentage does not divide.
 */
describe('the shop window under promotions', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let proteins: ProductCategory;
  let whey: ProductDetail;
  let creatine: ProductDetail;
  let kit: ProductDetail;
  let dear: ProductDetail;

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
    await call('POST', '/api/stores', shopBody);

    proteins = await add<ProductCategory>('product-categories', { name: 'Proteínas' });
    const wheys = await add<ProductCategory>('product-categories', { name: 'Whey', parentId: proteins.id });
    // Positions in this order: what "relevancia" and every tie fall back to.
    whey = await add<ProductDetail>('products', { name: 'Whey', priceCents: 18990, categoryId: wheys.id });
    creatine = await add<ProductDetail>('products', { name: 'Creatina', priceCents: 5990 });
    await add<ProductDetail>('products', { name: 'Barra', priceCents: 1899 });
    kit = await add<ProductDetail>('products', { name: 'Kit', priceCents: 10000, compareAtPriceCents: 12000 });
    dear = await add<ProductDetail>('products', { name: 'Caro', priceCents: 50000 });
  });

  function call(method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) {
    return app.inject({ method, url, headers: { authorization: `Bearer ${owner.accessToken}` }, ...(payload ? { payload } : {}) });
  }

  async function add<T>(path: string, payload: object): Promise<T> {
    const response = await call('POST', `/api/stores/lessari/${path}`, payload);
    if (response.statusCode !== 201) throw new Error(`POST ${path} answered ${response.statusCode}: ${response.payload}`);
    return response.json<T>();
  }

  const promotion = (body: object) => add<Promotion>('promotions', { name: 'Promoção', scope: 'CART', discountKind: 'PERCENT', percentBps: 1000, startsAt: daysFromNow(-1), ...body });

  async function shelf(query = ''): Promise<StorefrontCatalog> {
    const response = await app.inject({ method: 'GET', url: `/api/stores/lessari/catalog${query}` });
    if (response.statusCode !== 200) throw new Error(`GET catalog answered ${response.statusCode}: ${response.payload}`);
    return response.json<StorefrontCatalog>();
  }

  const names = (catalog: StorefrontCatalog) => catalog.products.map((product) => product.name);
  const priced = (cards: readonly PublicProductCard[]) => Object.fromEntries(cards.map((card) => [card.name, [card.priceCents, card.compareAtPriceCents, card.promotionName ?? null]]));

  /** 10% on Proteínas, R$ 10,00 off each Creatina and Caro, and one that has not started. */
  async function runPromotions() {
    await promotion({ name: 'Proteínas', scope: 'CATEGORIES', categoryIds: [proteins.id] });
    await promotion({ name: 'Dez reais', scope: 'PRODUCTS', discountKind: 'FIXED', percentBps: null, amountCents: 1000, productIds: [creatine.id, dear.id] });
    await promotion({ name: 'Semana que vem', percentBps: 5000, startsAt: daysFromNow(3) });
  }

  it('reads the catalogue’s own prices while no promotion runs', async () => {
    const catalog = await shelf();
    expect(priced(catalog.products)).toEqual({
      Whey: [18990, null, null],
      Creatina: [5990, null, null],
      Barra: [1899, null, null],
      Kit: [10000, 12000, null],
      Caro: [50000, null, null],
    });
    expect(names(await shelf('?desconto=1'))).toEqual(['Kit']);
    expect(names(await shelf('?ordenar=maior-desconto'))[0]).toBe('Kit');
  });

  it('prices each card with the promotion that reaches it, what it was beside it, and names the promotion', async () => {
    await runPromotions();

    expect(priced((await shelf()).products)).toEqual({
      // Through the category above its own.
      Whey: [17091, 18990, 'Proteínas'],
      Creatina: [4990, 5990, 'Dez reais'],
      Barra: [1899, null, null],
      Kit: [10000, 12000, null],
      Caro: [49000, 50000, 'Dez reais'],
    });
  });

  it('prices the product’s page and the cart’s read the same, each combination by its own price', async () => {
    await runPromotions();

    const page = (await app.inject({ method: 'GET', url: `/api/stores/lessari/catalog/${whey.slug}` })).json<PublicProductDetail>();
    expect(page).toMatchObject({ priceCents: 17091, compareAtPriceCents: 18990, promotionName: 'Proteínas', priceRange: { minCents: 17091, maxCents: 17091 } });
    expect(page.variants.map((variant) => [variant.priceCents, variant.compareAtPriceCents, variant.promotionName])).toEqual([[17091, 18990, 'Proteínas']]);

    const cart = (await app.inject({ method: 'GET', url: `/api/stores/lessari/cart?produto=${whey.id}&produto=${kit.id}` })).json<StorefrontCartProducts>();
    expect(priced(cart.products)).toEqual({ Whey: [17091, 18990, 'Proteínas'], Kit: [10000, 12000, null] });
  });

  it('charges what the shelf showed: its price of one, times how many, is the order’s line', async () => {
    await runPromotions();
    const items = [{ variantId: whey.variants[0]!.id, quantity: 3 }, { variantId: creatine.variants[0]!.id, quantity: 2 }];
    const quote = (await app.inject({ method: 'POST', url: '/api/stores/lessari/cart/quote', payload: { items, fulfillment: 'PICKUP' } })).json<OrderQuote>();

    const cards = (await shelf()).products;
    const unitOf = (name: string) => cards.find((card) => card.name === name)!.priceCents;
    expect(quote.totalCents).toBe(unitOf('Whey') * 3 + unitOf('Creatina') * 2);
    expect(quote.lines.map((line) => line.discountCents)).toEqual([(18990 - 17091) * 3, (5990 - 4990) * 2]);
  });

  it('counts as on sale what a promotion reaches, and puts it in the cut its badge reads', async () => {
    await runPromotions();

    const onSale = await shelf('?desconto=1');
    expect(names(onSale)).toEqual(['Whey', 'Creatina', 'Kit', 'Caro']);
    expect(onSale.facets.discount).toMatchObject({ count: 4, selected: true });

    // Whey 10%, Creatina 16% (R$ 10,00 of R$ 59,90), Kit 16% of its own; Caro's R$ 10,00 is 2%.
    expect(names(await shelf('?desconto=10'))).toEqual(['Whey', 'Creatina', 'Kit']);
    expect(names(await shelf('?desconto=20'))).toEqual([]);
    expect((await shelf()).facets.discount.ranges).toEqual([
      { minPercent: 10, count: 3, selected: false },
      { minPercent: 20, count: 0, selected: false },
      { minPercent: 30, count: 0, selected: false },
    ]);
  });

  it('reads a product marked down twice by the two cuts together, on its card and in the filter', async () => {
    await runPromotions();
    // The kit's own "de 120 por 100" is 16%, and this is 10% more: neither reaches 20 alone.
    await promotion({ name: 'Kit', scope: 'PRODUCTS', productIds: [kit.id] });

    expect(priced((await shelf()).products).Kit).toEqual([9000, 12000, 'Kit']);
    expect(names(await shelf('?desconto=20'))).toEqual(['Kit']);
    expect((await shelf()).facets.discount.ranges.map((range) => range.count)).toEqual([3, 1, 0]);
  });

  it('orders by the deepest cut a card shows, page by page, with the rest in the shopkeeper’s order', async () => {
    await runPromotions();
    await promotion({ name: 'Kit', scope: 'PRODUCTS', productIds: [kit.id] });

    // Kit 25%, Creatina 16%, Whey 10%, Caro 2%; the bar is not on sale.
    const all = await shelf('?ordenar=maior-desconto');
    expect(names(all)).toEqual(['Kit', 'Creatina', 'Whey', 'Caro', 'Barra']);
    expect(all.total).toBe(5);

    const second = await shelf('?ordenar=maior-desconto&pagina=2&porPagina=2');
    expect(names(second)).toEqual(['Whey', 'Caro']);
    expect(second.total).toBe(5);
    // Under a filter too.
    expect(names(await shelf('?ordenar=maior-desconto&desconto=10'))).toEqual(['Kit', 'Creatina', 'Whey']);
  });

  it('never prints a percentage as less than it is, and puts the whole shelf on sale under a promotion on the cart', async () => {
    await promotion({ name: 'Loja toda' });

    const catalog = await shelf('?desconto=10');
    expect(names(catalog)).toEqual(['Whey', 'Creatina', 'Barra', 'Kit', 'Caro']);
    for (const card of catalog.products) {
      const percent = Math.floor(((card.compareAtPriceCents! - card.priceCents) * 100) / card.compareAtPriceCents!);
      expect(percent, card.name).toBeGreaterThanOrEqual(10);
    }
    // 10% of R$ 18,99 is R$ 1,899: R$ 1,90 off, not R$ 1,89, which would read 9%.
    expect(priced(catalog.products).Barra).toEqual([1709, 1899, 'Loja toda']);
  });

  it('leaves a fixed amount off the whole cart out of every price: it is no product’s', async () => {
    await promotion({ name: 'Vinte no carrinho', discountKind: 'FIXED', percentBps: null, amountCents: 2000 });

    expect(priced((await shelf()).products).Whey).toEqual([18990, null, null]);
    expect(names(await shelf('?desconto=1'))).toEqual(['Kit']);
  });

  it('goes back to the catalogue’s price once the promotion is paused or over', async () => {
    const running = await promotion({ name: 'Proteínas', scope: 'CATEGORIES', categoryIds: [proteins.id] });
    expect(priced((await shelf()).products).Whey).toEqual([17091, 18990, 'Proteínas']);

    await call('PATCH', `/api/stores/lessari/promotions/${running.id}`, { active: false });
    expect(priced((await shelf()).products).Whey).toEqual([18990, null, null]);

    await call('PATCH', `/api/stores/lessari/promotions/${running.id}`, { active: true });
    await prisma.promotion.update({ where: { id: running.id }, data: { startsAt: new Date(Date.now() - 2 * DAY), endsAt: new Date(Date.now() - DAY) } });
    expect(priced((await shelf()).products).Whey).toEqual([18990, null, null]);
    expect(names(await shelf('?desconto=1'))).toEqual(['Kit']);
  });

  it('draws what a promotion reaches on the page’s "on sale" showcase, at the promotional price', async () => {
    await runPromotions();
    const sections = (await call('GET', '/api/stores/lessari/sections')).json<Section[]>();
    const band = sections.find((section) => section.components.some((component) => component.kind === 'PRODUCTS'))!;
    const added = (await call('POST', `/api/stores/lessari/sections/${band.id}/components`, { kind: 'PRODUCTS', source: 'ON_SALE' })).json<{ id: string }>();
    await publishPage(app, owner.accessToken, 'lessari');

    const store = (await app.inject({ method: 'GET', url: '/api/stores/lessari/public' })).json<PublicStore>();
    const showcase = store.sections.flatMap((section) => section.components).find((component) => component.id === added.id)!;
    expect(priced(showcase.items as PublicProductCard[])).toEqual({
      Whey: [17091, 18990, 'Proteínas'],
      Creatina: [4990, 5990, 'Dez reais'],
      Kit: [10000, 12000, null],
      Caro: [49000, 50000, 'Dez reais'],
    });
  });

  it('takes nothing off a product given away, and never counts it as on sale', async () => {
    const free = await add<ProductDetail>('products', { name: 'Brinde', priceCents: 0 });
    await promotion({ name: 'Loja toda' });
    await promotion({ name: 'Dez reais', scope: 'PRODUCTS', discountKind: 'FIXED', percentBps: null, amountCents: 1000, productIds: [free.id] });

    const catalog = await shelf();
    expect(priced(catalog.products).Brinde).toEqual([0, null, null]);
    expect(names(await shelf('?desconto=1'))).not.toContain('Brinde');
    expect(names(await shelf('?desconto=30'))).not.toContain('Brinde');
    // Five priced products on sale; the gift is the sixth on the shelf.
    expect(catalog.total).toBe(6);
    expect(catalog.facets.discount.count).toBe(5);
  });

  it('says on every public read when the prices next change by themselves, and nothing when no change is scheduled', async () => {
    const reads = () =>
      Promise.all(
        [`/api/stores/lessari/catalog`, `/api/stores/lessari/catalog/${whey.slug}`, `/api/stores/lessari/cart?produto=${whey.id}`, '/api/stores/lessari/public'].map(async (url) => {
          const response = await app.inject({ method: 'GET', url });
          if (response.statusCode !== 200) throw new Error(`GET ${url} answered ${response.statusCode}`);
          return response.headers['x-prices-change-at'] ?? null;
        }),
      );

    expect(await reads()).toEqual([null, null, null, null]);

    // Running with no end, and one that ended: nothing is still to happen.
    await promotion({ name: 'Sem fim' });
    await promotion({ name: 'Encerrada', startsAt: daysFromNow(-5), endsAt: daysFromNow(-2) });
    expect(await reads()).toEqual([null, null, null, null]);

    // The nearest of what is still to come: this one's end, before the other's start.
    const ending = await promotion({ name: 'Acaba amanhã', endsAt: daysFromNow(1) });
    const starting = await promotion({ name: 'Semana que vem', startsAt: daysFromNow(3), endsAt: daysFromNow(9) });
    expect(await reads()).toEqual([ending.endsAt, ending.endsAt, ending.endsAt, ending.endsAt]);

    // Paused, its end changes nothing: the next thing to happen is the other's start.
    await call('PATCH', `/api/stores/lessari/promotions/${ending.id}`, { active: false });
    expect(await reads()).toEqual([starting.startsAt, starting.startsAt, starting.startsAt, starting.startsAt]);

    // An owner's read carries none: it is never kept.
    expect((await call('GET', `/api/stores/lessari/products/${whey.id}`)).headers['x-prices-change-at']).toBeUndefined();
  });

  it('prices by the fifty newest promotions running, on the shelf and in the order alike', async () => {
    const store = await prisma.store.findUniqueOrThrow({ where: { slug: 'lessari' } });
    const started = new Date(Date.now() - DAY);
    // The oldest is the deepest cut, and one too many: 60%, behind fifty newer ones of 1% to 50%.
    await prisma.promotion.createMany({
      data: Array.from({ length: 51 }, (_, index) => ({
        storeId: store.id,
        name: `Promoção ${index}`,
        scope: 'CART' as const,
        discountKind: 'PERCENT' as const,
        percentBps: index === 0 ? 6000 : index * 100,
        startsAt: started,
        createdAt: new Date(started.getTime() + index * 1000),
      })),
    });

    expect(priced((await shelf()).products).Creatina).toEqual([2995, 5990, 'Promoção 50']);
    const quote = (await app.inject({ method: 'POST', url: '/api/stores/lessari/cart/quote', payload: { items: [{ variantId: creatine.variants[0]!.id, quantity: 2 }] } })).json<OrderQuote>();
    expect(quote.lines[0]).toMatchObject({ discountCents: 5990, promotion: { name: 'Promoção 50' } });
  });

  it('keeps the owner’s own read of a product at the catalogue’s price', async () => {
    await runPromotions();
    const mine = (await call('GET', `/api/stores/lessari/products/${whey.id}`)).json<ProductDetail>();
    expect(mine).toMatchObject({ priceCents: 18990, compareAtPriceCents: null });
  });
});
