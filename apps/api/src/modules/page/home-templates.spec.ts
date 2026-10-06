// Types
import type { ComponentKind, HomeTemplateId } from '@harness-monorepo/contracts';
import type { HomeSubject, ShopStock } from './home-templates.js';

// App
import { EMPTY_SHOP, HOME_TEMPLATE_IDS, homeBands, homeCoverImageOf } from './home-templates.js';
import { promisesOf } from './page-seed.js';

const id = (n: number) => `0199e000-0000-7000-8000-00000000000${n}`;
const PICTURED = [1, 2, 3].map((n) => ({ id: id(n), name: `Produto ${n}`, imageUrl: `https://cdn.example/${n}.png` }));
const CATEGORIES = [5, 6, 7, 8, 9].map((n) => ({ id: id(n), name: `Categoria ${n}` }));

/** A shop with everything: pictures, a sale led by a pictured product, more categories than get a shelf. */
const FULL: ShopStock = { name: 'Lessari', products: 30, pictured: PICTURED, onSale: { count: 4, first: PICTURED[1]! }, categories: CATEGORIES };

function subject(shop: Partial<ShopStock> = {}, promises = promisesOf(['PIX', 'MONEY'])): HomeSubject {
  return { title: 'Página inicial', product: null, category: null, promises, saleEndsAt: '2026-10-09T12:00:00.000Z', shop: { ...FULL, ...shop } };
}

/** A shop the day it opens: no product, no picture, no category, and nothing to promise. */
const BARE = subject(EMPTY_SHOP, []);

const kindsOf = (template: HomeTemplateId, of: HomeSubject): ComponentKind[] => homeBands(template, of).map((band) => band.components[0]!.kind);
const blocksOf = (template: HomeTemplateId, of: HomeSubject) => homeBands(template, of).flatMap((band) => band.components);
const titlesOf = (template: HomeTemplateId, of: HomeSubject) => blocksOf(template, of).map((block) => block.title ?? null);
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;

