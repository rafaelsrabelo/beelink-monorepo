// Nest
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { refreshBooks } from '../customers/customer-books.js';
import { ORDER_AMOUNT_MAX_CENTS, orderError } from './orders.constants.js';
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
      select: { id: true, status: true, fulfillment: true, customerId: true, subtotalCents: true, discountCents: true },
    });
    if (!current) throw new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${number} in this shop`));
    if (current.fulfillment === 'PICKUP') {
      throw new BadRequestException(orderError('ORDER_DELIVERY_FOR_PICKUP', 'A pick-up is handed over at the shop: it has no fee'));
    }
    if (current.status === 'CANCELLED') {
      throw new ConflictException(orderError('ORDER_CANCELLED', 'A cancelled order does not change'));
    }

    const totalCents = current.subtotalCents + deliveryFeeCents - current.discountCents;
    if (totalCents > ORDER_AMOUNT_MAX_CENTS) {
      throw new BadRequestException(orderError('ORDER_TOTAL_TOO_LARGE', 'The order would pass what one order may be'));
    }

    const order = await tx.order.update({ where: { id: current.id }, data: { deliveryFeeCents, totalCents }, include: ORDER_INCLUDE });
    await refreshBooks(tx, current.customerId);
    return order;
  });
}
