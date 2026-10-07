// Nest
import { BadRequestException, ConflictException } from '@nestjs/common';

// Types
import type { OrderCashbackRefusedDetails, OrderCouponRefusedDetails, OrderFulfillment, QuotedCoupon, QuotedFirstPurchase } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { earningBaseOf, type EarningParts } from '../cashback/cashback-earning.js';
import { cashbackUseOf, type CashbackUse, type CashbackWant } from '../cashback/cashback-redemption.js';
import { couponRefusalOf, storedCodeOf, type CouponContext } from '../promotions/coupon-verdict.js';
import { couponDiscountOf, firstPurchaseOfferOf, forEveryone, promotionDiscountsOf, type LineDiscount, type PricingPromotion } from '../promotions/discount-pricing.js';
import { couponByCode, customerUsesOf, firstPurchaseOf, runningPromotions } from '../promotions/order-discounts.js';
import type { OrderLine } from './order-lines.js';
import { totalsOf, type OrderTotals } from './order-totals.js';
import { orderError } from './orders.constants.js';

/**
 * Whose order is priced. `id` is their record at the shop, read for their uses of a coupon and for
 * their orders. A null `id` is somebody the order would register — the panel's sale for a phone the
 * shop does not have — with nothing to read: no use of a coupon, and no order, so a first purchase.
 */
export interface PricingCustomer {
  id: string | null;
}

/** Read with what it names among the cart alone (`runningPromotions`' `only`): a list left empty reaches no line. */
function reachesTheCart(promotion: PricingPromotion): boolean {
  return promotion.scope === 'CART' || promotion.productIds.length > 0 || promotion.categoryIds.length > 0;
}

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
  /** Null when nobody is identified yet: a visitor's cart, or a sale before its customer is chosen. */
  customer: PricingCustomer | null;
  /** When the order is placed: the promotions running and the coupon's period are read at it. */
  at: Date;
  /**
   * Hold what the limits are read from to the end of the transaction — the coupon's row, and the
   * customer's before a first purchase is said: a placement's, never a quote's. The two are taken
   * coupon first here and customer first by the panel's sale, which registers its customer before
   * pricing: what keeps that from ever crossing is the shop's row, which every placement holds first.
   */
  lock: boolean;
  /**
   * The customer's credit to spend (BEELINK-240): none, the most the cart takes — a quote asked to
   * apply it — or the amount a placement was shown. Absent is none.
   */
  cashback?: CashbackWant;
  /**
   * The clock credit's expiry is read against — never `at`, which the panel may set in the past. A
   * placement passes the instant it spends at, so the lots it counts are the ones it takes. Absent is now.
   */
  now?: Date;
}

export interface PricedOrder {
  /** One per line, in the lines' order. */
  lineDiscounts: LineDiscount[];
  totals: OrderTotals;
  promotionDiscountCents: number;
  /** What the promotions for a first purchase would have added, and why they did not; null with none, and once they applied. */
  firstPurchase: QuotedFirstPurchase | null;
  couponDiscountCents: number;
  manualDiscountCents: number;
  /** The coupon as typed and what became of it; null when no code was sent. */
  verdict: QuotedCoupon | null;
  /** Why it was refused, as an order answers it. */
  refusal: OrderCouponRefusedDetails | null;
  /** The coupon taken, to write its use; null with none, and with one refused. */
  coupon: Pick<CouponModel, 'id' | 'code' | 'kind'> | null;
  /** The customer's credit against the order, and what it spends — already off `totals.totalCents`. Null with nobody identified. */
  cashbackUse: CashbackUse | null;
  /**
   * What a coupon is read against on this cart — the very values the code sent was, or would have
   * been, taken or refused with. Whose uses and whose first purchase are not here: they are the
   * customer's, read per coupon. The shop window lists a coupon as usable from these and no others
   * (`CustomerOffers`), so it never offers one that applying would refuse.
   */
  couponBase: Pick<CouponContext, 'at' | 'baseCents' | 'fulfillment' | 'deliveryFeeCents'>;
}

/**
 * The one calculation of an order's discount (BEELINK-191): the promotions line by line, then the
 * coupon over what is left of the products, then what the shopkeeper typed. The cart's quote, the
 * checkout's and the order written all land here, so what the customer saw is what is recorded.
 *
 * A promotion or a coupon for a first purchase (BEELINK-245) is for a customer with no order at the
 * shop that stands. To one who has bought, such a promotion is left out of the lines, and what it
 * would have added is answered for the cart to say why; such a coupon is refused. With nobody
 * identified neither can be said: the promotion is left out and announced all the same, and the
 * coupon is not refused for it.
 *
 * A coupon that does not hold is answered, not thrown: a quote says why and prices without it. A
 * total that cannot be — a typed discount beyond the order, an amount past what one order may be —
 * is refused as it always was.
 */
