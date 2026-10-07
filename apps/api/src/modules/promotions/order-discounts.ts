// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { CouponModel } from '../../generated/prisma/models.js';

// App
import { lockCustomer } from '../customers/customer-lock.js';
import type { PricingPromotion } from './discount-pricing.js';
import { promotionWhereOf } from './promotion-status.js';
import { RUNNING_PROMOTIONS_MAX } from './promotions.constants.js';

/** The injected client outside a transaction, the transaction's inside one: a quote and an order read alike. */
type Db = Prisma.TransactionClient;

/**
 * What pricing an order reads and writes of the promotions and the coupons (BEELINK-191), and what
 * it reads of its customer's orders for those that are for a first purchase (BEELINK-245). The
 * arithmetic is `discount-pricing.ts`; whether a coupon is taken is `coupon-verdict.ts`.
 */

/** What a cart holds, to read of each promotion only what it names among it. */
export interface CartTargets {
  productIds: readonly string[];
  categoryIds: readonly string[];
}

/**
 * The shop's promotions running at `at`, the newest first, at most `RUNNING_PROMOTIONS_MAX`. The
 * one reading of "what runs now", for an order and for the shop window alike: two would be two
 * rules that agree today.
 *
 * With `only`, each comes with what it names among the cart's products and categories — a promotion
 * naming two hundred products is read as the two the cart holds. Without it, with everything it names.
 *
 * Each comes with its audience, whoever asks: which of them price a cart is the reader's to say —
 * an order by its customer, the shop window by leaving those for a first purchase out. And with its
 * end, which no price reads: the shop window's offers say it (`shop-offers.ts`).
 */
export async function runningPromotions(db: Db, storeId: string, at: Date, only?: CartTargets): Promise<(PricingPromotion & { endsAt: Date | null })[]> {
  const rows = await db.promotion.findMany({
    where: { storeId, ...promotionWhereOf('ACTIVE', at) },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: RUNNING_PROMOTIONS_MAX,
    select: {
      id: true,
      name: true,
      scope: true,
      discountKind: true,
      percentBps: true,
      amountCents: true,
      audience: true,
      endsAt: true,
      products: { ...(only ? { where: { productId: { in: [...only.productIds] } } } : {}), select: { productId: true } },
      categories: { ...(only ? { where: { categoryId: { in: [...only.categoryIds] } } } : {}), select: { categoryId: true } },
    },
  });
  return rows.map(({ products, categories, ...promotion }) => ({
    ...promotion,
    productIds: products.map((row) => row.productId),
    categoryIds: categories.map((row) => row.categoryId),
  }));
}

/**
 * The shop's coupon with this code, as stored. `lock` holds its row until the transaction ends, so
 * the limit read after it is the one the use is written against: two orders at once take turns.
 */
export async function couponByCode(db: Db, storeId: string, code: string, lock: boolean): Promise<CouponModel | null> {
  if (lock) await db.$queryRaw`SELECT 1 FROM "coupons" WHERE "storeId" = ${storeId}::uuid AND "code" = ${code} FOR UPDATE`;
  return db.coupon.findUnique({ where: { storeId_code: { storeId, code } } });
}

/** A customer's orders that used the coupon and stand: a cancelled one gave its use back. */
export function customerUsesOf(db: Db, couponId: string, customerId: string): Promise<number> {
  return db.couponRedemption.count({ where: { couponId, order: { customerId, status: { not: 'CANCELLED' } } } });
}

/**
 * Whether a customer is on a first purchase (BEELINK-245): no order of theirs stands. A cancelled
 * one does not count, and neither does the one being written, which does not exist yet.
 *
 * `lock` holds the customer's row until the transaction ends, so the answer is the one the order is
 * written against: two orders of one customer placed at once take turns, and the second reads the
 * first. The shop's row lock already queues a shop's placements; this keeps the rule true without it.
 */
export async function firstPurchaseOf(db: Db, customerId: string, lock: boolean): Promise<boolean> {
  if (lock) await lockCustomer(db, customerId);
  const standing = await db.order.findFirst({ where: { customerId, status: { not: 'CANCELLED' } }, select: { id: true } });
  return standing === null;
}

/**
 * The use, written with the order. Raw SQL for the count, so the coupon's `updatedAt` stays the
 * shopkeeper's last edit: an order is not an edit of the coupon.
 */
export async function redeemCoupon(tx: Db, couponId: string, orderId: string, discountCents: number): Promise<void> {
  await tx.couponRedemption.create({ data: { couponId, orderId, discountCents } });
  await tx.$executeRaw`UPDATE "coupons" SET "usedCount" = "usedCount" + 1 WHERE "id" = ${couponId}::uuid`;
}

/**
 * A cancelled order gives its coupon's use back: the count goes down, and the use stays on the
 * coupon's list, beside an order that reads cancelled. An order with no coupon gives nothing back.
 */
export async function releaseCoupon(tx: Db, orderId: string): Promise<void> {
  const use = await tx.couponRedemption.findUnique({ where: { orderId }, select: { couponId: true } });
  if (!use) return;
  await tx.$executeRaw`UPDATE "coupons" SET "usedCount" = "usedCount" - 1 WHERE "id" = ${use.couponId}::uuid AND "usedCount" > 0`;
}
