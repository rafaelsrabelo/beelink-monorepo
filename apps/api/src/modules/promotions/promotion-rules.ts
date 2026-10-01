// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { CouponKind, PromotionErrorCode, PromotionScope } from '@harness-monorepo/contracts';

// App
import { promotionError } from './promotions.constants.js';

/**
 * What a promotion and a coupon refuse that one field alone cannot say: each is a rule about two.
 * The database repeats the first two as CHECKs, for a writer that is not this API.
 */

type DiscountCode = Extract<PromotionErrorCode, 'PROMOTION_DISCOUNT_INVALID' | 'COUPON_DISCOUNT_INVALID'>;
type PeriodCode = Extract<PromotionErrorCode, 'PROMOTION_PERIOD_INVALID' | 'COUPON_PERIOD_INVALID'>;

export interface DiscountValue {
  percentBps: number | null;
  amountCents: number | null;
}

/**
 * The value the kind asks for, and only that one: a percentage carrying an amount as well would
 * leave the next reader to guess which of the two was meant.
 */
export function discountOf(kind: CouponKind, percentBps: number | null | undefined, amountCents: number | null | undefined, errorCode: DiscountCode): DiscountValue {
  const percent = percentBps ?? null;
  const amount = amountCents ?? null;
  const refuse = (message: string) => new BadRequestException(promotionError(errorCode, message));

  switch (kind) {
    case 'PERCENT':
      if (percent === null || amount !== null) throw refuse('A PERCENT discount carries percentBps, and no amountCents');
      return { percentBps: percent, amountCents: null };
    case 'FIXED':
      if (amount === null || percent !== null) throw refuse('A FIXED discount carries amountCents, and no percentBps');
      return { percentBps: null, amountCents: amount };
    case 'FREE_SHIPPING':
      if (percent !== null || amount !== null) throw refuse('A FREE_SHIPPING coupon carries neither percentBps nor amountCents');
      return { percentBps: null, amountCents: null };
  }
}

export function assertPeriod(startsAt: Date, endsAt: Date | null | undefined, errorCode: PeriodCode): void {
  if (endsAt && endsAt <= startsAt) {
    throw new BadRequestException(promotionError(errorCode, 'endsAt must be after startsAt, or absent to never end'));
  }
}

export interface PromotionTargets {
  productIds: string[];
  categoryIds: string[];
}

/**
 * The lists the scope asks for, each id once and in lower case. A scope with the other scope's
 * list is refused rather than ignored: the form that sent it believes it said something.
 */
export function targetsOf(scope: PromotionScope, productIds: readonly string[] | undefined, categoryIds: readonly string[] | undefined): PromotionTargets {
  const products = [...new Set((productIds ?? []).map((id) => id.toLowerCase()))];
  const categories = [...new Set((categoryIds ?? []).map((id) => id.toLowerCase()))];
  const refuse = (message: string) => new BadRequestException(promotionError('PROMOTION_TARGETS_INVALID', message));

  switch (scope) {
    case 'CART':
      if (products.length > 0 || categories.length > 0) throw refuse('A CART promotion names no products and no categories');
      break;
    case 'PRODUCTS':
      if (products.length === 0 || categories.length > 0) throw refuse('A PRODUCTS promotion names at least one product, and no categories');
      break;
    case 'CATEGORIES':
      if (categories.length === 0 || products.length > 0) throw refuse('A CATEGORIES promotion names at least one category, and no products');
      break;
  }
  return { productIds: products, categoryIds: categories };
}
