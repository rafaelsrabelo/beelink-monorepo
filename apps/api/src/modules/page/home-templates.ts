// Types
import type { HomeTemplateId } from '@harness-monorepo/contracts';
import type { LandingSubject } from './landing-templates.js';
import type { SeededBand, SeededItem } from './page-seed.js';

// App
import { clip, cover, spotlight, type Component } from './landing-template-parts.js';
import { COMPONENT_TITLE_MAX_LENGTH } from './page.constants.js';

/**
 * What a shop has to fill its home with, read before anything is written. Every count is of the
 * shelf — published and in stock — because a band is arranged only when the shop window would draw it.
 */
export interface ShopStock {
  /** The shop's name: a cover with no picture is its words. */
  name: string;
  /** How many products are on the shelf. */
  products: number;
  /** The newest on the shelf that have a picture, newest first: at most `COVER_SLIDES_MAX`. */
  pictured: { id: string; name: string; imageUrl: string }[];
  /** What is on sale now, by the rule the shelf prices with: how many, and the first in the shop's order. */
  onSale: { count: number; first: { id: string; name: string; imageUrl: string | null } | null };
  /** The top-level categories holding something on the shelf, their children's included, in the shop's order. */
  categories: { id: string; name: string }[];
}

/** What a home model fills its bands from: a model's subject, with the shop's stock. */
export type HomeSubject = LandingSubject & { shop: ShopStock };

/** A shop with nothing: what a model that reads no stock is handed, and what a new shop is. */
export const EMPTY_SHOP: ShopStock = { name: '', products: 0, pictured: [], onSale: { count: 0, first: null }, categories: [] };

export const HOME_TEMPLATE_IDS = ['vitrine-com-capa', 'por-categorias', 'ofertas', 'catalogo-enxuto'] as const satisfies readonly HomeTemplateId[];

/** A cover takes turns between this many pictures at most: past three, nobody waits for the last. */
export const COVER_SLIDES_MAX = 3;

/** A shelf of its own for each of this many categories: more is the catalogue, which the menu already is. */
const CATEGORY_SHELVES_MAX = 4;

/** How many "Novidades" draws. A shop with no more than this would see the same products again in the shelf under it. */
const NEWEST_SHELF_LIMIT = 8;

type Width = SeededBand['section']['width'];

/** Bands numbered as they come, without the ones that had nothing to show: a model never leaves a hole. */
function page(bands: ({ width: Width; component: Component } | null)[]): SeededBand[] {
  return bands
    .flatMap((band) => (band ? [band] : []))
    .map((band, position) => ({ section: { width: band.width, position, isActive: true }, components: [band.component] }));
}

function shelf(over: Pick<Component, 'title' | 'display' | 'source'> & Partial<Component>): { width: Width; component: Component } {
  return { width: 'CONTAINED', component: { kind: 'PRODUCTS', items: [], position: 0, isActive: true, ...over } };
}

/** Every product: the showcase a shop's home cannot be without, so it is arranged even by a shop with none. */
function everything(over: Partial<Component> = {}) {
  return shelf({ title: 'Todos os produtos', display: 'GRID', source: 'ALL', ...over });
}

function newest(shop: ShopStock) {
  return shop.products > NEWEST_SHELF_LIMIT ? shelf({ title: 'Novidades', display: 'RAIL', source: 'NEWEST', limit: NEWEST_SHELF_LIMIT }) : null;
}

function promised(rows: SeededItem[], display: 'INLINE' | 'CARDS') {
  return rows.length ? { width: 'FULL' as const, component: { kind: 'BENEFITS', display, items: rows, position: 0, isActive: true } satisfies Component } : null;
}

function categories(shop: ShopStock, display: 'RAIL' | 'GRID' | 'CHIPS', title: string | null) {
  return shop.categories.length ? { width: 'CONTAINED' as const, component: { kind: 'CATEGORIES', title, display, items: [], position: 0, isActive: true } satisfies Component } : null;
}

/** The shop's name over the page, for a shop with no picture to open with. */
function nameplate(subject: HomeSubject, subtitle: string): { width: Width; component: Component } {
  const title = clip(subject.shop.name.trim() || subject.title, COMPONENT_TITLE_MAX_LENGTH);
  return { width: 'CONTAINED', component: { kind: 'HEADING', title, subtitle, items: [], position: 0, isActive: true } };
}

/**
 * The newest products' pictures, each leading to its product: taking turns when there are several,
 * one cover when there is one, and the shop's name when there is none.
 */
