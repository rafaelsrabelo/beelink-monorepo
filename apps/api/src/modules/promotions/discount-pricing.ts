// Types
import type { CouponKind, DiscountAudience, DiscountKind, PromotionScope, QuotedFirstPurchase } from '@harness-monorepo/contracts';

// App
import { PERCENT_BPS_MAX } from './promotions.constants.js';

/**
 * What a cart's discounts are worth (BEELINK-191) — the arithmetic alone, so the cart, the checkout
 * and the order written cannot disagree: they are one function.
 *
 * Promotions never add up. A line takes the one promotion that is worth the most on it; a fixed
 * amount off the whole cart is not a line's, so it stands against all the lines' promotions together
 * and the larger of the two is the cart's.
 *
 * A percentage is rounded up to the cent, in the customer's favour: "10% off" then never reads as
 * 9% on the shelf's badge, which is computed from the two prices and rounds down (BEELINK-193).
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
  /** Who it is for. The arithmetic prices with every promotion it is given: leaving out those not for this customer is the caller's. */
  audience: DiscountAudience;
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

function reaches(promotion: PricingPromotion, line: Pick<PricingLine, 'productId' | 'categoryIds'>): boolean {
  switch (promotion.scope) {
    case 'CART':
      return true;
    case 'PRODUCTS':
      return promotion.productIds.includes(line.productId);
    case 'CATEGORIES':
      return line.categoryIds.some((id) => promotion.categoryIds.includes(id));
  }
}

/** A share of an amount, up to the cent: never more than the amount, since the share is at most all of it. */
function shareOf(cents: number, percentBps: number | null): number {
  return Math.ceil((cents * (percentBps ?? 0)) / PERCENT_BPS_MAX);
}

function perUnit(promotion: PricingPromotion, unitPriceCents: number): number {
  if (promotion.discountKind === 'PERCENT') return shareOf(unitPriceCents, promotion.percentBps);
  return Math.min(promotion.amountCents ?? 0, unitPriceCents);
}

/** What a unit is priced from: the product, where it sits, and the catalogue's price of one. */
export type PricingUnit = Pick<PricingLine, 'productId' | 'categoryIds' | 'unitPriceCents'>;

/**
 * The one promotion worth the most off one unit; on a tie, the first of the list. It is what the
 * shop window prices a product with and what a cart's line multiplies by its quantity, so the
 * shelf's promotional price times the quantity is the line's. A fixed amount off the whole cart is
 * no unit's, and is left out.
 */
export function unitDiscountOf(unit: PricingUnit, promotions: readonly PricingPromotion[]): LineDiscount {
  let best = NONE;
  for (const promotion of promotions) {
    if (isCartAmount(promotion) || !reaches(promotion, unit)) continue;
    const discountCents = perUnit(promotion, unit.unitPriceCents);
    if (discountCents > best.discountCents) best = { discountCents, promotion: { id: promotion.id, name: promotion.name } };
  }
  return best;
}

function sumOf(discounts: readonly LineDiscount[]): number {
  return discounts.reduce((sum, line) => sum + line.discountCents, 0);
}

/** Each line's unit discount, times its quantity. */
function bestPerLine(lines: readonly PricingLine[], promotions: readonly PricingPromotion[]): LineDiscount[] {
  return lines.map((line) => {
    const unit = unitDiscountOf(line, promotions);
    return { discountCents: unit.discountCents * line.quantity, promotion: unit.promotion };
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

/**
 * The promotions that price a cart whoever buys it: those for a first purchase left out. A customer
 * on a first purchase competes with every promotion; anyone else, and a cart nobody is identified
 * on, with these.
 */
export function forEveryone(promotions: readonly PricingPromotion[]): PricingPromotion[] {
  return promotions.filter((promotion) => promotion.audience === 'EVERYONE');
}

/** What `QuotedFirstPurchase` says of the cart alone. Its `status` is why this customer did not get it, which the arithmetic does not know. */
export type FirstPurchaseOffer = Omit<QuotedFirstPurchase, 'status'>;

/**
 * What a cart priced without the promotions for a first purchase is missing (BEELINK-245): how much
 * more it would lose with them competing, as they do for a customer on a first purchase. It is the
 * difference between the two pricings and not such a promotion's own worth — promotions never add
 * up, so one that a promotion for everyone beats or ties adds nothing, and nothing is announced: null.
 */
export function firstPurchaseOfferOf(lines: readonly PricingLine[], promotions: readonly PricingPromotion[]): FirstPurchaseOffer | null {
  const forFirstPurchase = promotions.filter((promotion) => promotion.audience === 'FIRST_PURCHASE');
  if (forFirstPurchase.length === 0) return null;

  const offered = promotionDiscountsOf(lines, promotions);
  const discountCents = sumOf(offered) - sumOf(promotionDiscountsOf(lines, forEveryone(promotions)));
  if (discountCents <= 0) return null;

  const onLines = forFirstPurchase.filter((promotion) => offered.some((line) => line.promotion?.id === promotion.id));
  return { promotionName: onLines.length === 1 ? onLines[0]!.name : null, discountCents };
}

export interface PricingCoupon {
  kind: CouponKind;
  percentBps: number | null;
  amountCents: number | null;
}

/**
 * What a coupon takes off, after the promotions: a share — rounded up, as a promotion's — or an
 * amount of what is left of the products (`baseCents`), never more than it; or the delivery fee,
 * zero while that is not agreed.
 */
export function couponDiscountOf(coupon: PricingCoupon, baseCents: number, deliveryFeeCents: number | null): number {
  switch (coupon.kind) {
    case 'PERCENT':
      return shareOf(baseCents, coupon.percentBps);
    case 'FIXED':
      return Math.min(coupon.amountCents ?? 0, baseCents);
    case 'FREE_SHIPPING':
      return deliveryFeeCents ?? 0;
  }
}
