// Types
import type { OrderStatusFilter } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

// App
import { OPEN_ORDER_STATUSES } from './orders.constants.js';

/** The list's status filter as a condition: one status, or all the open ones. */
export function statusFilterOf(status: OrderStatusFilter): Prisma.OrderWhereInput {
  return status === 'OPEN' ? { status: { in: [...OPEN_ORDER_STATUSES] } } : { status };
}

/**
 * How many of a shop's orders are open — the same condition as the list's `OPEN` filter, so the
 * menu's number is the filtered list's total. One count over `(storeId, status)`; no order is read.
 * By the shop's id, with no check of who asks: the caller has already settled that the shop is theirs.
 */
export function countOpenOrders(prisma: PrismaService, storeId: string): Promise<number> {
  return prisma.order.count({ where: { storeId, ...statusFilterOf('OPEN') } });
}
