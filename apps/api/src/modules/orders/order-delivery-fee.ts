// Nest
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { refreshBooks } from '../customers/customer-books.js';
import { refusePaidOrder } from '../payments/payment-guards.js';
import { paymentDueAtOf } from '../payments/payments.constants.js';
import { totalRefusalOf } from './order-totals.js';
import { orderError } from './orders.constants.js';
import { ORDER_INCLUDE } from './orders.mapper.js';

export type OrderWithDetail = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

/**
 * The fee the shop agreed for a delivery (BEELINK-170), and the total that follows — and the
 * customer's books, which add totals up. A pick-up has none; a cancelled order is history.
 *
 * Under the shop's row lock, as a placement and a status change take it: the three never
 * interleave, so the books read the total this writes.
 */
export async function agreeDeliveryFee(prisma: PrismaService, storeId: string, number: number, deliveryFeeCents: number): Promise<OrderWithDetail> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;

    const current = await tx.order.findUnique({
      where: { storeId_number: { storeId, number } },
      select: { id: true, status: true, fulfillment: true, customerId: true, paymentChannel: true, subtotalCents: true, discountCents: true, couponKind: true, couponDiscountCents: true, cashbackUsedCents: true },
    });
    if (!current) throw new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} in this shop`));
    if (current.fulfillment === 'PICKUP') {
      throw new BadRequestException(orderError('ORDER_DELIVERY_FOR_PICKUP', 'A pick-up is handed over at the shop: it has no fee'));
    }
    if (current.status === 'CANCELLED') {
      throw new ConflictException(orderError('ORDER_CANCELLED', 'A cancelled order does not change'));
    }

    // The charge was paid at the total as it was (BEELINK-204).
    await refusePaidOrder(tx, current.id);

    // A free-delivery coupon takes the fee off, whatever it turns out to be: its discount follows
    // the fee, and so does the use on the coupon's list.
    const waived = current.couponKind === 'FREE_SHIPPING';
    const couponDiscountCents = waived ? deliveryFeeCents : current.couponDiscountCents;
    const discountCents = current.discountCents - current.couponDiscountCents + couponDiscountCents;
    // Lowering a fee can leave a discount bigger than what is paid, as a placement would refuse it.
    // The credit it spent stays off: it paid for products, never the fee (BEELINK-240).
    const totalCents = current.subtotalCents + deliveryFeeCents - discountCents - current.cashbackUsedCents;
    const refusal = totalRefusalOf(totalCents);
    if (refusal === 'TOTAL_TOO_LARGE') {
      throw new BadRequestException(orderError('ORDER_TOTAL_TOO_LARGE', 'The order would pass what one order may be'));
    }
    if (refusal === 'DISCOUNT_TOO_LARGE') {
      throw new BadRequestException(orderError('ORDER_DISCOUNT_TOO_LARGE', 'The discount would be larger than the order'));
    }

    // A total closed now is paid within three days of now, whatever stood before (BEELINK-206).
    const order = await tx.order.update({ where: { id: current.id }, data: { deliveryFeeCents, couponDiscountCents, discountCents, totalCents, ...(current.paymentChannel === 'ONLINE' ? { paymentDueAt: paymentDueAtOf(new Date()) } : {}) }, include: ORDER_INCLUDE });
    if (waived) await tx.couponRedemption.updateMany({ where: { orderId: current.id }, data: { discountCents: couponDiscountCents } });
    await refreshBooks(tx, current.customerId);
    return order;
  });
}
