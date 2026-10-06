// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { orderError } from '../orders/orders.constants.js';

/**
 * Refuses a change that would leave the shop holding money for an order that no longer asks for it:
 * a paid order is not cancelled, nor its total changed, until it is refunded (BEELINK-208). Called
 * inside the order's own transaction, under the shop's row lock, as its other checks are.
 */
export async function refusePaidOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const held = await tx.orderPayment.count({ where: { orderId, status: { in: ['CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED'] } } });
  if (held > 0) throw new ConflictException(orderError('ORDER_PAID', 'A paid order is not cancelled, nor its total changed, before it is refunded'));
}
