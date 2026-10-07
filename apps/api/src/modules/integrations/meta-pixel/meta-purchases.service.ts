// Nest
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';

// App
import { Prisma } from '../../../generated/prisma/client.js';
import { env } from '../../../shared/config/env.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { MetaConversionsClient, MetaEventRefused, MetaPixelNotFound, MetaTokenRejected } from './meta-conversions.client.js';
import { META_PIXEL_PROVIDER, metaVaultKey, noteRefusal, openToken } from './meta-pixel-token.js';
import { purchaseCountsWhen, purchaseEventOf } from './meta-purchase-event.js';
import { META_PURCHASE_BATCH, META_PURCHASE_ERROR_MAX_LENGTH, META_PURCHASE_LEASE_MS, META_PURCHASE_PARKED_MS, META_PURCHASE_SWEEP_MS, purchaseRetryAtOf, tooOldToSend } from './meta-purchase-outbox.js';

/** A timestamp as Prisma writes these columns: UTC wall time, no zone. */
const wallTimeOf = (date: Date) => date.toISOString().replace('Z', '');

/** A charge whose money the shop holds, as the browser reads "paid": confirmed or received, not given back. */
const PAID: ReadonlySet<string> = new Set(['CONFIRMED', 'RECEIVED']);

/** What a sweep did with one purchase. */
type Worked = { done: 'SENT' | 'SKIPPED' | 'GIVEN_UP'; why: string | null } | { retryAt: Date; why: string; keepsTry: boolean };

const closed = (done: 'SKIPPED' | 'GIVEN_UP', why: string): Worked => ({ done, why });

/**
 * Pays the purchases owed to Meta (`order_meta_purchases`, BEELINK-274) apart from whatever made
 * them owed: every minute, never inside the request that placed an order or heard of its payment.
 *
 * A row is claimed before it is worked — `FOR UPDATE SKIP LOCKED` and a lease — so two sweeps, or
 * two processes, never send it twice; and each is one request to Meta, which refuses a whole request
 * for one event it will not take. What the event says is read when it goes: the buyer's consent
 * (gone with a deleted account: nothing is sent), the order as it stands, the shop's pixel and token.
 *
 * A failure that decides nothing waits 1, 2, 4, 8… minutes, six hours at most. Meta refusing the
 * event closes it, with Meta's words. Meta refusing the token, or the pixel under it, marks the
 * shop: its purchases wait, an hour at a time and without spending a try, until another token is
 * saved. Past seven days an event is given up whatever it waited for.
 */
