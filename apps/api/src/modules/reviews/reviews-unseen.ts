// Types
import type { PrismaService } from '../../shared/prisma/prisma.service.js';

/**
 * How many reviews were written since the shop's owner last opened their list, hidden or not. By the
 * shop's id, with no check of who asks: the caller has already settled that the shop is theirs.
 */
export async function unseenReviewsOf(prisma: PrismaService, storeId: string): Promise<number> {
  const store = await prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: { reviewsSeenAt: true } });
  return prisma.productReview.count({ where: { storeId, ...(store.reviewsSeenAt ? { createdAt: { gt: store.reviewsSeenAt } } : {}) } });
}
