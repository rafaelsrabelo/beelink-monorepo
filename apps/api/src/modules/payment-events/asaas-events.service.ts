// Node
import { createHash } from 'node:crypto';

// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AsaasStoreUnavailable } from '../integrations/asaas/asaas-charges.service.js';
import { AsaasThrottled } from '../integrations/asaas/asaas.client.js';
import { AsaasWebhookKeeper } from '../integrations/asaas/asaas-webhook-keeper.js';
import { OrderPayments } from '../payments/order-payments.service.js';
import { PaymentSync } from '../payments/payment-sync.service.js';
import { ASAAS_EVENT_ATTEMPTS_MAX, ASAAS_EVENT_BATCH, ASAAS_EVENT_KEEP_MS, ASAAS_EVENT_LEASE_MS, ASAAS_EVENT_PARKED_MS, ASAAS_EVENT_WAIT_MAX_MS, KEY_EVENTS, retryAtOf } from './payment-events.constants.js';

/** What came of a delivery: written to be read, written before, or about nothing of bee-link's. */
export type AsaasEventReceipt = 'RECORDED' | 'DUPLICATE' | 'IGNORED';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const text = (value: unknown, max: number): string | null => (typeof value === 'string' && value.trim() !== '' && value.length <= max ? value.trim() : null);
const isDuplicate = (error: unknown) => error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
const wallTimeOf = (date: Date) => date.toISOString().replace('Z', '');

/**
 * The events of a shop's Asaas webhook (BEELINK-206): written once, answered, and only then acted on.
 *
 * `receive` is all a delivery waits for: the event's id and name are written under the shop — the
 * unique index is what makes a second delivery a no-op — with the order its charge belongs to, and
 * nothing else of its body. A charge the shop made outside bee-link is written already done.
 *
 * Acting on one is hearing Asaas (`PaymentSync`): the event says an order's charge moved, the shop's
 * account says where to. A row is claimed before it is worked — `FOR UPDATE SKIP LOCKED` and a
 * lease — so two processes never work it at once; one that fails waits a minute, two, four…, and
 * after the last try it is given up, which loses no payment: the reconciliation asks about every
 * waiting charge anyway.
 */
