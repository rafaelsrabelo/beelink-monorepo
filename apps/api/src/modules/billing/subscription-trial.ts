// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { trialEndOf } from './billing-dates.js';

/**
 * A new page's subscription (BEELINK-219): in trial, from the instant the page was created.
 *
 * It takes the caller's transaction and has no other way in: the page and its subscription are
 * written together or not at all, so no page is ever left without knowing when its trial ends.
 * Written whether or not this deployment charges — switching charging on must not find pages that
 * were never counted.
 */
export async function openTrial(tx: Prisma.TransactionClient, storeId: string, startedAt: Date): Promise<void> {
  await tx.storeSubscription.create({
    data: { storeId, status: 'TRIALING', trialStartedAt: startedAt, trialEndsAt: trialEndOf(startedAt) },
  });
}