export async function priceOrder(db: Prisma.TransactionClient, input: PricingInput): Promise<PricedOrder> {
  const { storeId, lines, fulfillment, at, customer } = input;
  // A pick-up has no fee, whatever was typed; the coupon reads the fee the order will have.
  const fee = fulfillment === 'PICKUP' ? 0 : input.deliveryFeeCents;

  const promotions = await runningPromotions(db, storeId, at, { productIds: lines.map((line) => line.productId), categoryIds: lines.flatMap((line) => line.categoryIds) });
  const stored = input.couponCode === null ? null : storedCodeOf(input.couponCode);
  const found = stored ? await couponByCode(db, storeId, stored, input.lock) : null;

  // The customer's orders are read only when a discount for a first purchase reaches the cart: one
  // that does not costs no look at them. Somebody the order would register has none to read.
  const asked = promotions.some((promotion) => promotion.audience === 'FIRST_PURCHASE' && reachesTheCart(promotion)) || found?.audience === 'FIRST_PURCHASE';
  const onFirstPurchase = !asked || !customer ? null : customer.id === null || (await firstPurchaseOf(db, customer.id, input.lock));

  const lineDiscounts = promotionDiscountsOf(lines, onFirstPurchase ? promotions : forEveryone(promotions));
  const missed = onFirstPurchase ? null : firstPurchaseOfferOf(lines, promotions);
  const promotionDiscountCents = lineDiscounts.reduce((sum, line) => sum + line.discountCents, 0);
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
  const baseCents = subtotalCents - promotionDiscountCents;
  const couponBase = { at, baseCents, fulfillment, deliveryFeeCents: fee };

  let verdict: QuotedCoupon | null = null;
  let refusal: OrderCouponRefusedDetails | null = null;
  let coupon: CouponModel | null = null;
  if (input.couponCode !== null) {
    const customerUses = found && found.maxUsesPerCustomer !== null && customer?.id ? await customerUsesOf(db, found.id, customer.id) : null;
    refusal = couponRefusalOf(found, { ...couponBase, customerUses, firstPurchase: onFirstPurchase });
    coupon = refusal ? null : found;
    // Echoed in upper case either way, so the field shows what the shop would have stored.
    const code = found?.code ?? input.couponCode.trim().toUpperCase();
    verdict = coupon ? { status: 'APPLIED', code, kind: coupon.kind } : { status: 'REFUSED', code, ...refusal! };
  }
  const couponDiscountCents = coupon ? couponDiscountOf(coupon, baseCents, fee) : 0;

  // Credit comes last, over what is left of the products: never the delivery (BEELINK-240).
  const productsCents = earningBaseOf({
    subtotalCents,
    promotionDiscountCents,
    couponDiscountCents,
    couponKind: coupon?.kind ?? null,
    manualDiscountCents: input.manualDiscountCents,
    cashbackUsedCents: 0,
  });
  const cashbackUse = customer ? await cashbackUseOf(db, { storeId, customerId: customer.id, productsCents, want: input.cashback ?? 'NONE', lock: input.lock, now: input.now ?? new Date() }) : null;

  const totals = totalsOf(lines, fulfillment, fee, promotionDiscountCents + couponDiscountCents + input.manualDiscountCents, cashbackUse?.appliedCents ?? 0);
  if (totals === 'DISCOUNT_TOO_LARGE') {
    throw new BadRequestException(orderError('ORDER_DISCOUNT_TOO_LARGE', 'The discount is larger than the order'));
  }
  if (totals === 'TOTAL_TOO_LARGE') {
    throw new BadRequestException(orderError('ORDER_TOTAL_TOO_LARGE', 'A line or the order is past what one order may be'));
  }

  return {
    lineDiscounts,
    totals,
    promotionDiscountCents,
    // A promotion was missed, so the question was asked: left unanswered, nobody is identified.
    firstPurchase: missed && { status: onFirstPurchase === null ? 'UNIDENTIFIED' : 'NOT_FIRST', ...missed },
    couponDiscountCents,
    manualDiscountCents: input.manualDiscountCents,
    verdict,
    refusal,
    coupon,
    cashbackUse,
    couponBase,
  };
}

/**
 * What an order's cashback is worked out from, as it was priced (BEELINK-243): one reading for the
 * quote and the placement, so what the cart promised is what the order records.
 */
export function earningPartsOf(priced: PricedOrder, cashbackUsedCents: number): EarningParts {
  return {
    subtotalCents: priced.totals.subtotalCents,
    promotionDiscountCents: priced.promotionDiscountCents,
    couponDiscountCents: priced.couponDiscountCents,
    couponKind: priced.coupon?.kind ?? null,
    manualDiscountCents: priced.manualDiscountCents,
    cashbackUsedCents,
  };
}

/** An order does not go through spending another amount of credit than the customer was shown (BEELINK-240). */
export function cashbackRefused(details: OrderCashbackRefusedDetails): ConflictException {
  return new ConflictException({ ...orderError('ORDER_CASHBACK_REFUSED', 'The credit asked for is more than the customer can spend now'), details });
}

/** An order does not go through with a coupon that does not hold: the customer asked for that price. */
export function couponRefused(details: OrderCouponRefusedDetails): ConflictException {
  return new ConflictException({ ...orderError('ORDER_COUPON_REFUSED', `The coupon is not taken: ${details.reason}`), details });
}