@Injectable()
export class AsaasEvents {
  private readonly logger = new Logger(AsaasEvents.name);
  /** One sweep at a time in this process; a call meanwhile asks for one more once it ends. */
  private sweeping: Promise<void> | null = null;
  private again = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly heard: PaymentSync,
    private readonly payments: OrderPayments,
    private readonly keeper: AsaasWebhookKeeper,
  ) {}

  async receive(storeId: string, body: unknown, raw: Buffer): Promise<AsaasEventReceipt> {
    const event = (typeof body === 'object' && body !== null ? body : {}) as { id?: unknown; event?: unknown; payment?: unknown };
    // An event with no id is still delivered at least once: its bytes tell a second delivery from a new event.
    const eventId = text(event.id, 160) ?? `sha256:${createHash('sha256').update(raw).digest('hex')}`;
    const name = text(event.event, 80) ?? 'UNKNOWN';
    const orderId = await this.orderOf(storeId, event.payment);
    const ours = orderId !== null || KEY_EVENTS.has(name);

    try {
      await this.prisma.asaasEvent.create({ data: { storeId, eventId, event: name, orderId, ...(ours ? {} : { outcome: 'IGNORED', processedAt: new Date() }) } });
    } catch (error) {
      if (!isDuplicate(error)) throw error;
      // The first delivery may still be waiting on a retry: a second one is as good a moment as any.
      this.dispatch();
      return 'DUPLICATE';
    }
    if (!ours) return 'IGNORED';
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
          full = (await this.sweep()).claimed === ASAAS_EVENT_BATCH;
        } while (this.again || full);
      } catch (error) {
        this.logger.error({ err: error }, 'Could not work the Asaas events');
      } finally {
        this.sweeping = null;
      }
    })();
  }

  /** Resolves once nothing dispatched is still being worked: what a suite waits on before it looks. */
  async settled(): Promise<void> {
    while (this.sweeping) await this.sweeping;
  }

  /** Claims what waits and is due, works each, and answers how many were done. */
  async flush(): Promise<number> {
    return (await this.sweep()).done;
  }

  private async sweep(): Promise<{ claimed: number; done: number }> {
    const now = new Date();
    const claimed = await this.prisma.$queryRaw<{ id: string; attempts: number }[]>(Prisma.sql`
      UPDATE "asaas_events"
      SET "attempts" = "attempts" + 1, "nextAttemptAt" = ${wallTimeOf(new Date(now.getTime() + ASAAS_EVENT_LEASE_MS))}::timestamp
      WHERE "id" IN (
        SELECT "id" FROM "asaas_events"
        WHERE "processedAt" IS NULL AND "nextAttemptAt" <= ${wallTimeOf(now)}::timestamp
        ORDER BY "createdAt"
        LIMIT ${ASAAS_EVENT_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "attempts"`);

    let done = 0;
    for (const { id, attempts } of claimed) {
      const row = await this.prisma.asaasEvent.findUnique({ where: { id } });
      if (!row) continue;
      try {
        await this.work(row);
        await this.prisma.asaasEvent.update({ where: { id }, data: { processedAt: new Date(), outcome: 'APPLIED', lastError: null } });
        done += 1;
      } catch (error) {
        const reason = (error instanceof Error ? error.message : 'Unknown failure').slice(0, 500);
        // A shop whose key does not open is not Asaas failing: the event waits for the reconnection,
        // an hour at a time and without spending its tries — for as long as Asaas itself would hold it.
        if (error instanceof AsaasStoreUnavailable && Date.now() - row.createdAt.getTime() < ASAAS_EVENT_WAIT_MAX_MS) {
          await this.prisma.asaasEvent.update({ where: { id }, data: { attempts: { decrement: 1 }, nextAttemptAt: new Date(Date.now() + ASAAS_EVENT_PARKED_MS), lastError: reason } });
          continue;
        }
        const last = attempts >= ASAAS_EVENT_ATTEMPTS_MAX || error instanceof AsaasStoreUnavailable;
        this.logger[last ? 'error' : 'warn']({ storeId: row.storeId, event: row.event, eventId: row.eventId, attempts, reason }, last ? 'Gave up on an Asaas event' : 'Could not work an Asaas event: it is tried again');
        // Asaas's own wait, when it named one, is not asked ahead of.
        const waited = error instanceof AsaasThrottled && error.retryAt && error.retryAt > retryAtOf(attempts) ? error.retryAt : retryAtOf(attempts);
        await this.prisma.asaasEvent.update({ where: { id }, data: last ? { processedAt: new Date(), outcome: 'GIVEN_UP', lastError: reason } : { nextAttemptAt: waited, lastError: reason } });
      }
    }
    return { claimed: claimed.length, done };
  }

  /** Events done a month ago are of no use: Asaas holds an undelivered one for fourteen days at most. Answers how many went. */
  async prune(now: Date): Promise<number> {
    const { count } = await this.prisma.asaasEvent.deleteMany({ where: { processedAt: { lt: new Date(now.getTime() - ASAAS_EVENT_KEEP_MS) } } });
    return count;
  }

  private async work(row: { storeId: string; event: string; orderId: string | null }): Promise<void> {
    // The probe does nothing for a connection already marked: the news it brought is known.
    if (KEY_EVENTS.has(row.event)) return this.keeper.probe(row.storeId);
    if (!row.orderId) return;
    const heard = await this.heard.sync(row.storeId, row.orderId);
    if (heard.leftovers) await this.payments.release(row.storeId, row.orderId);
  }

  /**
   * The order of this shop the event's charge belongs to: by the charge or its plan when bee-link
   * keeps a row of it, else by `externalReference`, which bee-link sets to the order's id — a charge
   * made a moment ago may have no row yet. Null for a charge the shop made by itself.
   */
  private async orderOf(storeId: string, payment: unknown): Promise<string | null> {
    if (typeof payment !== 'object' || payment === null) return null;
    const { id, installment, externalReference } = payment as { id?: unknown; installment?: unknown; externalReference?: unknown };
    const chargeId = text(id, 64);
    const installmentId = text(installment, 64);
    const known = [...(chargeId ? [{ providerId: chargeId }] : []), ...(installmentId ? [{ providerInstallmentId: installmentId }] : [])];
    if (known.length > 0) {
      const row = await this.prisma.orderPayment.findFirst({ where: { storeId, OR: known }, select: { orderId: true } });
      if (row) return row.orderId;
    }
    const reference = text(externalReference, 64);
    if (!reference || !UUID.test(reference)) return null;
    const order = await this.prisma.order.findFirst({ where: { id: reference, storeId, paymentChannel: 'ONLINE' }, select: { id: true } });
    return order?.id ?? null;
  }
}
