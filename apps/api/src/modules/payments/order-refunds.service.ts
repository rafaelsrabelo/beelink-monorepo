// Nest
import { BadGatewayException, ConflictException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { OrderErrorCode, OrderPaymentErrorCode, OrderRefundErrorCode } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { AsaasCharges, AsaasStoreUnavailable } from '../integrations/asaas/asaas-charges.service.js';
import { AsaasOutcomeUnknown, AsaasRefused, type AsaasRefundsRead, type AsaasRefundTarget } from '../integrations/asaas/asaas.client.js';
import { PaymentNews } from './payment-news.js';
import { claimRefund, dropRefund, holdRefund, reconcileRefunds, refundableOf, refuseRefund, settleRefundMoney, takeRefund, unrefundedOf, type RefundedCharge } from './payment-refunds.js';
import { holdsMoney } from './payment-status.js';
import { PaymentSync } from './payment-sync.service.js';
import { CLAIM_MS, UNKNOWN_OUTCOME_HOLD_MS } from './payments.constants.js';
import { refundableWord, refundRefusalOf } from './refund-refusal.js';
import { NO_REFUNDS, refundTotalsOf, type RefundTotals } from './refund-totals.js';

type RefundCode = OrderRefundErrorCode | Extract<OrderPaymentErrorCode, 'PAYMENT_UNAVAILABLE'> | Extract<OrderErrorCode, 'ORDER_NOT_FOUND'>;

/** A refund to be asked of Asaas. */
export interface RefundAsked {
  amountCents: number;
  reason: string;
  /** What whoever asks saw as left to refund. */
  refundableCents: number;
  /** A stray payment's id, instead of the order's own payment. */
  strayId?: string;
  origin: 'PANEL' | 'CANCELLATION';
  userId: string | null;
}

/** The first step's answer: the refund to ask Asaas for, or an earlier one nobody knows the end of. */
type Claimed = { refundId: string; charge: RefundedCharge; target: AsaasRefundTarget; plain: boolean } | { unknown: { charge: RefundedCharge; target: AsaasRefundTarget } };

const refundError = (errorCode: RefundCode, message: string, details?: object) => ({ errorCode, message, ...(details ? { details } : {}) });
const conflict = (code: RefundCode, message: string, details?: object) => new ConflictException(refundError(code, message, details));
const unavailable = () => new ServiceUnavailableException(refundError('PAYMENT_UNAVAILABLE', "The shop's Asaas account cannot be reached right now"));

/** A read's refunds added up: a charge Asaas says is refunded gave all of it back, whatever its list holds. */
const totalsOf = (read: AsaasRefundsRead, charge: RefundedCharge): RefundTotals => (read.whole ? { ...NO_REFUNDS, doneCents: charge.amountCents } : refundTotalsOf(read.refunds));

/**
 * Money given back from an order (BEELINK-208): its own payment's, whole or in part, or a stray
 * one's. The one talk with Asaas about a refund, and never two refunds for one asking.
 *
 * A refund is claimed first — the charge's one `REQUESTED` row, written under the shop's row lock
 * and committed before Asaas is called, so the lock is never held while it answers. A second click,
 * a second tab or a retry meets that row and asks Asaas for nothing; and each asking says what it
 * saw as left to refund, so one sent from a screen that has since gone stale is refused rather than
 * made on top of the first. Asaas is always told the amount.
 *
 * No answer is not a no: the charge is read before anything else is asked, and the refund counted
 * as made when it is there. When it is not there yet, the row is held a while — nobody asks again —
 * and the next asking begins by reading the charge once more.
 */
@Injectable()
export class OrderRefunds {
  private readonly logger = new Logger(OrderRefunds.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly charges: AsaasCharges,
    private readonly heard: PaymentSync,
    private readonly news: PaymentNews,
  ) {}

  /** A refund asked of Asaas and taken by it. Throws, each with its own code, what could not be asked and what Asaas refused. */
  async refund(storeId: string, orderId: string, asked: RefundAsked): Promise<void> {
    let claimed = await this.claim(storeId, orderId, asked);
    if ('unknown' in claimed) {
      // An earlier asking nobody knows the end of: the charge says, before anything else is asked.
      await this.settleUnknown(storeId, orderId, claimed.unknown);
      claimed = await this.claim(storeId, orderId, asked);
      if ('unknown' in claimed) throw conflict('REFUND_IN_PROGRESS', 'Another refund of this payment is being asked of Asaas');
    }
    const { refundId, charge } = claimed;

    let read: AsaasRefundsRead;
    try {
      // A stray payment keeps no row to say whether it is a plan: Asaas is asked, and a plan is refunded as one.
      if (!claimed.plain) claimed.target.installmentId = (await this.charges.read(storeId, charge.providerId))?.installmentId ?? null;
      read = await this.charges.refund(storeId, claimed.target, asked.amountCents, asked.reason);
    } catch (error) {
      const failure = await this.failed(error, storeId, orderId, claimed);
      if (failure) throw failure;
      return;
    }

    await this.underShopLock(storeId, async (tx) => {
      const now = new Date();
      await reconcileRefunds(tx, charge, totalsOf(read, charge), now);
      // Asaas answered 200: taken, even when its answer does not show it yet.
      await takeRefund(tx, charge, refundId, now);
      await settleRefundMoney(tx, charge.providerId, now);
    });
    await this.told(storeId, orderId);
  }

  /**
   * Before the shop cancels an order (BEELINK-208): what the shop still holds of its payment and has
   * not begun to give back is refunded first, all of it — the order is cancelled only once Asaas
   * took that. An order that holds nothing costs no request. Without `refund`, one that holds money
   * is refused with `ORDER_PAID`: the cancellation of a paid order says why.
   */
  async refundBeforeCancelling(storeId: string, number: number, refund: { reason: string; refundableCents: number } | undefined, userId: string | null): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { storeId_number: { storeId, number } }, select: { id: true, status: true, payments: { where: { providerId: { not: null } } } } });
    const held = order?.payments.find((row) => holdsMoney(row.status));
    if (!order || order.status === 'CANCELLED' || !held) return;
    const charge = { providerId: held.providerId!, amountCents: held.amountCents };
    if ((await unrefundedOf(this.prisma, charge)) === 0) return;
    if (!refund) throw new ConflictException({ errorCode: 'ORDER_PAID' satisfies OrderErrorCode, message: 'A paid order is cancelled only with its refund' });

    const left = await refundableOf(this.prisma, charge);
    try {
      // A refund still being asked covers part of it: `refund` settles that one first, and says what is left then.
      await this.refund(storeId, order.id, { amountCents: left > 0 ? left : refund.refundableCents, reason: refund.reason, refundableCents: refund.refundableCents, origin: 'CANCELLATION', userId });
    } catch (error) {
      // An earlier asking turned out to have been taken: nothing is left to give back, and the order may go.
      if ((await unrefundedOf(this.prisma, charge)) > 0) throw error;
    }
  }

  /** The first step, and the only one under the shop's lock before Asaas is asked: what cannot be refunded is refused, and the refund is claimed. */
  private claim(storeId: string, orderId: string, asked: RefundAsked): Promise<Claimed> {
    return this.underShopLock(storeId, async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, storeId }, select: { id: true, payments: { where: { providerId: { not: null } } }, strayPayments: true } });
      if (!order) throw new NotFoundException(refundError('ORDER_NOT_FOUND', 'No such order in this shop'));

      const stray = asked.strayId ? order.strayPayments.find((row) => row.id === asked.strayId) : undefined;
      // A stray payment that is also the order's own row — paid after the order was cancelled — is refunded as that row.
      const row = order.payments.find((each) => (stray ? each.providerId === stray.providerId : holdsMoney(each.status)));
      if (asked.strayId ? !stray || (row !== undefined && !holdsMoney(row.status)) : !row) {
        // A screen that still shows money to give back is told to read again: it went back meanwhile.
        if (asked.refundableCents > 0 && (stray || order.payments.length > 0)) throw conflict('REFUND_STALE', 'What is left to refund changed: read the order again');
        throw conflict('REFUND_NOTHING_TO_REFUND', 'The order holds no money to give back');
      }
      const providerId = (stray?.providerId ?? row?.providerId)!;
      const charge: RefundedCharge = { orderId, storeId, providerId, amountCents: stray?.amountCents ?? row!.amountCents };
      const target: AsaasRefundTarget = { id: providerId, installmentId: row?.providerInstallmentId ?? null };

      const now = new Date();
      const asking = await tx.orderRefund.findFirst({ where: { providerId, status: 'REQUESTED' } });
      if (asking?.claimedUntil && asking.claimedUntil > now) throw conflict('REFUND_IN_PROGRESS', 'Another refund of this payment is being asked of Asaas');
      if (asking) return { unknown: { charge, target } };

      const refundableCents = await refundableOf(tx, charge);
      // Before anything else: a screen that shows another amount as left is told to read again, whatever it asked.
      if (asked.refundableCents !== refundableCents) throw conflict('REFUND_STALE', 'What is left to refund changed: read the order again');
      if (refundableCents === 0) throw conflict('REFUND_NOTHING_TO_REFUND', 'The order holds no money to give back');
      if (asked.amountCents > refundableCents) throw conflict('REFUND_EXCEEDS', 'More than what is left to refund', { refundableCents });
      if (row && !refundableWord(row.providerStatus)) throw conflict('REFUND_NOT_READY', 'Asaas does not let this charge be refunded now');

      const refund = await claimRefund(tx, charge, { amountCents: asked.amountCents, reason: asked.reason, origin: asked.origin, requestedById: asked.userId, claimedUntil: new Date(now.getTime() + CLAIM_MS) });
      return { refundId: refund.id, charge, target, plain: row !== undefined };
    });
  }

  /**
   * A refund asked before and never answered: the charge is read by its id, and what it shows is
   * written — the refund taken, or, its claim having run out, given up on as never made. Without
   * that reading nothing is asked: a second refund on top of one that may exist is the one thing
   * this must not do.
   */
  private async settleUnknown(storeId: string, orderId: string, { charge, target }: { charge: RefundedCharge; target: AsaasRefundTarget }): Promise<void> {
    let read: AsaasRefundsRead | null;
    try {
      read = await this.charges.refundsOf(storeId, target);
    } catch (error) {
      this.logger.warn({ storeId, orderId, reason: reasonOf(error) }, 'Could not read a charge whose refund nobody knows the end of');
      throw unavailable();
    }
    await this.underShopLock(storeId, async (tx) => {
      const now = new Date();
      await reconcileRefunds(tx, charge, read ? totalsOf(read, charge) : NO_REFUNDS, now, true);
      await settleRefundMoney(tx, charge.providerId, now);
    });
    await this.told(storeId, orderId);
  }

  /** What a failed asking leaves, and how it is told to the shop: a stable code, and Asaas's own words where it gave a reason. Null when the refund was made after all. */
  private async failed(error: unknown, storeId: string, orderId: string, { refundId, charge, target }: Extract<Claimed, { refundId: string }>): Promise<Error | null> {
    if (error instanceof AsaasRefused) {
      this.logger.warn({ storeId, orderId, reason: error.message }, 'Asaas refused a refund');
      await this.underShopLock(storeId, (tx) => refuseRefund(tx, refundId, error.reason));
      const code = refundRefusalOf(error.reason);
      return new BadGatewayException(refundError(code, 'Asaas refused the refund', code === 'REFUND_REFUSED' ? { reason: error.reason } : undefined));
    }
    if (error instanceof AsaasOutcomeUnknown) {
      this.logger.warn({ storeId, orderId, reason: error.message }, 'Asaas did not answer a refund: its charge is read before anything else is asked');
      const read = await this.charges.refundsOf(storeId, target).catch(() => undefined);
      const taken = await this.underShopLock(storeId, async (tx) => {
        const now = new Date();
        if (read) await reconcileRefunds(tx, charge, totalsOf(read, charge), now);
        const row = await tx.orderRefund.findUnique({ where: { id: refundId }, select: { status: true } });
        // Not there yet may still be there in a moment: nobody asks again until it had time to show.
        if (row?.status === 'REQUESTED') await holdRefund(tx, refundId, new Date(now.getTime() + UNKNOWN_OUTCOME_HOLD_MS));
        await settleRefundMoney(tx, charge.providerId, now);
        return row?.status === 'PROCESSING' || row?.status === 'DONE';
      });
      if (taken) {
        await this.told(storeId, orderId);
        return null;
      }
      return new ServiceUnavailableException(refundError('REFUND_UNCONFIRMED', 'Asaas did not answer, and the charge does not show the refund yet'));
    }
    // The account was never asked — its key does not open, or Asaas asked for time: nothing happened.
    await this.underShopLock(storeId, (tx) => dropRefund(tx, refundId)).catch(() => undefined);
    if (!(error instanceof AsaasStoreUnavailable)) this.logger.warn({ storeId, orderId, reason: reasonOf(error) }, 'Asaas could not be asked for a refund');
    return unavailable();
  }

  /** Both sides told once the refund is committed, and Asaas's new word of the charge heard — which fails nothing: the refund stands. */
  private async told(storeId: string, orderId: string): Promise<void> {
    await this.news.tell(storeId, orderId, null);
    await this.heard.sync(storeId, orderId).catch((error: unknown) => this.logger.warn({ storeId, orderId, reason: reasonOf(error) }, 'Could not hear Asaas of a charge just refunded'));
  }

  private underShopLock<T>(storeId: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "stores" WHERE "id" = ${storeId}::uuid FOR UPDATE`;
      return work(tx);
    });
  }
}

const reasonOf = (error: unknown): string => (error instanceof Error ? error.message : 'Unknown failure');
