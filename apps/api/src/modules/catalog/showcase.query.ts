// Types
import type { PublicProductCard, ShowcaseProduct } from '@harness-monorepo/contracts';
import type { StoreComponentModel } from '../../generated/prisma/models.js';
import type {
  ProductFieldRefs,
  ProductGetPayload,
  ProductOrderByWithRelationInput,
  ProductSelect,
  ProductWhereInput,
} from '../../generated/prisma/models/Product.js';

// App
import { parseComponentItems } from '../page/component-items.schema.js';
import { SHOWCASE_LIMIT_DEFAULT, SHOWCASE_LIMIT_MAX } from '../page/page.constants.js';
import { CARD_PHOTOS_MAX } from './catalog.constants.js';
import { cardOptionSelect, optionSummaryOf } from './catalog.mapper.js';
import { ON_THE_SHELF_WHERE } from './catalog.visibility.js';

/**
 * What a showcase's card needs, and nothing more: its first photos' addresses (up to
 * `CARD_PHOTOS_MAX`), the first option's summary and the category's slug. The catalogue's own
 * include counts every category's products, which is right for a catalogue page and a query per
 * card too many for a landing page of several showcases.
 */
export const SHOWCASE_CARD_SELECT = {
  id: true,
  slug: true,
  name: true,
  priceCents: true,
  compareAtPriceCents: true,
  maxPriceCents: true,
  images: { select: { url: true }, orderBy: [{ position: 'asc' }, { id: 'asc' }], take: CARD_PHOTOS_MAX },
  category: { select: { slug: true } },
  _count: { select: { options: true } },
  options: cardOptionSelect,
} satisfies ProductSelect;

export type ShowcaseCardRow = ProductGetPayload<{ select: typeof SHOWCASE_CARD_SELECT }>;

/** A showcase's settings, from a row or a published document: its items are read, never trusted. */
type ShowcaseRow = Pick<StoreComponentModel, 'source' | 'sourceCategoryId' | 'limit'> & { items: unknown };

/**
 * The shopkeeper's order, and a tie-breaker that is unique. Neither `position` nor `name` is: two
 * products added at once share a position, and the page would shuffle them from one visit to the
 * next.
 */
const SHELF_ORDER: ProductOrderByWithRelationInput[] = [{ position: 'asc' }, { name: 'asc' }, { id: 'asc' }];

/** Newest first. `id` breaks the tie, since a seed or an import writes many products at one instant. */
const NEWEST_ORDER: ProductOrderByWithRelationInput[] = [{ createdAt: 'desc' }, { id: 'desc' }];

/**
 * The query one showcase draws its products with, or null when its source cannot name any — a
 * category deleted from under it, or a selection emptied.
 *
 * Every source keeps `ON_THE_SHELF_WHERE`, inside an `AND`: a draft or a sold-out product is off the
 * shelf wherever the shelf is drawn. `onSale` is the comparison of two columns, which Prisma builds
 * from the client's field reference — passed in, because this function has no client of its own.
 */
export function showcaseQuery(
  storeId: string,
  showcase: ShowcaseRow,
  priceField: ProductFieldRefs['priceCents'],
): { where: ProductWhereInput; orderBy: ProductOrderByWithRelationInput[]; take: number } | null {
  const take = Math.min(showcase.limit ?? SHOWCASE_LIMIT_DEFAULT, SHOWCASE_LIMIT_MAX);
  const shelf = { storeId, AND: [ON_THE_SHELF_WHERE] } satisfies ProductWhereInput;

  switch (showcase.source) {
    case 'CATEGORY':
      if (!showcase.sourceCategoryId) return null;
      return {
        where: {
          ...shelf,
          // The category and its children, as the catalogue's category page draws it; a hidden
          // category draws nothing, and a hidden parent hides its children with it.
          category: {
            isActive: true,
            OR: [{ id: showcase.sourceCategoryId }, { parentId: showcase.sourceCategoryId, parent: { isActive: true } }],
          },
        },
        orderBy: SHELF_ORDER,
        take,
      };

    case 'SELECTION': {
      const ids = selectionOf(showcase);
      if (!ids.length) return null;
      return { where: { ...shelf, id: { in: ids } }, orderBy: SHELF_ORDER, take: ids.length };
    }

    case 'NEWEST':
      return { where: shelf, orderBy: NEWEST_ORDER, take };

    case 'ON_SALE':
      return {
        where: { ...shelf, compareAtPriceCents: { gt: priceField } },
        orderBy: SHELF_ORDER,
        take,
      };

    default:
      return { where: shelf, orderBy: SHELF_ORDER, take };
  }
}

/**
 * The product ids a SELECTION showcase names, in the order the shopkeeper put them.
 *
 * Through the read path's parser, never a cast: a stored pick that no longer parses — a shape a later
 * deploy narrowed, a row a newer one wrote mid-rollout — is an empty showcase, not a 500 for the whole
 * shop window.
 */
export function selectionOf(showcase: Pick<ShowcaseRow, 'items'>): string[] {
  return (parseComponentItems('PRODUCTS', showcase.items) as ShowcaseProduct[]).map((row) => row.productId);
}

/**
 * The rows a query returned, in the order the showcase wants them, cut at its limit. A selection is
 * the shopkeeper's order, which Prisma cannot sort by; a product that left the shelf simply is not
 * among the rows and drops out.
 */
export function shelfOf(showcase: ShowcaseRow, rows: readonly ShowcaseCardRow[]): PublicProductCard[] {
  const limit = Math.min(showcase.limit ?? SHOWCASE_LIMIT_DEFAULT, SHOWCASE_LIMIT_MAX);

  if (showcase.source !== 'SELECTION') return rows.slice(0, limit).map(toShowcaseCard);

  const byId = new Map(rows.map((row) => [row.id, row]));
  return selectionOf(showcase)
    .flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    .slice(0, limit)
    .map(toShowcaseCard);
}

export function toShowcaseCard(row: ShowcaseCardRow): PublicProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    priceCents: row.priceCents,
    compareAtPriceCents: row.compareAtPriceCents,
    imageUrl: row.images[0]?.url ?? null,
    categorySlug: row.category?.slug ?? null,
    priceRange: { minCents: row.priceCents, maxCents: row.maxPriceCents },
    hasOptions: row._count.options > 0,
    imageUrls: row.images.map((image) => image.url),
    optionSummary: optionSummaryOf(row.options),
  } satisfies PublicProductCard;
}
