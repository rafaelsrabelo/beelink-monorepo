// Types
import type {
  Banner as WireBanner,
  PublicBanner,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';
import type { StoreBannerModel } from '../../generated/prisma/models.js';

/**
 * A banner is always read with the slug of whatever it points at, and never with the row itself:
 * the storefront needs an address, and the panel needs something a person recognises. Demanding
 * them in the row type is what stops a call site forgetting the include and shipping a banner that
 * points nowhere.
 */
export type BannerRow = StoreBannerModel & {
  category: { slug: string } | null;
  product: { slug: string } | null;
};

export const bannerInclude = {
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
function hrefOf(row: BannerRow, shopSlug: string, words: StorefrontRouteWords): string | null {
  if (row.target === 'CATEGORY') return `/${shopSlug}/${row.category?.slug ?? ''}`;
  if (row.target === 'PRODUCT') return `/${shopSlug}/${words.products}/${row.product?.slug ?? ''}`;
  // Null rather than an empty string: the window reads it as "no link" and draws a poster. An
  // empty href is a link to the current page, which is a card that looks live and does nothing.
  if (row.target === 'NONE') return null;

  return row.externalUrl ?? null;
}

export function toPublicBanner(
  row: BannerRow,
  shopSlug: string,
  words: StorefrontRouteWords,
): PublicBanner {
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
    belowProducts: row.belowProducts,
  } satisfies PublicBanner;
}

export function toBanner(row: BannerRow): WireBanner {
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
    belowProducts: row.belowProducts,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies WireBanner;
}
