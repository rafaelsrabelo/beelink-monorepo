// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { PlanCatalog, StoreSubscriptionAnswer } from '@harness-monorepo/contracts';

// App
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { TRIAL_DAYS } from './billing.constants.js';
import { toPlan, toStoreSubscription } from './billing.mapper.js';

/**
 * What a page owes bee-link, as it is read (BEELINK-219): the plans on sale, and one page's
 * subscription. Nothing here writes — a page's subscription is written with the page
 * (`subscription-trial.ts`), by a choice of its cycle (`StoreSubscriptions`) and by what Asaas says of
 * it (`SubscriptionSync`) — and nothing here talks to Asaas.
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  /** The plans on sale, cheapest by the month first; the slug settles a tie, so the order never depends on the database's mood. */
  async plans(): Promise<PlanCatalog> {
    const rows = await this.prisma.plan.findMany({ where: { active: true }, orderBy: [{ monthlyPriceCents: 'asc' }, { slug: 'asc' }] });
    return { trialDays: TRIAL_DAYS, plans: rows.map(toPlan) };
  }

  /**
   * A page's subscription, for its owner. A page from before subscriptions existed has none, and
   * that is an answer, not an error.
   */
  async subscription(storeSlug: string, userId: string): Promise<StoreSubscriptionAnswer> {
    return this.answerOf(await this.stores.ownedStoreId(storeSlug, userId));
  }

  /** The same answer for a page whose owner was already checked: what the panel's own "has it been paid?" answers once Asaas was read (BEELINK-221). */
  async answerOf(storeId: string): Promise<StoreSubscriptionAnswer> {
    const row = await this.prisma.storeSubscription.findUnique({
      where: { storeId },
      include: { plan: { select: { id: true, slug: true, name: true } } },
    });

    return { billingEnforced: env.BILLING_ENFORCED, subscription: row ? toStoreSubscription(row, new Date()) : null };
  }
}