function newestCover(subject: HomeSubject): { width: Width; component: Component } {
  const { pictured } = subject.shop;
  const [only] = pictured;

  if (!only) return nameplate(subject, 'Conheça os nossos produtos');
  if (pictured.length === 1) return { width: 'FULL', component: cover(only.imageUrl, { title: only.name, subtitle: 'Novidade na loja' }, { productId: only.id }, 'BACKDROP') };

  const slides = pictured.map((product, index) => ({
    id: `capa-${index + 1}`,
    imageUrl: product.imageUrl,
    title: clip(product.name, COMPONENT_TITLE_MAX_LENGTH),
    subtitle: 'Novidade na loja',
    target: 'PRODUCT' as const,
    productId: product.id,
  }));
  return { width: 'FULL', component: { kind: 'BANNER', display: 'CAROUSEL', items: slides, position: 0, isActive: true } };
}

/** A cover, the categories, what is new, what is on sale, and everything: the shop window most shops want. */
function coveredShowcase(subject: HomeSubject): SeededBand[] {
  const { shop } = subject;

  return page([
    newestCover(subject),
    promised(subject.promises, 'INLINE'),
    categories(shop, 'RAIL', 'Compre por categoria'),
    newest(shop),
    shop.onSale.count ? shelf({ title: 'Ofertas', display: 'RAIL', source: 'ON_SALE', limit: 12 }) : null,
    everything(),
  ]);
}

/** The categories first, then a shelf for each: a shop of many aisles. With no category it is the name and the products. */
function byCategory(subject: HomeSubject): SeededBand[] {
  const { shop } = subject;

  return page([
    nameplate(subject, shop.categories.length ? 'Escolha uma categoria e encontre o que procura' : 'Conheça os nossos produtos'),
    categories(shop, 'GRID', 'Categorias'),
    ...shop.categories
      .slice(0, CATEGORY_SHELVES_MAX)
      .map((category) => shelf({ title: clip(category.name, COMPONENT_TITLE_MAX_LENGTH), display: 'RAIL', source: 'CATEGORY', sourceCategoryId: category.id, limit: 8 })),
    everything(),
    promised(subject.promises, 'CARDS'),
  ]);
}

/**
 * What is on sale, up front. Arranged only around a sale the shop is running: a shop with none gets
 * a cover, what is new and its products, in words that claim no sale.
 */
function sales(subject: HomeSubject): SeededBand[] {
  const { shop } = subject;
  const { first, count } = shop.onSale;

  if (!first) return page([newestCover(subject), newest(shop), promised(subject.promises, 'INLINE'), everything()]);

  return page([
    { width: first.imageUrl ? 'FULL' : 'CONTAINED', component: cover(first.imageUrl, { title: 'Ofertas', subtitle: 'Preços especiais em produtos selecionados' }, { productId: first.id }, 'BACKDROP') },
    // One product on sale is the shelf below already; it is set apart only when it leads several.
    count > 1 ? { width: 'CONTAINED', component: spotlight(first.id, { title: 'Oferta em destaque' }) } : null,
    shelf({ title: 'Em oferta', display: 'GRID', source: 'ON_SALE', limit: 12 }),
    promised(subject.promises, 'INLINE'),
    everything(),
  ]);
}

/** The products and little else: the categories as chips, the whole catalogue as a grid, the promises last. */
function leanCatalogue(subject: HomeSubject): SeededBand[] {
  return page([categories(subject.shop, 'CHIPS', null), everything({ title: null, columns: 4 }), promised(subject.promises, 'INLINE')]);
}

/**
 * The bands a shop's home is rearranged with, filled from what the shop has today.
 *
 * Data applied once, like every model: the bands are the shopkeeper's to change the moment they
 * exist. Every word is pt-BR for the reason `defaultPage` gives, and none says what the shop did
 * not — a sale is named only where one is running, and nothing is promised but what the payment
 * methods already do.
 *
 * A band with nothing to show is not arranged, where a landing's model hides it: a home rebuilt
 * from the shop should read as finished. No strip: the home's own stays, whatever is applied.
 */
export function homeBands(id: HomeTemplateId, subject: HomeSubject): SeededBand[] {
  if (id === 'vitrine-com-capa') return coveredShowcase(subject);
  if (id === 'por-categorias') return byCategory(subject);
  if (id === 'ofertas') return sales(subject);
  return leanCatalogue(subject);
}

/** The picture the model's cover draws, when it has one. */
export function homeCoverImageOf(id: HomeTemplateId, subject: HomeSubject): string | null {
  const newestPicture = subject.shop.pictured[0]?.imageUrl ?? null;

  if (id === 'vitrine-com-capa') return newestPicture;
  if (id === 'ofertas') return subject.shop.onSale.first ? subject.shop.onSale.first.imageUrl : newestPicture;
  return null;
}
