// Types
import type { PublicProductCard, PublicProductDetail } from '@harness-monorepo/contracts';

// App
import { unitDiscountOf, type PricingPromotion, type PricingUnit } from './discount-pricing.js';

/**
 * A product as the shop window prices it while a promotion runs (BEELINK-193): what is paid now in
 * `priceCents`, what it was in `compareAtPriceCents` — the two fields every card, price and badge
 * already read. The rule is `unitDiscountOf`, the one a cart's line multiplies by its quantity, so
 * the shelf's price of one, times how many, is what the order takes off.
 */

/** What says which promotions reach a product: itself, its category and the category above it. */
export interface ShelfProduct {
  id: string;
  categoryId: string | null;
  category: { parentId: string | null } | null;
}

export interface ShelfPrice {
  priceCents: number;
  compareAtPriceCents: number | null;
  /** The promotion that set the price, by the shopkeeper's name for it; null with none. */
  promotionName: string | null;
}

function unitOf(product: ShelfProduct, unitPriceCents: number): PricingUnit {
  const categoryIds = [product.categoryId, product.category?.parentId].filter((id): id is string => typeof id === 'string');
  return { productId: product.id, categoryIds, unitPriceCents };
}

/**
 * One price with the promotion on it. What it was is the shop's own "de", when it has one above
 * the price, and the catalogue's price otherwise — so a product already marked down reads the two
 * cuts together, never a smaller one than before the promotion.
 */
export function shelfPriceOf(product: ShelfProduct, promotions: readonly PricingPromotion[], priceCents: number, compareAtPriceCents: number | null): ShelfPrice {
  const { discountCents, promotion } = unitDiscountOf(unitOf(product, priceCents), promotions);
  if (!promotion) return { priceCents, compareAtPriceCents, promotionName: null };

  const was = compareAtPriceCents !== null && compareAtPriceCents > priceCents ? compareAtPriceCents : priceCents;
  return { priceCents: priceCents - discountCents, compareAtPriceCents: was, promotionName: promotion.name };
}

/** The whole percent the badge prints for a product: of its own "de", of a promotion, or of both. */
export function shelfPercentOf(product: ShelfProduct, promotions: readonly PricingPromotion[], priceCents: number, compareAtPriceCents: number | null): number {
  const price = shelfPriceOf(product, promotions, priceCents, compareAtPriceCents);
  const was = price.compareAtPriceCents;
  return was !== null && was > price.priceCents ? Math.floor(((was - price.priceCents) * 100) / was) : 0;
}

/** A card with the promotion on its price and on its range. With none running, the card as it came. */
export function promotedCard<T extends PublicProductCard>(card: T, product: ShelfProduct, promotions: readonly PricingPromotion[]): T {
  if (promotions.length === 0) return card;

  const price = shelfPriceOf(product, promotions, card.priceCents, card.compareAtPriceCents);
  if (price.promotionName === null) return { ...card, promotionName: null };
  // The dearest combination takes the same promotion: a share or an amount off a unit keeps the order of two prices.
  const maxCents = shelfPriceOf(product, promotions, card.priceRange.maxCents, null).priceCents;
  return { ...card, ...price, priceRange: { minCents: price.priceCents, maxCents } };
}

/** A product's page: the card's prices, and each combination's own. */
export function promotedDetail(detail: PublicProductDetail, product: ShelfProduct, promotions: readonly PricingPromotion[]): PublicProductDetail {
  if (promotions.length === 0) return detail;

  return {
    ...promotedCard(detail, product, promotions),
    variants: detail.variants.map((variant) => {
      const { priceCents, compareAtPriceCents } = shelfPriceOf(product, promotions, variant.priceCents, variant.compareAtPriceCents);
      return { ...variant, priceCents, compareAtPriceCents };
    }),
  };
}