@Injectable()
export class MetaPurchases implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetaPurchases.name);
  private timer: NodeJS.Timeout | null = null;
  private sweeping = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly meta: MetaConversionsClient,
  ) {}

  onModuleInit(): void {
    // A suite sweeps when it means to, at the instant it names.
    if (env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), META_PURCHASE_SWEEP_MS);
    // A sweep in waiting is no reason for the process to stay up.
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    if (this.sweeping) return;
    this.sweeping = true;
    try {
      // A full batch means more may wait behind it: they are not left for the next minute.
      while ((await this.flush()).claimed === META_PURCHASE_BATCH);
    } catch (error) {
      this.logger.error({ err: error }, 'Could not send the purchases owed to Meta');
    } finally {
      this.sweeping = false;
    }
  }

  /** Claims what is owed and due, works each, and answers how many were claimed and how many Meta took. */
  async flush(now = new Date()): Promise<{ claimed: number; sent: number }> {
    const claimed = await this.prisma.$queryRaw<{ id: string; attempts: number }[]>(Prisma.sql`
      UPDATE "order_meta_purchases"
      SET "attempts" = "attempts" + 1, "nextAttemptAt" = ${wallTimeOf(new Date(now.getTime() + META_PURCHASE_LEASE_MS))}::timestamp
      WHERE "id" IN (
        SELECT "id" FROM "order_meta_purchases"
        WHERE "processedAt" IS NULL AND "nextAttemptAt" <= ${wallTimeOf(now)}::timestamp
        ORDER BY "createdAt"
        LIMIT ${META_PURCHASE_BATCH}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "attempts"`);
    let sent = 0;
    for (const { id, attempts } of claimed) {
      const worked = await this.work(id, attempts, now).catch((error: unknown): Worked => {
        this.logger.error({ err: error, purchaseId: id }, 'Could not work a purchase owed to Meta: it is tried again');
        return { retryAt: purchaseRetryAtOf(attempts, now.getTime()), why: 'bee-link failed before Meta was asked', keepsTry: false };
      });
      const why = worked.why?.slice(0, META_PURCHASE_ERROR_MAX_LENGTH) ?? null;
      if ('done' in worked) {
        await this.prisma.orderMetaPurchase.update({ where: { id }, data: { processedAt: new Date(), outcome: worked.done, lastError: why } });
        if (worked.done === 'SENT') sent += 1;
        if (worked.done === 'GIVEN_UP') this.logger.warn({ purchaseId: id, reason: why }, 'Gave up on a purchase owed to Meta');
      } else {
        await this.prisma.orderMetaPurchase.update({ where: { id }, data: { nextAttemptAt: worked.retryAt, lastError: why, ...(worked.keepsTry ? { attempts: { decrement: 1 } } : {}) } });
      }
    }
    return { claimed: claimed.length, sent };
  }

  private async work(id: string, attempts: number, now: Date): Promise<Worked> {
    const row = await this.prisma.orderMetaPurchase.findUnique({
      where: { id },
      select: {
        storeId: true,
        countedAt: true,
        order: {
          select: {
            id: true,
            status: true,
            paymentChannel: true,
            totalCents: true,
            deliveryFeeCents: true,
            items: { orderBy: { position: 'asc' }, select: { productId: true, quantity: true, lineTotalCents: true, discountCents: true } },
            payments: { select: { status: true } },
            marketingConsent: true,
            customer: { select: { phone: true, user: { select: { email: true } } } },
            store: { select: { slug: true, integrations: { where: { provider: META_PIXEL_PROVIDER }, select: { pixelId: true, secretSealed: true, secretRefusal: true } } } },
          },
        },
      },
    });
    if (!row) return closed('SKIPPED', 'the order is gone');
    const { order } = row;
    if (tooOldToSend(row.countedAt, now)) return closed('GIVEN_UP', 'older than the seven days Meta takes an event within');
    // No row of consent is no consent: the buyer deleted their account since, and what they agreed to went with it.
    if (!order.marketingConsent) return closed('SKIPPED', "the buyer's consent is gone");
    if (order.status === 'CANCELLED') return closed('SKIPPED', 'the order was cancelled');
    if (purchaseCountsWhen(order) === 'PAID' && !order.payments.some((payment) => PAID.has(payment.status))) return closed('SKIPPED', 'the payment is no longer held');

    const pixel = order.store.integrations[0];
    if (!pixel?.pixelId) return closed('SKIPPED', 'the shop has no pixel');
    if (pixel.secretSealed === '') return closed('SKIPPED', 'the shop has no Conversions API token');
    if (pixel.secretRefusal) return { retryAt: new Date(now.getTime() + META_PURCHASE_PARKED_MS), why: `waiting for another token: Meta refused this one (${pixel.secretRefusal})`, keepsTry: true };
    const key = metaVaultKey();
    const accessToken = key ? openToken(pixel.secretSealed, key, row.storeId) : null;
    if (!accessToken) return { retryAt: purchaseRetryAtOf(attempts, now.getTime()), why: "the shop's token could not be opened in this deployment", keepsTry: false };

    const event = purchaseEventOf({
      order,
      countedAt: row.countedAt,
      buyer: { email: order.customer.user?.email ?? null, phone: order.customer.phone },
      consent: order.marketingConsent,
      shopUrl: `${env.WEB_URL}/${order.store.slug}`,
    });
    // Meta takes no event that names nobody; an account with no e-mail left is one deleted since.
    if (!event.user_data.em && !event.user_data.ph) return closed('SKIPPED', 'nothing identifies the buyer');
    try {
      await this.meta.send(pixel.pixelId, accessToken, event);
      return { done: 'SENT', why: null };
    } catch (error) {
      const words = error instanceof Error ? error.message : 'unknown failure';
      if (error instanceof MetaTokenRejected || error instanceof MetaPixelNotFound) {
        const refusal = error instanceof MetaTokenRejected ? 'TOKEN_REJECTED' : 'PIXEL_NOT_FOUND';
        await noteRefusal(this.prisma, row.storeId, pixel.secretSealed, refusal, now);
        this.logger.warn({ storeId: row.storeId, refusal }, "Meta refused a shop's Conversions API token: its purchases wait for another");
        return { retryAt: new Date(now.getTime() + META_PURCHASE_PARKED_MS), why: words, keepsTry: true };
      }
      if (error instanceof MetaEventRefused) return closed('GIVEN_UP', words);
      // `MetaUnreachable`, and anything else that decided nothing.
      return { retryAt: purchaseRetryAtOf(attempts, now.getTime()), why: words, keepsTry: false };
    }
  }
}
