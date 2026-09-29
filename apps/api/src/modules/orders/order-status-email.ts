// Types
import type { OrderStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { NotifiedOrderStatus } from '../../shared/mail/mail.templates.js';

type Tx = Prisma.TransactionClient;

/** The moves a customer hears of by e-mail; received and preparing are the shop's own business. */
const NOTIFIED: readonly OrderStatus[] = ['ACCEPTED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] satisfies NotifiedOrderStatus[];

export function isNotified(status: OrderStatus): status is NotifiedOrderStatus {
  return NOTIFIED.includes(status);
}

export interface OwedStatusEmail {
  order: { id: string; customerId: string };
  status: OrderStatus;
  /** The customer's own doing — cancelling it: they know, and are told nothing. */
  byCustomer: boolean;
}

/**
 * The e-mail an order's move owes its customer (BEELINK-151), written inside the transaction that
 * moves it: the move and the debt commit together, and `OrderStatusMailer` pays it after. Owed only
 * to a customer whose account confirmed its e-mail — anyone can type someone else's — and who has
 * not turned the notice off, read at the move.
 */
export async function oweStatusEmail(tx: Tx, { order, status, byCustomer }: OwedStatusEmail): Promise<boolean> {
  if (byCustomer || !isNotified(status)) return false;

  const customer = await tx.customer.findUnique({
    where: { id: order.customerId },
    select: { notifyOrders: true, user: { select: { emailVerifiedAt: true } } },
  });
  if (!customer?.user?.emailVerifiedAt || !customer.notifyOrders) return false;

  await tx.orderStatusEmail.create({ data: { orderId: order.id, status } });
  return true;
}
