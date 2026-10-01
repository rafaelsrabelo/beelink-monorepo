// Types
import type { CouponKind, DiscountKind, PromotionScope } from '@harness-monorepo/contracts';

// App
import { PERCENT_BPS_MAX } from './promotions.constants.js';

/**
 * What a cart's discounts are worth (BEELINK-191) — the arithmetic alone, so the cart, the checkout
 * and the order written cannot disagree: they are one function.
 *
 * Promotions never add up. A line takes the one promotion that is worth the most on it; a fixed
 * amount off the whole cart is not a line's, so it stands against all the lines' promotions together
 * and the larger of the two is the cart's. Every discount is rounded down to whole cents.
 */

export interface PricingLine {
  productId: string;
  /** The product's category and that category's parent: a promotion on either covers the product. */
  categoryIds: readonly string[];
  unitPriceCents: number;
  quantity: number;
}

export interface PricingPromotion {
  id: string;
  name: string;
  scope: PromotionScope;
  discountKind: DiscountKind;
  percentBps: number | null;
  amountCents: number | null;
  productIds: readonly string[];
  categoryIds: readonly string[];
}

export interface LineDiscount {
  discountCents: number;
  promotion: { id: string; name: string } | null;
}

const NONE: LineDiscount = { discountCents: 0, promotion: null };

/** A fixed amount off the cart as a whole — the one promotion that is not worth something per line. */
function isCartAmount(promotion: PricingPromotion): boolean {
  return promotion.scope === 'CART' && promotion.discountKind === 'FIXED';
}

function reaches(promotion: PricingPromotion, line: PricingLine): boolean {
  switch (promotion.scope) {
    case 'CART':
      return true;
    case 'PRODUCTS':
      return promotion.productIds.includes(line.productId);
    case 'CATEGORIES':
      return line.categoryIds.some((id) => promotion.categoryIds.includes(id));
  }
}

/** Off one unit, so a shelf's promotional price times the quantity is the line's. */
function perUnit(promotion: PricingPromotion, unitPriceCents: number): number {
  if (promotion.discountKind === 'PERCENT') return Math.floor((unitPriceCents * (promotion.percentBps ?? 0)) / PERCENT_BPS_MAX);
  return Math.min(promotion.amountCents ?? 0, unitPriceCents);
}

function sumOf(discounts: readonly LineDiscount[]): number {
  return discounts.reduce((sum, line) => sum + line.discountCents, 0);
}

/** The one promotion worth the most on each line; on a tie, the first of the list. */
function bestPerLine(lines: readonly PricingLine[], promotions: readonly PricingPromotion[]): LineDiscount[] {
  return lines.map((line) => {
    let best = NONE;
    for (const promotion of promotions) {
      if (isCartAmount(promotion) || !reaches(promotion, line)) continue;
      const discountCents = perUnit(promotion, line.unitPriceCents) * line.quantity;
      if (discountCents > best.discountCents) best = { discountCents, promotion: { id: promotion.id, name: promotion.name } };
    }
    return best;
  });
}

/**
 * A cart's fixed amount shared among the lines by what each is worth, so every promotion is kept on
 * a line. The cents the rounding leaves over go to the largest lines first; none takes more than it
 * is worth, since the amount is at most the subtotal.
 */
function shared(lines: readonly PricingLine[], promotion: PricingPromotion, amountCents: number, subtotalCents: number): LineDiscount[] {
  const totals = lines.map((line) => line.unitPriceCents * line.quantity);
  const shares = totals.map((total) => Math.floor((amountCents * total) / subtotalCents));
  let left = amountCents - shares.reduce((sum, share) => sum + share, 0);

  const largestFirst = totals.map((total, index) => ({ total, index })).sort((a, b) => b.total - a.total || a.index - b.index);
  for (const { total, index } of largestFirst) {
    if (left === 0) break;
    if (shares[index]! < total) {
      shares[index]! += 1;
      left -= 1;
    }
  }
  return shares.map((discountCents) => (discountCents > 0 ? { discountCents, promotion: { id: promotion.id, name: promotion.name } } : NONE));
}

/**
 * What the promotions take off each line. `promotions` are those running, the newest first — the
 * order a tie is settled in. A tie between the cart's fixed amount and the lines' own goes to the
 * lines.
 */
export function promotionDiscountsOf(lines: readonly PricingLine[], promotions: readonly PricingPromotion[]): LineDiscount[] {
  const perLine = bestPerLine(lines, promotions);
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  if (subtotalCents === 0) return perLine;

  let cart: { promotion: PricingPromotion; amountCents: number } | null = null;
  for (const promotion of promotions) {
    if (!isCartAmount(promotion)) continue;
    const amountCents = Math.min(promotion.amountCents ?? 0, subtotalCents);
    if (amountCents > (cart?.amountCents ?? 0)) cart = { promotion, amountCents };
  }
  return cart && cart.amountCents > sumOf(perLine) ? shared(lines, cart.promotion, cart.amountCents, subtotalCents) : perLine;
}

export interface PricingCoupon {
  kind: CouponKind;
  percentBps: number | null;
  amountCents: number | null;
}

/**
 * What a coupon takes off, after the promotions: a share or an amount of what is left of the
 * products (`baseCents`), never more than it; or the delivery fee — zero while that is not agreed.
 */
export function couponDiscountOf(coupon: PricingCoupon, baseCents: number, deliveryFeeCents: number | null): number {
  switch (coupon.kind) {
    case 'PERCENT':
      return Math.floor((baseCents * (coupon.percentBps ?? 0)) / PERCENT_BPS_MAX);
    case 'FIXED':
      return Math.min(coupon.amountCents ?? 0, baseCents);
    case 'FREE_SHIPPING':
      return deliveryFeeCents ?? 0;
  }
}
