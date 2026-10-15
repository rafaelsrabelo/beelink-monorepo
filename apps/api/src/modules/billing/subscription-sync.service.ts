// Nest
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { StoreSubscriptionAnswer, SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { AsaasRefused, AsaasThrottled, AsaasUnreachable } from '../../shared/asaas/asaas-errors.js';
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { unavailable } from './billing-refusals.js';
import { billingError, CHECK_AGAIN_MS, CHECK_PUSH_MS, CHECKS_PER_PASS } from './billing.constants.js';
import { BillingService } from './billing.service.js';
import { PlatformAsaas, PlatformAsaasUnconfigured } from './platform-asaas.client.js';
import { factsOf, type PageFacts } from './subscription-facts.js';

/**
 * What came of reading Asaas for a page: written; nothing to read (charging off, no key, or no
 * subscription at Asaas named by the row); read and not written, because the row came to name another
 * subscription or a newer read was written first; or not written because a choice of a cycle is
 * talking to Asaas about the page — read again once it is done.
 */
export type SyncOutcome = 'WRITTEN' | 'NOTHING' | 'STALE' | 'BUSY';

/** What the row was before a read was written, for the log to tell what moved. */
interface Before {
  id: string;
  status: SubscriptionStatus;
}

/**
 * The one door a fact from Asaas about a page's subscription comes in by (BEELINK-221), whoever made
 * bee-link look — bee-link's own webhook, the routine, the panel asking now, a choice of a cycle that
 * found a payment. A webhook's event is only a reason to come here: its body is never applied, so a
 * token in the wrong hands cannot make a page paid, and an event late or twice changes nothing.
 *
 * It reads at Asaas the subscription the row names and its charges, with no lock held, and then writes
 * what they come to (`subscription-facts.ts`) in a short transaction that holds the row — and only
 * while the row still names that subscription, no choice holds the row's claim, and no read that began
 * later was written already. It never creates or removes anything at Asaas.
 */
@Injectable()
export class SubscriptionSync {
  private readonly logger = new Logger(SubscriptionSync.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: PlatformAsaas,
    private readonly stores: StoresService,
    private readonly billing: BillingService,
  ) {}

  /** Whether this deployment learns of payments at all: it charges, and has the key to ask with. Off, nothing here asks Asaas anything. */
  get running(): boolean {
    return env.BILLING_ENFORCED && this.asaas.configured;
  }

  /** The page's subscription read at Asaas and written. Throws what the client throws: a caller that must know hears that Asaas could not be asked. */
  async sync(storeId: string): Promise<SyncOutcome> {
    if (!this.running) return 'NOTHING';
    const named = await this.prisma.storeSubscription.findUnique({ where: { storeId }, select: { asaasSubscriptionId: true } });
    const asaasSubscriptionId = named?.asaasSubscriptionId ?? null;
    if (!asaasSubscriptionId) return 'NOTHING';

    const askedAt = new Date();
    const subscription = await this.asaas.subscription(asaasSubscriptionId);
    const charges = await this.asaas.subscriptionCharges(asaasSubscriptionId);

    const written = await this.prisma.$transaction(async (tx): Promise<{ outcome: SyncOutcome; before?: Before; facts?: PageFacts }> => {
      await tx.$queryRaw`SELECT 1 FROM "store_subscriptions" WHERE "storeId" = ${storeId}::uuid FOR UPDATE`;
      const row = await tx.storeSubscription.findUnique({ where: { storeId } });
      // What was read is of a subscription the page no longer has: a change of cycle ended meanwhile.
      if (!row || row.asaasSubscriptionId !== asaasSubscriptionId) return { outcome: 'STALE' };
      const now = new Date();
      // A choice is between removing one subscription and naming the next: nothing is written under it.
      if (row.asaasSubscriptionClaimedUntil && row.asaasSubscriptionClaimedUntil > now) return { outcome: 'BUSY' };
      if (row.asaasCheckedAt && row.asaasCheckedAt >= askedAt) return { outcome: 'STALE' };

      const facts = factsOf(row, subscription, charges, now);
      await tx.storeSubscription.update({
        where: { id: row.id },
        data: {
          status: facts.status,
          currentPeriodEndsAt: facts.currentPeriodEndsAt,
          paymentMethod: facts.paymentMethod,
          cardBrand: facts.cardBrand,
          cardLast4: facts.cardLast4,
          invoiceUrl: facts.invoiceUrl,
          nextCheckAt: facts.nextCheckAt,
          asaasCheckedAt: askedAt,
        },
      });
      return { outcome: 'WRITTEN', before: { id: row.id, status: row.status }, facts };
    });

    if (written.before && written.facts) this.tell(storeId, asaasSubscriptionId, written.before, written.facts);
    return written.outcome;
  }

  /**
   * The panel's "has it been paid?" (`POST /stores/:slug/subscription/check`): Asaas read now, and the
   * subscription answered as `GET` answers it. Asked at most once in `CHECK_AGAIN_MS` for a page —
   * inside that, the row read a moment ago is the answer. With nothing to ask, it is the `GET`.
   */
  async check(storeSlug: string, userId: string): Promise<StoreSubscriptionAnswer> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const row = await this.prisma.storeSubscription.findUnique({ where: { storeId }, select: { asaasCheckedAt: true } });
    const fresh = row?.asaasCheckedAt && Date.now() - row.asaasCheckedAt.getTime() < CHECK_AGAIN_MS;

    if (!fresh) {
      try {
        await this.sync(storeId);
      } catch (error) {
        throw this.said(error, storeId);
      }
    }
    return this.billing.answerOf(storeId);
  }

  /**
   * One pass of the routine: the pages whose turn came — waiting on a first payment, near the end of a
   * paid period, in arrears — the longest due first. Each one's next turn is pushed before Asaas is
   * asked, so one that fails waits its turn again and another process passes it by. A 429 ends the
   * pass: the client would turn every other page away unasked. Answers how many were asked about.
   */
  async checkDue(now: Date): Promise<number> {
    if (!this.running) return 0;
    const due = await this.prisma.storeSubscription.findMany({
      where: { nextCheckAt: { lte: now }, asaasSubscriptionId: { not: null }, status: { not: 'EXEMPT' } },
      orderBy: { nextCheckAt: 'asc' },
      take: CHECKS_PER_PASS,
      select: { id: true, storeId: true, nextCheckAt: true },
    });

    let asked = 0;
    for (const row of due) {
      const { count } = await this.prisma.storeSubscription.updateMany({ where: { id: row.id, nextCheckAt: row.nextCheckAt }, data: { nextCheckAt: new Date(now.getTime() + CHECK_PUSH_MS) } });
      if (count === 0) continue;
      asked += 1;
      try {
        await this.sync(row.storeId);
      } catch (error) {
        this.logger.warn({ storeId: row.storeId, reason: reasonOf(error) }, "Could not read a page's subscription at bee-link's own Asaas account");
        if (error instanceof AsaasThrottled) break;
      }
    }
    return asked;
  }

  /** What moved, said once: the ids of the page and of Asaas's subscription, and nothing of who pays. */
  private tell(storeId: string, asaasSubscriptionId: string, before: Before, facts: PageFacts): void {
    if (before.status === facts.status) return;
    const said = { storeId, subscriptionId: before.id, asaasSubscriptionId, from: before.status, to: facts.status };
    if (facts.status === 'CANCELED' && facts.gone) {
      // The one sign of a customer removed at Asaas's own panel, which takes every page's subscription of the account with it.
      this.logger.warn(said, "A page's subscription is no more at bee-link's own Asaas account: the page is cancelled, and what it paid for runs to its end");
    } else if (facts.status === 'CANCELED' && facts.givenBackStanding) {
      this.logger.warn(said, "A page's charge was given back while its subscription still stands at Asaas: it charges again unless it is removed there");
    } else {
      this.logger.log(said, "A page's standing moved, as read at bee-link's own Asaas account");
    }
  }

  /** How a read that could not be made is told to the panel: a stable code, and Asaas's words in the log alone. */
  private said(error: unknown, storeId: string): unknown {
    if (error instanceof PlatformAsaasUnconfigured) return unavailable();
    if (error instanceof AsaasRefused && error.status === 401) {
      this.logger.error({ status: error.status, code: error.code }, "Asaas refused the key of bee-link's own account");
      return unavailable("Asaas refused the key of bee-link's own account");
    }
    if (error instanceof AsaasRefused || error instanceof AsaasUnreachable) {
      this.logger.warn({ storeId, reason: reasonOf(error) }, "Asaas did not answer about a page's subscription");
      return new ServiceUnavailableException(billingError('BILLING_UNREACHABLE', 'Asaas did not answer: the subscription is as it was last read, and asking again asks again'));
    }
    return error;
  }
}

/** A failure as the log and the events table keep it: Asaas's status and code, never its words — they could repeat what was sent. */
export function reasonOf(error: unknown): string {
  if (error instanceof AsaasRefused) return `Asaas refused (${error.status}${error.code ? `, ${error.code}` : ''})`;
  return (error instanceof Error ? error.message : 'Unknown failure').slice(0, 500);
}
