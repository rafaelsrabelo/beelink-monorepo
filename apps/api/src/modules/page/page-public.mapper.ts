// Types
import type {
  AnnouncementLink,
  BannerSlide,
  ComponentKind,
  PublicAnnouncementLink,
  PublicBannerSlide,
  PublicComponent,
  PublicComponentItem,
  PublicProductCard,
  PublicSection,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';
import type { ComponentShape, SectionShape } from './page-document.js';

// App
import { itemsOf } from './page.mapper.js';

/*
  The page as a visitor is served it: resolved, filtered, with no uuid a stranger needs. Apart from
  the owner's mapper because the two had grown past one file; they read the same rows, which is what
  stops the storefront and the editor disagreeing about what a shop looks like.
*/

/**
 * The slugs the slides point at, looked up once for the whole page.
 *
 * A slide keeps an id rather than an address, so that renaming a category moves the slide with it
 * — the promise a foreign key used to make. What it cannot have is the foreign key itself, because
 * `items` is JSON: there is no cascade, and no constraint stopping an id from outliving the row it
 * names.
 *
 * That turns out to be the better failure. A deleted category used to take the whole banner with
 * it; an id with nothing behind it resolves to null here and the slide stops being a link. The
 * picture stays on the page, which is what the shopkeeper put there.
 */
export interface SlugsByEntity {
  categories: ReadonlyMap<string, string>;
  products: ReadonlyMap<string, string>;
}

export const NO_SLUGS: SlugsByEntity = { categories: new Map(), products: new Map() };

/**
 * What one showcase draws, already chosen by its source: the products, as cards, and the category a
 * CATEGORY showcase names, for the page's "ver tudo".
 */
export interface Shelf {
  products: PublicProductCard[];
  category: { slug: string; name: string; description: string | null } | null;
}

/**
 * Every showcase's shelf on a page, by component id, looked up once by the store's public read.
 * Defaulted to none: a call site that did not look them up serves showcases with no products, never
 * a guess — and never the ids the shopkeeper picked, which are not the visitor's business.
 */
export type ShelvesByComponent = ReadonlyMap<string, Shelf>;

export const NO_SHELVES: ShelvesByComponent = new Map();

/** The kinds whose items point somewhere by id. */
const POINTING: readonly ComponentKind[] = ['BANNER', 'ANNOUNCEMENT'];

/** Every id every slide and the strip's link on this page name, so one query answers all of them. */
export function slideTargetsOf(rows: readonly SectionShape[]): { categoryIds: string[]; productIds: string[] } {
  const categoryIds = new Set<string>();
  const productIds = new Set<string>();

  for (const section of rows) {
    for (const component of section.components) {
      if (!POINTING.includes(component.kind)) continue;

      for (const item of itemsOf(component.kind, component.items) as (BannerSlide | AnnouncementLink)[]) {
        if (item.categoryId) categoryIds.add(item.categoryId);
        if (item.productId) productIds.add(item.productId);
      }
    }
  }

  return { categoryIds: [...categoryIds], productIds: [...productIds] };
}

/**
 * The finished address, built here and not in the browser.
 *
 * This is the whole reason a slide stores an id instead of the `href` the first attempt stored:
 * the address is derived from the slug the target has **now**, so renaming a category moves every
 * slide pointing at it. The word for the product segment comes from the shop's own vocabulary,
 * never from a literal — the API's side of the rule the web keeps in one module.
 */
function hrefOf(
  row: Pick<AnnouncementLink, 'target' | 'categoryId' | 'productId' | 'externalUrl'>,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
): string | null {
  const categorySlug = row.categoryId ? slugs.categories.get(row.categoryId) : undefined;
  const productSlug = row.productId ? slugs.products.get(row.productId) : undefined;

  return row.target === 'CATEGORY' && categorySlug
    ? `/${shopSlug}/${categorySlug}`
    : row.target === 'PRODUCT' && productSlug
      ? `/${shopSlug}/${words.products}/${productSlug}`
      : row.target === 'EXTERNAL'
        ? (row.externalUrl ?? null)
        : null;
}

/** One slide, with its address built from the slug its target has now. */
function toPublicSlide(
  slide: BannerSlide,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
): PublicBannerSlide {
  const href = hrefOf(slide, shopSlug, words, slugs);

  return {
    id: slide.id,
    imageUrl: slide.imageUrl,
    title: slide.title ?? null,
    subtitle: slide.subtitle ?? null,
    // Null rather than an empty string: the window reads it as "no link" and draws a poster. An
    // empty href is a link to the current page, which is a card that looks live and does nothing.
    href,
    // On the wire rather than sniffed from the href downstream: a storefront deciding by looking
    // for "http" would start opening the shop's own pages in a new tab the day these become
    // absolute.
    external: slide.target === 'EXTERNAL' && !!href,
  } satisfies PublicBannerSlide;
}

function toPublicComponent(
  row: ComponentShape,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
  shelves: ShelvesByComponent,
): PublicComponent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    span: row.span,
    display: row.display,
    source: row.source,
    sourceCategory: row.kind === 'PRODUCTS' ? (shelves.get(row.id)?.category ?? null) : null,
    // A banner's slides and a showcase's products are resolved; every other kind's items are what the
    // shopkeeper wrote. The ids never reach the wire: `PublicStore` is served to anyone who asks, and a
    // uuid on it is a row's identity handed to a stranger for nothing.
    items:
      row.kind === 'BANNER'
        ? (itemsOf(row.kind, row.items) as BannerSlide[]).map((slide) =>
            toPublicSlide(slide, shopSlug, words, slugs),
          )
        : row.kind === 'ANNOUNCEMENT'
          ? (itemsOf(row.kind, row.items) as AnnouncementLink[]).map((link) => {
              const href = hrefOf(link, shopSlug, words, slugs);
              return { id: link.id, href, external: link.target === 'EXTERNAL' && !!href } satisfies PublicAnnouncementLink;
            })
          : row.kind === 'PRODUCTS'
            ? (shelves.get(row.id)?.products ?? [])
            : (itemsOf(row.kind, row.items) as PublicComponentItem[]),
    columns: row.columns,
    align: row.align,
    visibleOn: row.visibleOn,
  } satisfies PublicComponent;
}

/**
 * A band as a visitor is served it, with the hidden components already gone.
 *
 * Filtered here and not in the query, because the same rows answer the panel: the storefront's
 * read and the editor's read are one query with two mappers, which is what stops the two from
 * disagreeing about what a shop looks like.
 */
export function toPublicSection(
  row: SectionShape,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity = NO_SLUGS,
  shelves: ShelvesByComponent = NO_SHELVES,
): PublicSection {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    background: row.background,
    components: row.components
      .filter((component) => component.isActive)
      .map((component) => toPublicComponent(component, shopSlug, words, slugs, shelves)),
  } satisfies PublicSection;
}

