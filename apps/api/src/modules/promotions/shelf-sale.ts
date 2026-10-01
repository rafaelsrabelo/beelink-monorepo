// Types
import type { ProductFieldRefs, ProductWhereInput } from '../../generated/prisma/models/Product.js';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { ON_THE_SHELF_WHERE } from '../catalog/catalog.visibility.js';
import { forEveryone, type PricingPromotion } from './discount-pricing.js';
import { runningPromotions } from './order-discounts.js';
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

/** The largest value an INT4 column compares with: a bound past it is refused by the database. */
const INT4_MAX = 2_147_483_647;

/** A promotion takes nothing off a product given away: it has no price to cut, and no badge. */
const PRICED: ProductWhereInput = { priceCents: { gt: 0 } };

/** The shelf with no promotion running: the two columns alone, as before promotions existed. */
export function plainSale(priceField: ProductFieldRefs['priceCents']): ShelfSale {
  return { onSale: { compareAtPriceCents: { gt: priceField } }, atLeast: (minPercent) => ({ discountPercent: { gte: minPercent } }) };
}

/**
 * The promotions that price a unit, among those running at `at`, each with everything it names.
 * The same reading an order prices with (`runningPromotions`), less a fixed amount off the whole
 * cart, which prices no product — and less those for a first purchase (BEELINK-245): the shop
 * window is one page, kept and served to every visitor, and who is on a first purchase is only
 * known once they are identified, at the cart.
 */
export async function runningShelfPromotions(db: Prisma.TransactionClient, storeId: string, at: Date): Promise<PricingPromotion[]> {
  return forEveryone(await runningPromotions(db, storeId, at)).filter((promotion) => promotion.scope !== 'CART' || promotion.discountKind !== 'FIXED');
}

/**
 * The next instant the shop's prices change by themselves: a promotion still to start, or one
 * still to end. Null when none is scheduled. A paused promotion changes nothing at either instant,
 * and neither does one for a first purchase: it is on no public price, so a kept page is as good
 * after it starts or ends as before.
 */
export async function nextPromotionChange(db: Prisma.TransactionClient, storeSlug: string, at: Date): Promise<Date | null> {
  const ofShop = { store: { slug: storeSlug }, isActive: true, audience: 'EVERYONE' } satisfies Prisma.PromotionWhereInput;
  const [start, end] = await Promise.all([
    db.promotion.aggregate({ where: { ...ofShop, startsAt: { gt: at } }, _min: { startsAt: true } }),
    db.promotion.aggregate({ where: { ...ofShop, endsAt: { gt: at } }, _min: { endsAt: true } }),
  ]);
  const instants = [start._min.startsAt, end._min.endsAt].filter((instant): instant is Date => instant !== null);
  return instants.length ? new Date(Math.min(...instants.map((instant) => instant.getTime()))) : null;
}

/** The priced products a promotion reaches. A category reaches what sits under it. */
function reachOf(promotion: PricingPromotion): ProductWhereInput {
  switch (promotion.scope) {
    case 'CART':
      return PRICED;
    case 'PRODUCTS':
      return { AND: [PRICED, { id: { in: [...promotion.productIds] } }] };
    case 'CATEGORIES':
      return { AND: [PRICED, { OR: [{ categoryId: { in: [...promotion.categoryIds] } }, { category: { parentId: { in: [...promotion.categoryIds] } } }] }] };
  }
}

/** A product with a "de" of its own that a promotion also reaches, and the percent of the two together. */
export interface CombinedDiscount {
  id: string;
  percent: number;
}

/**
 * The products on the shelf marked down twice — by their own "de/por" and by a promotion. Their
 * percent is of both cuts together, which no column holds and no condition on one promotion
 * computes, so they are read and worked out here. As many as the shopkeeper marked down by hand
 * among what the promotions reach: a handful under a promotion on a few products, every "de/por"
 * of the shop under one on the whole cart.
 */
export async function combinedDiscounts(db: Prisma.TransactionClient, storeId: string, promotions: readonly PricingPromotion[], priceField: ProductFieldRefs['priceCents']): Promise<CombinedDiscount[]> {
  if (promotions.length === 0) return [];

  const rows = await db.product.findMany({
    where: { storeId, AND: [ON_THE_SHELF_WHERE, { compareAtPriceCents: { gt: priceField } }, { OR: promotions.map(reachOf) }] },
    select: { id: true, priceCents: true, compareAtPriceCents: true, categoryId: true, category: { select: { parentId: true } } },
  });
  return rows.map((row) => ({ id: row.id, percent: shelfPercentOf(row, promotions, row.priceCents, row.compareAtPriceCents) }));
}

/**
 * The shelf's sale with these promotions running. `combined` are the products marked down twice
 * (`combinedDiscounts`), which enter a cut by id.
 *
 * A cut of N% holds for a product when any of these does: its own "de/por" gives N; a percentage
 * of N or more reaches it — a share is rounded up, so it never prints less than itself; or a fixed
 * amount reaches it and the price is low enough for the amount to be N% of it.
 *
 * Each is a lower bound on what the badge prints, and exact but for one rounding: a share rounded
 * up can print one percent more than its own number — 9,99% of R$ 18,99 reads 10% — on a price
 * small enough, and that product is left out of the cut it prints. A percentage typed whole never
 * does it above R$ 1,00.
 */
export function shelfSaleOf(promotions: readonly PricingPromotion[], combined: readonly CombinedDiscount[], priceField: ProductFieldRefs['priceCents']): ShelfSale {
  const plain = plainSale(priceField);
  if (promotions.length === 0) return plain;

  return {
    onSale: { OR: [plain.onSale, ...promotions.map(reachOf)] },
    atLeast: (minPercent) => {
      const reached = promotions.flatMap((promotion): ProductWhereInput[] => {
        if (promotion.discountKind === 'PERCENT') return (promotion.percentBps ?? 0) >= minPercent * 100 ? [reachOf(promotion)] : [];
        // amount / price ≥ N / 100, in whole cents on both sides.
        const cheapEnough = Math.min(Math.floor(((promotion.amountCents ?? 0) * 100) / minPercent), INT4_MAX);
        return [{ AND: [reachOf(promotion), { priceCents: { lte: cheapEnough } }] }];
      });
      const twice = combined.filter((product) => product.percent >= minPercent).map((product) => product.id);
      return { OR: [plain.atLeast(minPercent), ...reached, { id: { in: twice } }] };
    },
  };
}
