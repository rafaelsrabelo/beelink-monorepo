// Node
import { createHash } from 'node:crypto';

// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { AsaasThrottled } from '../../shared/asaas/asaas-errors.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { BILLING_EVENT_ATTEMPTS_MAX, BILLING_EVENT_BATCH, BILLING_EVENT_KEEP_MS, BILLING_EVENT_LEASE_MS, billingEventRetryAtOf } from './billing.constants.js';
import { reasonOf, SubscriptionSync } from './subscription-sync.service.js';

/** What came of a delivery: written to be worked, written before, or about nothing of bee-link's. */
export type BillingEventReceipt = 'RECORDED' | 'DUPLICATE' | 'IGNORED';

/** bee-link's reference for a page's subscription, which Asaas copies to every charge of it: the row's own id, lower case. */
const REFERENCE = /^beelink-subscription-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

const text = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() !== '' && value.length <= max ? value.trim() : null);
const objectOf = (value: unknown): Record<string, unknown> | null => (typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null);
const isDuplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
const wallTimeOf = (date: Date) => date.toISOString().replace('Z', '');

/** A read the page's row could not take while a choice of a cycle holds it: the event is worked again later. */
class PageBusy extends Error {}

/**
 * The events of bee-link's own Asaas webhook (BEELINK-221): written once, answered, and only then
 * acted on — the shops' `AsaasEvents` over again, for the account a page's plan is charged at.
 *
 * `receive` is all a delivery waits for: the event's id and name are written — the unique id is what
 * makes a second delivery a no-op — with the page's subscription it is about, and nothing else of its
 * body. The account is shared with whatever else bee-link's Asaas holds: an event about no page of
 * bee-link's is written done.
 *
 * Acting on one is reading the page at Asaas (`SubscriptionSync`). A row is claimed before it is
 * worked — `FOR UPDATE SKIP LOCKED` and a lease — so two processes never work it at once; one that
 * fails waits a minute, two, four…, and after the last try it is given up, which loses no payment: the
 * routine reads the page anyway. Asaas asking to wait ends the sweep, and the events not yet worked
 * wait for the time it named without spending a try. Several events of one page in a sweep are one
 * read: every one of them was written before that read began.
 */
