// Types
import type {
  Section as WireSection,
  PublicSection,
  SectionItem,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';
import type { StoreSectionModel } from '../../generated/prisma/models.js';

/**
 * A block is always read with the slug of whatever it points at, and never with the row itself:
 * the storefront needs an address, and the panel needs something a person recognises. Demanding
 * them in the row type is what stops a call site forgetting the include and shipping a block that
 * points nowhere.
 */
export type SectionRow = StoreSectionModel & {
  category: { slug: string } | null;
  product: { slug: string } | null;
};

/**
 * What the database gave back for `items`, narrowed to what the wire declares.
 *
 * `Json` is `unknown` as far as the client is concerned, and casting it would be a lie the
 * compiler cannot check. A row whose items are not an array reads as none — which draws an empty
 * band rather than throwing on a page a stranger asked for. The shape inside each entry is the
 * write path's job, and the zod union there is where a malformed one is refused.
 */
function itemsOf(raw: unknown): SectionItem[] {
  return Array.isArray(raw) ? (raw as SectionItem[]) : [];
}

export const sectionInclude = {
  category: { select: { slug: true } },
  product: { select: { slug: true } },
} as const;

/**
 * The finished address, built here and not in the browser.
 *
 * This is the whole reason a banner stores a foreign key instead of the `href` the first attempt
 * stored: the address is derived from the slug the target has **now**, so renaming a category moves
 * every banner pointing at it. The web has one module allowed to spell a storefront segment, and
 * this is the API's side of that same rule — the word comes from the shop's own vocabulary, never
 * from a literal.
 */
function hrefOf(row: SectionRow, shopSlug: string, words: StorefrontRouteWords): string | null {
  if (row.target === 'CATEGORY') return `/${shopSlug}/${row.category?.slug ?? ''}`;
  if (row.target === 'PRODUCT') return `/${shopSlug}/${words.products}/${row.product?.slug ?? ''}`;
  // Null rather than an empty string: the window reads it as "no link" and draws a poster. An
  // empty href is a link to the current page, which is a card that looks live and does nothing.
  if (row.target === 'NONE') return null;

  return row.externalUrl ?? null;
}

export function toPublicSection(
  row: SectionRow,
  shopSlug: string,
  words: StorefrontRouteWords,
): PublicSection {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.imageUrl,
    layout: row.layout,
    href: hrefOf(row, shopSlug, words),
    // On the wire rather than sniffed from the href downstream: a storefront deciding by looking
    // for "http" would start opening the shop's own pages in a new tab the day these become
    // absolute.
    external: row.target === 'EXTERNAL',
    kind: row.kind,
    width: row.width,
    items: itemsOf(row.items),
  } satisfies PublicSection;
}

export function toSection(row: SectionRow): WireSection {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    imageUrl: row.imageUrl,
    layout: row.layout,
    target: row.target,
    // Slugs, never the uuids: the wire speaks in slugs, because that is what a URL carries and
    // what a person recognises. The panel selects a category by its own name, not by a uuid.
    categorySlug: row.category?.slug ?? null,
    productSlug: row.product?.slug ?? null,
    externalUrl: row.externalUrl,
    position: row.position,
    kind: row.kind,
    width: row.width,
    items: itemsOf(row.items),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies WireSection;
}
