// Types
import type {
  AnnouncementLink,
  BannerSlide,
  CallToActionButton,
  PublicComponent,
  PublicComponentItem,
  PublicProductCard,
  PublicSection,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';
import type { ComponentShape, SectionShape } from './page-document.js';

// App
import { NO_SLUGS, toPublicButton, toPublicLink, toPublicSlide, type SlugsByEntity } from './page-links.js';
import { itemsOf } from './page.mapper.js';

/*
  The page as a visitor is served it: resolved, filtered, with no uuid a stranger needs. Apart from
  the owner's mapper because the two had grown past one file; they read the same rows, which is what
  stops the storefront and the editor disagreeing about what a shop looks like.
*/

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

/**
 * What a page's public read resolved besides its rows, looked up once for the whole page. One object
 * rather than a parameter each, so a kind that resolves something new adds a field here and not an
 * argument to every call site.
 */
export interface PageLookups {
  slugs: SlugsByEntity;
  shelves: ShelvesByComponent;
}

/** Nothing looked up: slides are pictures and showcases are empty, never a guess. */
export const NO_LOOKUPS: PageLookups = { slugs: NO_SLUGS, shelves: NO_SHELVES };

/** A block's items as a visitor is served them: resolved where they point by id, as written otherwise. */
function publicItemsOf(row: ComponentShape, shopSlug: string, words: StorefrontRouteWords, lookups: PageLookups): PublicComponentItem[] {
  switch (row.kind) {
    case 'BANNER':
      return (itemsOf(row.kind, row.items) as BannerSlide[]).map((slide) => toPublicSlide(slide, shopSlug, words, lookups.slugs));
    case 'ANNOUNCEMENT':
      return (itemsOf(row.kind, row.items) as AnnouncementLink[]).map((link) => toPublicLink(link, shopSlug, words, lookups.slugs));
    case 'CALL_TO_ACTION':
      return (itemsOf(row.kind, row.items) as CallToActionButton[]).map((button) => toPublicButton(button, shopSlug, words, lookups.slugs));
    case 'PRODUCTS':
      return lookups.shelves.get(row.id)?.products ?? [];
    default:
      return itemsOf(row.kind, row.items) as PublicComponentItem[];
  }
}

function toPublicComponent(row: ComponentShape, shopSlug: string, words: StorefrontRouteWords, lookups: PageLookups): PublicComponent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    span: row.span,
    display: row.display,
    source: row.source,
    sourceCategory: row.kind === 'PRODUCTS' ? (lookups.shelves.get(row.id)?.category ?? null) : null,
    // The ids never reach the wire: `PublicStore` is served to anyone who asks, and a uuid on it is a
    // row's identity handed to a stranger for nothing.
    items: publicItemsOf(row, shopSlug, words, lookups),
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
  lookups: PageLookups = NO_LOOKUPS,
): PublicSection {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    background: row.background,
    components: row.components
      .filter((component) => component.isActive)
      .map((component) => toPublicComponent(component, shopSlug, words, lookups)),
  } satisfies PublicSection;
}
