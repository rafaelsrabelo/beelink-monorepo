// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { PanelCounts } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { shopUnreadOf } from '../conversations/shop-unread.js';
import { countOpenOrders } from '../orders/open-orders.js';
import { unseenReviewsOf } from '../reviews/reviews-unseen.js';
import { StoresService } from '../stores/stores.service.js';

/**
 * What the panel's menu counts beside its items (BEELINK-309), in one answer: who owns the shop is
 * settled once, and each number is its own area's count — the same code that area's endpoint runs,
 * never a second rule. Counts only: nothing is loaded to be counted.
 */
@Injectable()
export class PanelCountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async read(storeSlug: string, userId: string): Promise<PanelCounts> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const [openOrders, unread, unseenReviews] = await Promise.all([
      countOpenOrders(this.prisma, storeId),
      shopUnreadOf(this.prisma, storeId),
      unseenReviewsOf(this.prisma, storeId),
    ]);
    return { openOrders, unreadConversations: unread.conversations, unreadMessages: unread.messages, unseenReviews } satisfies PanelCounts;
  }
}
