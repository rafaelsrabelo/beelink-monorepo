// Nest
import { ConflictException } from '@nestjs/common';

// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { orderError } from '../orders/orders.constants.js';
import { unrefundedOf } from './payment-refunds.js';

/**
 * Refuses a change that would leave the shop holding money for an order that no longer asks for it:
 * a paid order's total is not changed, nor is it cancelled by its customer, while the shop holds
 * its money. Called inside the order's own transaction, under the shop's row lock, as its other
 * checks are.
 */
export async function refusePaidOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const held = await tx.orderPayment.count({ where: { orderId, status: { in: ['CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED'] } } });
  if (held > 0) throw new ConflictException(orderError('ORDER_PAID', 'A paid order is not cancelled, nor its total changed, before it is refunded'));
}

/**
 * The shop's own cancellation (BEELINK-208): a paid order is cancelled only once Asaas took the
 * refund of all the shop still held — asked before this transaction, and checked here, under the
 * lock, against a payment or a refund that changed meanwhile.
 */
export async function refuseUnrefundedOrder(tx: Prisma.TransactionClient, orderId: string): Promise<void> {
  const held = await tx.orderPayment.findMany({ where: { orderId, status: { in: ['CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED'] }, providerId: { not: null } }, select: { providerId: true, amountCents: true } });
  for (const row of held) {
    if ((await unrefundedOf(tx, { providerId: row.providerId!, amountCents: row.amountCents })) > 0) throw new ConflictException(orderError('ORDER_PAID', 'A paid order is cancelled only with its refund'));
  }
}
