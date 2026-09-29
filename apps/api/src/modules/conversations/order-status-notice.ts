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
}

/**
 * The order's move, told in its conversation (BEELINK-236) — inside the transaction that moves it, so
 * the notice and the status never disagree. The conversation opens here when the order has none: a
 * new order's first status, or the next move of one placed before conversations were born with it.
 *
 * Only for a customer with an account: one known only by an order has nowhere to read it. The
 * transaction's own event (`order.created`, `order.status`) is what makes both sides read it again.
 */
export async function noteOrderStatus(tx: Tx, { order, status, at, seen }: OrderStatusNotice): Promise<void> {
  const customer = await tx.customer.findUnique({ where: { id: order.customerId }, select: { userId: true } });
  if (!customer?.userId) return;

  // On the unique order id: a notice and the customer's first message at once open one conversation.
  const conversation = await tx.orderConversation.upsert({
    where: { orderId: order.id },
    create: { orderId: order.id, lastMessageAt: at },
    update: { lastMessageAt: at },
    select: { id: true },
  });
  await tx.orderMessage.create({ data: { conversationId: conversation.id, author: 'SYSTEM', status, body: '', createdAt: at, readAt: seen ? at : null } });
}
