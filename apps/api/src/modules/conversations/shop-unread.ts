// Types
import type { ShopConversationUnread } from '@harness-monorepo/contracts';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

/**
 * The customers' messages a shop has not read, and the conversations they are in. By the shop's id,
 * with no check of who asks: the caller has already settled that the shop is theirs.
 */
export async function shopUnreadOf(prisma: PrismaService, storeId: string): Promise<ShopConversationUnread> {
  const unread = { author: 'CUSTOMER', readAt: null } as const;
  const [messages, conversations] = await prisma.$transaction([
    prisma.orderMessage.count({ where: { ...unread, conversation: { order: { storeId } } } }),
    prisma.orderConversation.count({ where: { order: { storeId }, messages: { some: unread } } }),
  ]);
  return { messages, conversations };
}
