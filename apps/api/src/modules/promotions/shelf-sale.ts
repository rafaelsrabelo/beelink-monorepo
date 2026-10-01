// Types
import type { ProductFieldRefs, ProductWhereInput } from '../../generated/prisma/models/Product.js';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import type { PricingPromotion } from './discount-pricing.js';
import { promotionWhereOf } from './promotion-status.js';
import { shelfPercentOf } from './shelf-pricing.js';

/**
 * Which products are on sale, as a `where` (BEELINK-193). A product's own "de/por" is two columns
 * and a percent the database keeps; a promotion's discount is in no column — it holds only between
 * two instants — so it is said here, from the promotions running now.
 */

export interface ShelfSale {
  /** On sale at all. */
  onSale: ProductWhereInput;
  /** On sale by at least this many whole percent, as the card's badge prints it. */
  atLeast: (minPercent: number) => ProductWhereInput;
}

/** The shelf with no promotion running: the two columns alone, as before promotions existed. */
export function plainSale(priceField: ProductFieldRefs['priceCents']): ShelfSale {
  return { onSale: { compareAtPriceCents: { gt: priceField } }, atLeast: (minPercent) => ({ discountPercent: { gte: minPercent } }) };
}

/**
 * The promotions that price a unit, running at `at`, the newest first, each with everything it
 * names. A fixed amount off the whole cart is left out: it prices no product.
 */
export async function runningShelfPromotions(db: Prisma.TransactionClient, storeId: string, at: Date): Promise<PricingPromotion[]> {
  const rows = await db.promotion.findMany({
    where: { storeId, ...promotionWhereOf('ACTIVE', at), NOT: { scope: 'CART', discountKind: 'FIXED' } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      name: true,
      scope: true,
      discountKind: true,
      percentBps: true,
      amountCents: true,
      products: { select: { productId: true } },
      categories: { select: { categoryId: true } },
    },
  });
  return rows.map(({ products, categories, ...promotion }) => ({
    ...promotion,
    productIds: products.map((row) => row.productId),
    categoryIds: categories.map((row) => row.categoryId),
  }));
}

/** The products a promotion reaches; null for the whole shelf. A category reaches what sits under it. */
function reachOf(promotion: PricingPromotion): ProductWhereInput | null {
  switch (promotion.scope) {
    case 'CART':
      return null;
    case 'PRODUCTS':
      return { id: { in: [...promotion.productIds] } };
    case 'CATEGORIES':
      return { OR: [{ categoryId: { in: [...promotion.categoryIds] } }, { category: { parentId: { in: [...promotion.categoryIds] } } }] };
  }
}

/** Any of these, or everything once one of them is the whole shelf. */
function anyOf(own: ProductWhereInput, reached: readonly (ProductWhereInput | null)[]): ProductWhereInput {
  return reached.includes(null) ? {} : { OR: [own, ...reached.filter((where) => where !== null)] };
}

/** A product with a "de" of its own that a promotion also reaches, and the percent of the two together. */
export interface CombinedDiscount {
  id: string;
  percent: number;
}

/**
 * The products marked down twice — by their own "de/por" and by a promotion. Their percent is of
 * both cuts together, which no column holds and no condition on one promotion computes, so they are
 * read and worked out here: few, since it takes a shopkeeper who marked a product down and then put
 * it in a promotion.
 */
export async function combinedDiscounts(db: Prisma.TransactionClient, storeId: string, promotions: readonly PricingPromotion[], priceField: ProductFieldRefs['priceCents']): Promise<CombinedDiscount[]> {
  if (promotions.length === 0) return [];

  const rows = await db.product.findMany({
    where: { storeId, AND: [{ compareAtPriceCents: { gt: priceField } }, anyOf({ id: { in: [] } }, promotions.map(reachOf))] },
    select: { id: true, priceCents: true, compareAtPriceCents: true, categoryId: true, category: { select: { parentId: true } } },
  });
  return rows.map((row) => ({ id: row.id, percent: shelfPercentOf(row, promotions, row.priceCents, row.compareAtPriceCents) }));
}

/**
 * The shelf's sale with these promotions running. `combined` are the products marked down twice
 * (`combinedDiscounts`), which enter a cut by id.
 *
 * A cut of N% holds for a product when any of these does, each a lower bound on what its badge
 * prints: its own "de/por" gives N; a percentage of N or more reaches it — a share is rounded up, so
 * it never prints less than itself; or a fixed amount reaches it and the price is low enough for the
 * amount to be N% of it.
 */
export function shelfSaleOf(promotions: readonly PricingPromotion[], combined: readonly CombinedDiscount[], priceField: ProductFieldRefs['priceCents']): ShelfSale {
  const plain = plainSale(priceField);
  if (promotions.length === 0) return plain;

  return {
    onSale: anyOf(plain.onSale, promotions.map(reachOf)),
    atLeast: (minPercent) => {
      const reached = promotions.flatMap((promotion): (ProductWhereInput | null)[] => {
        const reach = reachOf(promotion);
        if (promotion.discountKind === 'PERCENT') return (promotion.percentBps ?? 0) >= minPercent * 100 ? [reach] : [];
        // amount / price ≥ N / 100, in whole cents on both sides.
        const cheapEnough: ProductWhereInput = { priceCents: { lte: Math.floor(((promotion.amountCents ?? 0) * 100) / minPercent) } };
        return [reach ? { AND: [reach, cheapEnough] } : cheapEnough];
      });
      const twice = combined.filter((product) => product.percent >= minPercent).map((product) => product.id);
      return anyOf(plain.atLeast(minPercent), [...reached, { id: { in: twice } }]);
    },
  };
}
