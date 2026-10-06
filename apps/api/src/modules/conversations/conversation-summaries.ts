// Types
import { Prisma } from '../../generated/prisma/client.js';

// App
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import { UNREAD_AUTHORS, type ConversationReader } from './conversations.constants.js';
import type { LastMessageRow, SummaryRow } from './conversations.mapper.js';

export interface ConversationSummary {
  row: SummaryRow;
  last: LastMessageRow;
  unread: number;
}

/**
 * A page's rows with their last message and the reader's unread count: two reads bounded to the
 * page's ids. As relation includes, Prisma counts every unread message of the platform in one
 * unbounded subquery, and loads every message of the page to keep one.
 */
export async function summariesOf(prisma: PrismaService, rows: readonly SummaryRow[], reader: ConversationReader): Promise<ConversationSummary[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const [lasts, unread] = await Promise.all([
    prisma.$queryRaw<LastMessageRow[]>(Prisma.sql`
      SELECT DISTINCT ON ("conversationId") "conversationId", "author", "body", "status", "notice", "refundCents", "createdAt"
      FROM "order_messages" WHERE "conversationId" = ANY(${ids}::uuid[])
      ORDER BY "conversationId", "createdAt" DESC, "id" DESC`),
    prisma.orderMessage.groupBy({
      by: ['conversationId'],
      where: { conversationId: { in: ids }, author: { in: [...UNREAD_AUTHORS[reader]] }, readAt: null },
      _count: { _all: true },
    }),
  ]);
  const lastOf = new Map(lasts.map((last) => [last.conversationId, last]));
  const unreadOf = new Map(unread.map((group) => [group.conversationId, group._count._all]));
  // Every conversation opens with a message or a notice, in the same transaction: none is ever without one.
  return rows.map((row) => ({ row, last: lastOf.get(row.id)!, unread: unreadOf.get(row.id) ?? 0 }));
}
