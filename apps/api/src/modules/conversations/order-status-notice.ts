// Types
import type { OrderStatus } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

type Tx = Prisma.TransactionClient;

export interface OrderStatusNotice {
  order: { id: string; customerId: string };
  status: OrderStatus;
  at: Date;
  /** The customer's own doing — placing the order, cancelling it: told, but not as news to them. */
  seen: boolean;
  /** On a delivery, the cashback it made usable (BEELINK-239); absent otherwise. */
  cashbackCents?: number | null;
  /** On a cancellation: bee-link's own, of an order nobody paid in time (BEELINK-207). */
  unpaid?: boolean;
}

/**
 * The order's move, told in its conversation (BEELINK-236) — inside the transaction that moves it, so
 * the notice and the status never disagree. The conversation opens here when the order has none: a
 * new order's first status, or the next move of one placed before conversations were born with it.
 *
 * Only for a customer with an account: one known only by an order has nowhere to read it. The
 * transaction's own event (`order.created`, `order.status`) is what makes both sides read it again.
 */
export async function noteOrderStatus(tx: Tx, { order, status, at, seen, cashbackCents = null, unpaid = false }: OrderStatusNotice): Promise<void> {
  const conversationId = await conversationOf(tx, order, at);
  if (!conversationId) return;
  const notice = unpaid && status === 'CANCELLED' ? ('CANCELLED_UNPAID' as const) : null;
  await tx.orderMessage.create({ data: { conversationId, author: 'SYSTEM', status, notice, body: '', cashbackCents, createdAt: at, readAt: seen ? at : null } });
}

/**
 * The order's online payment approved, told in its conversation (BEELINK-207) — inside the
 * transaction that writes the payment, as a status is. Once an order: a conversation that already
 * tells of it is left alone. The payment's own event (`order.payment`) makes both sides read again.
 */
export async function notePaymentApproved(tx: Tx, order: { id: string; customerId: string }, at: Date): Promise<void> {
  const conversationId = await conversationOf(tx, order, at);
  if (!conversationId) return;
  const told = await tx.orderMessage.count({ where: { conversationId, notice: 'PAYMENT_APPROVED' } });
  if (told === 0) await tx.orderMessage.create({ data: { conversationId, author: 'SYSTEM', notice: 'PAYMENT_APPROVED', body: '', createdAt: at } });
}

/**
 * Money of the order's payment given back, told in its conversation (BEELINK-208) — inside the
 * transaction that first writes the refund as taken by Asaas, once a refund: whoever writes that
 * calls this once. The amount is told as it was.
 */
export async function noteRefund(tx: Tx, order: { id: string; customerId: string }, refundCents: number, at: Date): Promise<void> {
  const conversationId = await conversationOf(tx, order, at);
  if (!conversationId) return;
  await tx.orderMessage.create({ data: { conversationId, author: 'SYSTEM', notice: 'PAYMENT_REFUNDED', refundCents, body: '', createdAt: at } });
}

/** The order's conversation, opened when it has none; null for a customer with no account to read it. */
async function conversationOf(tx: Tx, order: { id: string; customerId: string }, at: Date): Promise<string | null> {
  const customer = await tx.customer.findUnique({ where: { id: order.customerId }, select: { userId: true } });
  if (!customer?.userId) return null;

  // On the unique order id: a notice and the customer's first message at once open one conversation.
  const conversation = await tx.orderConversation.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, lastMessageAt: at },
    update: { lastMessageAt: at },
    select: { id: true },
  });
  return conversation.id;
}