@Injectable()
export class BillingEvents {
  private readonly logger = new Logger(BillingEvents.name);
  /** One sweep at a time in this process; a call meanwhile asks for one more once it ends. */
  private sweeping: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: SubscriptionSync,
  ) {}

  /** A delivery that carried the token. Where nothing is charged, or Asaas cannot be asked, it is answered and nothing is written. */
  async receive(body: unknown, raw: Buffer): Promise<BillingEventReceipt> {
    if (!this.payments.running) return 'IGNORED';
    const event = objectOf(body) ?? {};
    // An event with no id is still delivered at least once: its bytes tell a second delivery from a new event.
    const eventId = text(event.id, 160) ?? `sha256:${createHash('sha256').update(raw).digest('hex')}`;
    const name = text(event.event, 80) ?? 'UNKNOWN';
    const subscriptionId = await this.pageOf(event);

    try {
      await this.prisma.billingEvent.create({ data: { eventId, event: name, subscriptionId, ...(subscriptionId ? {} : { outcome: 'IGNORED', processedAt: new Date() }) } });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      // The first delivery may still be waiting on a retry: a second one is as good a moment as any.
      this.dispatch();
      return 'DUPLICATE';
    }
    if (!subscriptionId) return 'IGNORED';
    this.dispatch();
    return 'RECORDED';
  }

  /** Works what waits without anyone waiting on it: the delivery has already been answered. */
  dispatch(): void {
    if (this.sweeping) {
      this.again = true;
      return;
    }
    this.sweeping = (async () => {
      try {
        let full = false;
        do {
          this.again = false;
          // A full batch means more may wait behind it: they are not left for the next minute.
          full = (await this.sweep()).claimed === BILLING_EVENT_BATCH;
        } while (this.again || full);
      } catch (error) {
        this.logger.error({ err: error }, "Could not work the events of bee-link's own Asaas account");
      } finally {
        this.sweeping = null;
      }
    })();
  }

  /** Resolves once nothing dispatched is still being worked: what the routine and a suite wait on. */
  async settled(): Promise<void> {
    while (this.sweeping) await this.sweeping;
  }

  /** Events done a month ago are of no use: Asaas holds an undelivered one for fourteen days at most. Answers how many went. */
  async prune(now: Date): Promise<number> {
    const { count } = await this.prisma.billingEvent.deleteMany({ where: { processedAt: { lt: new Date(now.getTime() - BILLING_EVENT_KEEP_MS) } } });
    return count;
  }

  private async sweep(): Promise<{ claimed: number }> {
    const now = new Date();
    const claimed = await this.prisma.$queryRaw<{ id: string; attempts: number }[]>(Prisma.sql`
      UPDATE "billing_events"
      SET "attempts" = "attempts" + 1, "nextAttemptAt" = ${wallTimeOf(new Date(now.getTime() + BILLING_EVENT_LEASE_MS))}::timestamp
      WHERE "id" IN (
        SELECT "id" FROM "billing_events"
        WHERE "processedAt" IS NULL AND "nextAttemptAt" <= ${wallTimeOf(now)}::timestamp
        ORDER BY "createdAt"
        LIMIT ${BILLING_EVENT_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "attempts"`);

    const read = new Set<string>();
    let waitUntil: Date | null = null;
    for (const { id, attempts } of claimed) {
      // Asaas asked to wait: what is left of the batch waits too, and the try it was claimed with is given back.
      if (waitUntil) {
        await this.prisma.billingEvent.update({ where: { id }, data: { attempts: { decrement: 1 }, nextAttemptAt: waitUntil } });
        continue;
      }
      const row = await this.prisma.billingEvent.findUnique({ where: { id } });
      if (!row) continue;
      try {
        await this.work(row.subscriptionId, read);
        await this.prisma.billingEvent.update({ where: { id }, data: { processedAt: new Date(), outcome: 'APPLIED', lastError: null } });
      } catch (error) {
        const reason = reasonOf(error);
        const last = attempts >= BILLING_EVENT_ATTEMPTS_MAX;
        this.logger[last ? 'error' : 'warn'](
          { event: row.event, eventId: row.eventId, subscriptionId: row.subscriptionId, attempts, reason },
          last ? "Gave up on an event of bee-link's own Asaas account" : "Could not work an event of bee-link's own Asaas account: it is tried again",
        );
        const retryAt = billingEventRetryAtOf(attempts);
        // Asaas's own wait, when it named one, is not asked ahead of.
        if (error instanceof AsaasThrottled) waitUntil = error.retryAt && error.retryAt > retryAt ? error.retryAt : retryAt;
        await this.prisma.billingEvent.update({ where: { id }, data: last ? { processedAt: new Date(), outcome: 'GIVEN_UP', lastError: reason } : { nextAttemptAt: waitUntil ?? retryAt, lastError: reason } });
      }
    }
    return { claimed: claimed.length };
  }

  /** The page the event is about, read at Asaas — once a sweep. A page deleted since has nothing left to read. */
  private async work(subscriptionId: string | null, read: Set<string>): Promise<void> {
    if (!subscriptionId) return;
    const page = await this.prisma.storeSubscription.findUnique({ where: { id: subscriptionId }, select: { storeId: true } });
    if (!page || read.has(page.storeId)) return;
    if ((await this.payments.sync(page.storeId)) === 'BUSY') throw new PageBusy("A choice of a cycle is talking to Asaas about the page: it is read once that is over");
    read.add(page.storeId);
  }

  /**
   * The page's subscription row an event is about: by bee-link's reference, which a charge's event
   * carries as the charge's and a subscription's as its own — exactly, as bee-link wrote it; else by
   * Asaas's id of the subscription, when a row names it. Null for whatever else the account holds, and
   * for a reference to a row this deployment does not have.
   */
  private async pageOf(event: Record<string, unknown>): Promise<string | null> {
    const payment = objectOf(event.payment);
    const subject = payment ?? objectOf(event.subscription);
    if (!subject) return null;

    const reference = text(subject.externalReference, 160);
    const named = reference ? (REFERENCE.exec(reference)?.[1] ?? null) : null;
    if (named) return (await this.prisma.storeSubscription.findUnique({ where: { id: named }, select: { id: true } }))?.id ?? null;

    const asaasSubscriptionId = text(payment ? subject.subscription : subject.id, 64);
    if (!asaasSubscriptionId) return null;
    return (await this.prisma.storeSubscription.findUnique({ where: { asaasSubscriptionId }, select: { id: true } }))?.id ?? null;
  }
}
