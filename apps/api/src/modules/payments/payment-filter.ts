// Types
import type { OrderPaymentFilter } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PAID_STATUSES } from './payment-status.js';

/** The statuses of a charge that holds the customer's money now: `holdsMoney`, as a list a query takes. */
const HOLDING = ['CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED'] as const;

/**
 * A shop's orders by where their money stands (BEELINK-207), as a condition on the list. Paid is an
 * order that holds money; waiting is one charged online that stands and was never paid — with a
 * charge or still without one, which to the shop is the same wait. One refunded whole is neither.
 * Refunded is money given back, whole or in part, or on its way back (BEELINK-208); a stray payment
 * counts only while the shop has not settled it.
 */
export function paymentFilterOf(filter: OrderPaymentFilter): Prisma.OrderWhereInput {
  switch (filter) {
    case 'PAID':
      return { payments: { some: { status: { in: [...HOLDING] } } } };
    case 'PENDING':
      return { paymentChannel: 'ONLINE', status: { not: 'CANCELLED' }, payments: { none: { status: { in: [...PAID_STATUSES] } } } };
    case 'PAID_UNSEEN':
      return { paidNotice: { seenAt: null }, payments: { some: { status: { in: [...HOLDING] } } } };
    case 'STRAY':
      return { strayPayments: { some: { resolvedAt: null } } };
    case 'REFUNDED':
      return { payments: { some: { OR: [{ status: { in: ['REFUNDED', 'PARTIALLY_REFUNDED'] } }, { refundingCents: { gt: 0 } }] } } };
  }
}
