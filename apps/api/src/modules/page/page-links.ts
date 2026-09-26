// Types
import type {
  AnnouncementLink,
  BannerSlide,
  ComponentKind,
  PublicAnnouncementLink,
  PublicBannerSlide,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';
import type { SectionShape } from './page-document.js';

// App
import { itemsOf } from './page.mapper.js';

/*
  Where a block's items point, by id, and the address a visitor is served for it. One place for
  every kind that links somewhere, so the slug lookup and Publicar's "link to a deleted product"
  read the same list and a kind that starts linking gets both.
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

/** An item that points somewhere, as far as where it points goes. */
export type Pointer = Pick<BannerSlide | AnnouncementLink, 'id' | 'target' | 'productId' | 'categoryId'>;

/** Every item of a block that points somewhere by id; none for a kind whose items do not. */
export function pointersOf(kind: ComponentKind, items: unknown): Pointer[] {
  switch (kind) {
    case 'BANNER':
    case 'ANNOUNCEMENT':
      return itemsOf(kind, items) as (BannerSlide | AnnouncementLink)[];
    default:
      return [];
  }
}

/** Every id every block on this page points at, so one query answers all of them. */
export function slideTargetsOf(rows: readonly SectionShape[]): { categoryIds: string[]; productIds: string[] } {
  const categoryIds = new Set<string>();
  const productIds = new Set<string>();

  for (const section of rows) {
    for (const component of section.components) {
      for (const pointer of pointersOf(component.kind, component.items)) {
        if (pointer.categoryId) categoryIds.add(pointer.categoryId);
        if (pointer.productId) productIds.add(pointer.productId);
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
export function hrefOf(
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
export function toPublicSlide(
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

/** The strip's link, with its address built the same way. */
export function toPublicLink(
  link: AnnouncementLink,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
): PublicAnnouncementLink {
  const href = hrefOf(link, shopSlug, words, slugs);
  return { id: link.id, href, external: link.target === 'EXTERNAL' && !!href } satisfies PublicAnnouncementLink;
}
