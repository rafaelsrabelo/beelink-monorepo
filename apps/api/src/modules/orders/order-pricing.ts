// Nest
import { BadRequestException, ConflictException } from '@nestjs/common';

// Types
import type { OrderCouponRefusedDetails, OrderFulfillment, QuotedCoupon } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { couponRefusalOf, storedCodeOf } from '../promotions/coupon-verdict.js';
import { couponDiscountOf, promotionDiscountsOf, type LineDiscount } from '../promotions/discount-pricing.js';
import { couponByCode, customerUsesOf, runningPromotions } from '../promotions/order-discounts.js';
import type { OrderLine } from './order-lines.js';
import { totalsOf, type OrderTotals } from './order-totals.js';
import { orderError } from './orders.constants.js';

/** What an order is priced from, whoever asks: a quote reads it, a placement writes what it answers. */
export interface PricingInput {
  storeId: string;
  lines: readonly OrderLine[];
  fulfillment: OrderFulfillment;
  /** Null for a delivery whose fee the shop has not told yet. */
  deliveryFeeCents: number | null;
  /** What the shopkeeper typed, beyond the promotions and the coupon. */
  manualDiscountCents: number;
  /** As it was typed; null is none. */
  couponCode: string | null;
  /** Whose order it is, for a coupon's limit by customer; null when nobody is identified yet. */
  customerId: string | null;
  /** When the order is placed: the promotions running and the coupon's period are read at it. */
  at: Date;
  /** Hold the coupon's row to the end of the transaction — a placement's, never a quote's. */
  lockCoupon: boolean;
}

export interface PricedOrder {
  /** One per line, in the lines' order. */
  lineDiscounts: LineDiscount[];
  totals: OrderTotals;
  promotionDiscountCents: number;
  couponDiscountCents: number;
  manualDiscountCents: number;
  /** The coupon as typed and what became of it; null when no code was sent. */
  verdict: QuotedCoupon | null;
  /** Why it was refused, as an order answers it. */
  refusal: OrderCouponRefusedDetails | null;
  /** The coupon taken, to write its use; null with none, and with one refused. */
  coupon: Pick<CouponModel, 'id' | 'code' | 'kind'> | null;
}

/**
 * The one calculation of an order's discount (BEELINK-191): the promotions line by line, then the
 * coupon over what is left of the products, then what the shopkeeper typed. The cart's quote, the
 * checkout's and the order written all land here, so what the customer saw is what is recorded.
 *
 * A coupon that does not hold is answered, not thrown: a quote says why and prices without it. A
 * total that cannot be — a typed discount beyond the order, an amount past what one order may be —
 * is refused as it always was.
 */
export async function priceOrder(db: Prisma.TransactionClient, input: PricingInput): Promise<PricedOrder> {
  const { storeId, lines, fulfillment, at } = input;
  // A pick-up has no fee, whatever was typed; the coupon reads the fee the order will have.
  const fee = fulfillment === 'PICKUP' ? 0 : input.deliveryFeeCents;

  const promotions = await runningPromotions(db, storeId, at, { productIds: lines.map((line) => line.productId), categoryIds: lines.flatMap((line) => line.categoryIds) });
  const lineDiscounts = promotionDiscountsOf(lines, promotions);
  const promotionDiscountCents = lineDiscounts.reduce((sum, line) => sum + line.discountCents, 0);
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const baseCents = subtotalCents - promotionDiscountCents;

  let verdict: QuotedCoupon | null = null;
  let refusal: OrderCouponRefusedDetails | null = null;
  let coupon: CouponModel | null = null;
  if (input.couponCode !== null) {
    const stored = storedCodeOf(input.couponCode);
    const found = stored ? await couponByCode(db, storeId, stored, input.lockCoupon) : null;
    const customerUses = found && found.maxUsesPerCustomer !== null && input.customerId ? await customerUsesOf(db, found.id, input.customerId) : null;
    refusal = couponRefusalOf(found, { at, baseCents, fulfillment, deliveryFeeCents: fee, customerUses });
    coupon = refusal ? null : found;
    // Echoed in upper case either way, so the field shows what the shop would have stored.
    const code = found?.code ?? input.couponCode.trim().toUpperCase();
    verdict = coupon ? { status: 'APPLIED', code, kind: coupon.kind } : { status: 'REFUSED', code, ...refusal! };
  }
  const couponDiscountCents = coupon ? couponDiscountOf(coupon, baseCents, fee) : 0;

  const totals = totalsOf(lines, fulfillment, fee, promotionDiscountCents + couponDiscountCents + input.manualDiscountCents);
  if (totals === 'DISCOUNT_TOO_LARGE') {
    throw new BadRequestException(orderError('ORDER_DISCOUNT_TOO_LARGE', 'The discount is larger than the order'));
  }
  if (totals === 'TOTAL_TOO_LARGE') {
    throw new BadRequestException(orderError('ORDER_TOTAL_TOO_LARGE', 'A line or the order is past what one order may be'));
  }

  return { lineDiscounts, totals, promotionDiscountCents, couponDiscountCents, manualDiscountCents: input.manualDiscountCents, verdict, refusal, coupon };
}

/** An order does not go through with a coupon that does not hold: the customer asked for that price. */
export function couponRefused(details: OrderCouponRefusedDetails): ConflictException {
  return new ConflictException({ ...orderError('ORDER_COUPON_REFUSED', `The coupon is not taken: ${details.reason}`), details });
}
