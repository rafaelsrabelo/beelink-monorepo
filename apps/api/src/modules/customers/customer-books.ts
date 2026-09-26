// Types
import type { Prisma } from '../../generated/prisma/client.js';

/**
 * What a customer spends per valid order, in whole cents: the total over the count, to the nearest
 * cent, half a cent rounding up. Null with no valid order — nothing divided by nothing is not zero.
 */
export function averageTicketOf(totalSpentCents: bigint | number, ordersCount: number): number | null {
  if (ordersCount <= 0) return null;
  return Math.round(Number(totalSpentCents) / ordersCount);
}

/**
 * The customer's books, read again from the orders that count — every one not cancelled. Inside the
 * transaction that moved them: placing, cancelling or merging, under the shop's row lock.
 */
export async function refreshBooks(tx: Prisma.TransactionClient, customerId: string): Promise<void> {
  const books = await tx.order.aggregate({
    where: { customerId, status: { not: 'CANCELLED' } },
    _count: { _all: true },
    _sum: { totalCents: true },
    _min: { placedAt: true },
    _max: { placedAt: true },
  });

  await tx.customer.update({
    where: { id: customerId },
    data: {
      ordersCount: books._count._all,
      totalSpentCents: BigInt(books._sum.totalCents ?? 0),
      firstOrderAt: books._min.placedAt,
      lastOrderAt: books._max.placedAt,
    },
  });
}