describe('the models a shop’s home is rearranged with', () => {
  it.each(HOME_TEMPLATE_IDS)('%s arranges a page unlike the other three', (template) => {
    const others = HOME_TEMPLATE_IDS.filter((other) => other !== template);
    for (const other of others) expect(kindsOf(template, subject())).not.toEqual(kindsOf(other, subject()));
  });

  describe('vitrine-com-capa', () => {
    it('opens a full shop with its newest pictures taking turns, then promises, categories, what is new, the sale and everything', () => {
      expect(kindsOf('vitrine-com-capa', subject())).toEqual(['BANNER', 'BENEFITS', 'CATEGORIES', 'PRODUCTS', 'PRODUCTS', 'PRODUCTS']);

      const [banner, , categories, newest, sale, all] = blocksOf('vitrine-com-capa', subject());
      expect(banner).toMatchObject({ display: 'CAROUSEL' });
      expect(banner!.items).toEqual(PICTURED.map((product, index) => ({ id: `capa-${index + 1}`, imageUrl: product.imageUrl, title: product.name, subtitle: 'Novidade na loja', target: 'PRODUCT', productId: product.id })));
      expect(categories).toMatchObject({ display: 'RAIL', title: 'Compre por categoria' });
      expect(newest).toMatchObject({ source: 'NEWEST', display: 'RAIL', title: 'Novidades' });
      expect(sale).toMatchObject({ source: 'ON_SALE', title: 'Ofertas' });
      expect(all).toMatchObject({ source: 'ALL', display: 'GRID' });
      expect(homeCoverImageOf('vitrine-com-capa', subject())).toBe(PICTURED[0]!.imageUrl);
    });

    it('draws one picture as a cover, and none as the shop’s name', () => {
      expect(blocksOf('vitrine-com-capa', subject({ pictured: [PICTURED[0]!] }))[0]).toMatchObject({ kind: 'BANNER', display: 'BACKDROP', items: [expect.objectContaining({ productId: PICTURED[0]!.id })] });
      expect(blocksOf('vitrine-com-capa', subject({ pictured: [] }))[0]).toMatchObject({ kind: 'HEADING', title: 'Lessari' });
      expect(homeCoverImageOf('vitrine-com-capa', subject({ pictured: [] }))).toBeNull();
    });

    it('leaves out what a shop does not have: no sale, no category, too few products for a second shelf', () => {
      expect(titlesOf('vitrine-com-capa', subject({ onSale: EMPTY_SHOP.onSale }))).not.toContain('Ofertas');
      expect(kindsOf('vitrine-com-capa', subject({ categories: [] }))).not.toContain('CATEGORIES');
      expect(titlesOf('vitrine-com-capa', subject({ products: 8 }))).not.toContain('Novidades');
      expect(titlesOf('vitrine-com-capa', subject({ products: 9 }))).toContain('Novidades');
      expect(kindsOf('vitrine-com-capa', subject({}, []))).not.toContain('BENEFITS');
    });

    it('is a name and a showcase in a shop with nothing', () => {
      expect(kindsOf('vitrine-com-capa', BARE)).toEqual(['HEADING', 'PRODUCTS']);
      // No name read: the page's own title stands in, so the heading is never blank.
      expect(blocksOf('vitrine-com-capa', BARE)[0]).toMatchObject({ title: 'Página inicial' });
    });
  });

  describe('por-categorias', () => {
    it('opens with the categories and gives the first four a shelf each, in the shop’s order', () => {
      expect(kindsOf('por-categorias', subject())).toEqual(['HEADING', 'CATEGORIES', 'PRODUCTS', 'PRODUCTS', 'PRODUCTS', 'PRODUCTS', 'PRODUCTS', 'BENEFITS']);

      const shelves = blocksOf('por-categorias', subject()).filter((block) => block.kind === 'PRODUCTS');
      expect(shelves.slice(0, 4).map((block) => [block.source, block.sourceCategoryId, block.title])).toEqual(CATEGORIES.slice(0, 4).map((category) => ['CATEGORY', category.id, category.name]));
      expect(shelves[4]).toMatchObject({ source: 'ALL' });
      expect(shelves[4]!.sourceCategoryId).toBeUndefined();
    });

    it('is the shop’s name and its products where there is no category, naming none', () => {
      expect(kindsOf('por-categorias', subject({ categories: [] }))).toEqual(['HEADING', 'PRODUCTS', 'BENEFITS']);
      expect(blocksOf('por-categorias', subject({ categories: [] }))[0]!.subtitle).not.toMatch(/categoria/i);
      expect(kindsOf('por-categorias', BARE)).toEqual(['HEADING', 'PRODUCTS']);
    });
  });

  describe('ofertas', () => {
    it('leads with the sale: its cover, its first product set apart, its shelf, then everything', () => {
      expect(kindsOf('ofertas', subject())).toEqual(['BANNER', 'FEATURED_PRODUCT', 'PRODUCTS', 'BENEFITS', 'PRODUCTS']);

      const [banner, featured, sale] = blocksOf('ofertas', subject());
      expect(banner!.items).toEqual([expect.objectContaining({ imageUrl: PICTURED[1]!.imageUrl, title: 'Ofertas', target: 'PRODUCT', productId: PICTURED[1]!.id })]);
      expect(featured!.items).toEqual([{ id: 'destaque', productId: PICTURED[1]!.id }]);
      expect(sale).toMatchObject({ source: 'ON_SALE', title: 'Em oferta' });
      expect(homeCoverImageOf('ofertas', subject())).toBe(PICTURED[1]!.imageUrl);
    });

    it('does not set apart the only product on sale, and covers a sale with no picture in words', () => {
      const lone = subject({ onSale: { count: 1, first: { ...PICTURED[1]!, imageUrl: null } } });

      expect(kindsOf('ofertas', lone)).toEqual(['HEADING', 'PRODUCTS', 'BENEFITS', 'PRODUCTS']);
      expect(homeCoverImageOf('ofertas', lone)).toBeNull();
    });

    it('claims no sale in a shop that runs none', () => {
      const none = subject({ onSale: EMPTY_SHOP.onSale });

      expect(kindsOf('ofertas', none)).toEqual(['BANNER', 'PRODUCTS', 'BENEFITS', 'PRODUCTS']);
      expect(JSON.stringify(homeBands('ofertas', none))).not.toMatch(/ofert|ON_SALE/i);
      expect(kindsOf('ofertas', BARE)).toEqual(['HEADING', 'PRODUCTS']);
      expect(JSON.stringify(homeBands('ofertas', BARE))).not.toMatch(/ofert|ON_SALE/i);
    });
  });

  describe('catalogo-enxuto', () => {
    it('is the categories as chips, the catalogue as a grid of four and the promises', () => {
      expect(kindsOf('catalogo-enxuto', subject())).toEqual(['CATEGORIES', 'PRODUCTS', 'BENEFITS']);
      expect(blocksOf('catalogo-enxuto', subject())[0]).toMatchObject({ display: 'CHIPS' });
      expect(blocksOf('catalogo-enxuto', subject())[1]).toMatchObject({ display: 'GRID', source: 'ALL', columns: 4 });
    });

    it('is the showcase alone in a shop with nothing', () => {
      expect(kindsOf('catalogo-enxuto', BARE)).toEqual(['PRODUCTS']);
    });
  });

  // No hole and no id that is not there, whatever the shop lacks.
  it.each(
    HOME_TEMPLATE_IDS.flatMap((template) =>
      (
        [
          ['everything', subject()],
          ['no picture', subject({ pictured: [], onSale: { count: 4, first: { ...PICTURED[1]!, imageUrl: null } } })],
          ['no category', subject({ categories: [] })],
          ['no sale', subject({ onSale: EMPTY_SHOP.onSale })],
          ['nothing to promise', subject({}, [])],
          ['nothing at all', BARE],
        ] as const
      ).map(([name, of]) => [template, name, of] as const),
    ),
  )('%s with %s numbers its bands as they come, hides none, and names only ids the shop has', (template, _name, of) => {
    const bands = homeBands(template, of);
    const known = [...of.shop.pictured.map((product) => product.id), ...of.shop.categories.map((category) => category.id), ...(of.shop.onSale.first ? [of.shop.onSale.first.id] : [])];

    expect(bands.map((band) => band.section.position)).toEqual(bands.map((_band, index) => index));
    for (const band of bands) {
      expect(band.section.isActive).toBe(true);
      expect(band.components).toHaveLength(1);
      expect(band.components[0]!.isActive).toBe(true);
      // Nothing drawn from an empty list: no promises band with no promise, no banner with no slide.
      if (band.components[0]!.kind === 'BENEFITS' || band.components[0]!.kind === 'BANNER') expect(band.components[0]!.items.length).toBeGreaterThan(0);
    }
    expect(bands.filter((band) => band.components[0]!.kind === 'PRODUCTS' && band.components[0]!.source === 'ALL')).toHaveLength(1);
    for (const found of JSON.stringify(bands).match(UUID) ?? []) expect(known).toContain(found);
  });

  it('says nothing the shop did not: no free shipping, no deadline, no discount', () => {
    for (const template of HOME_TEMPLATE_IDS) {
      expect(JSON.stringify(homeBands(template, subject()))).not.toMatch(/frete|grátis|últim|% off|desconto de|só hoje|tempo limitado/i);
    }
  });

  it('cuts a long name to what a title holds', () => {
    const long = 'A'.repeat(300);
    const titles = [
      ...titlesOf('por-categorias', subject({ name: long, categories: [{ id: id(5), name: long }] })),
      ...blocksOf('vitrine-com-capa', subject({ pictured: PICTURED.map((product) => ({ ...product, name: long })) }))[0]!.items.map((slide) => ('title' in slide ? (slide.title ?? null) : null)),
    ];

    for (const title of titles) expect([...(title ?? '')].length).toBeLessThanOrEqual(120);
  });
});
