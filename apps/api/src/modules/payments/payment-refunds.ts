// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { OrderRefundModel } from '../../generated/prisma/models.js';

// App
import { noteRefund } from '../conversations/order-status-notice.js';
import { nextCheckAfter } from './payment-checks.js';
import { holdsMoney } from './payment-status.js';
import { LAST_ERROR_MAX_LENGTH } from './payments.constants.js';
import type { RefundTotals } from './refund-totals.js';

type Tx = Prisma.TransactionClient;

/**
 * The writers of `order_refunds` (BEELINK-208), and of what the rest of the books derive from them.
 * Every one runs in a transaction that holds the shop's row, as the writers of `order_payments` do.
 */

/** A refund Asaas was asked for and did not turn down: it counts against what is left to refund. */
export const STANDING_REFUNDS = ['REQUESTED', 'PROCESSING', 'DONE'] as const;
/** A refund Asaas took: money back, or on its way. */
export const TAKEN_REFUNDS = ['PROCESSING', 'DONE'] as const;

/** The charge refunds are kept for: an order's own payment, or a stray one. */
export interface RefundedCharge {
  orderId: string;
  storeId: string;
  providerId: string;
  amountCents: number;
}

const sumOf = (rows: readonly { amountCents: number }[]): number => rows.reduce((sum, row) => sum + row.amountCents, 0);

/** What a new refund of the charge may still ask for: its amount, less every refund standing. */
export async function refundableOf(tx: Pick<Tx, 'orderRefund'>, charge: Pick<RefundedCharge, 'providerId' | 'amountCents'>): Promise<number> {
  const standing = await tx.orderRefund.findMany({ where: { providerId: charge.providerId, status: { in: [...STANDING_REFUNDS] } }, select: { amountCents: true } });
  return Math.max(charge.amountCents - sumOf(standing), 0);
}

/** What of the charge no refund Asaas took covers: money the shop still holds, and has not begun to give back. */
export async function unrefundedOf(tx: Pick<Tx, 'orderRefund'>, charge: Pick<RefundedCharge, 'providerId' | 'amountCents'>): Promise<number> {
  const taken = await tx.orderRefund.findMany({ where: { providerId: charge.providerId, status: { in: [...TAKEN_REFUNDS] } }, select: { amountCents: true } });
  return Math.max(charge.amountCents - sumOf(taken), 0);
}

/**
 * What Asaas says of a charge's refunds, written on bee-link's rows — the door a refund comes in by,
 * whoever heard it: the answer to a refund asked here, a webhook, the reconciliation. By sums, the
 * oldest row first: one the money back covers is done; one the money back and on its way covers was
 * taken; what Asaas holds beyond every row is a refund made at its own panel, and gets a row. A row
 * is never moved back, and Asaas's silence undoes nothing: one taken is denied only with a
 * cancelled refund in sight, and one still being asked is given up on only by `authoritative` — a
 * read of the charge by its id, made for that — once its claim ran out.
 *
 * A row taken for the first time owes the customer its news (`tellRefunded`), here, in the same
 * transaction. Answers whether anything was written.
 */
export async function reconcileRefunds(tx: Tx, charge: RefundedCharge, totals: RefundTotals, now: Date, authoritative = false): Promise<boolean> {
  const rows = await tx.orderRefund.findMany({ where: { providerId: charge.providerId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
  const standing = rows.filter((row) => row.status !== 'REFUSED' && row.status !== 'DENIED');
  let done = Math.min(totals.doneCents, charge.amountCents);
  let pending = Math.min(totals.pendingCents, charge.amountCents - done);
  let wrote = false;
  let uncovered = false;

  // Taken here and no longer at Asaas, with a cancelled refund in sight: that one was denied. Which
  // row it was is told by the amount — the one that is exactly what is missing, else the oldest that
  // fit — and never guessed past what Asaas shows cancelled. A cancelled refund already accounted
  // for — written as denied, or given up on after a silence — is not counted again.
  let cancelled = totals.cancelledCents - sumOf(rows.filter((row) => row.status === 'DENIED' || row.status === 'REFUSED'));
  let missing = sumOf(standing.filter((row) => row.status !== 'REQUESTED')) - done - pending;
  const underway = standing.filter((row) => row.status === 'PROCESSING');
  const denied = new Set<string>();
  for (const row of [...underway.filter((each) => each.amountCents === missing), ...underway]) {
    if (missing <= 0 || denied.has(row.id) || row.amountCents > missing || row.amountCents > cancelled) continue;
    await tx.orderRefund.update({ where: { id: row.id }, data: { status: 'DENIED', lastError: 'Asaas cancelled the refund after taking it' } });
    denied.add(row.id);
    missing -= row.amountCents;
    cancelled -= row.amountCents;
    wrote = true;
  }

  for (const row of standing.filter((each) => !denied.has(each.id))) {
    if (row.amountCents <= done) {
      done -= row.amountCents;
      if (row.status !== 'DONE') wrote = (await take(tx, charge, row, 'DONE', now)) || wrote;
    } else if (row.amountCents <= done + pending) {
      pending -= row.amountCents - done;
      done = 0;
      if (row.status === 'REQUESTED') wrote = (await take(tx, charge, row, 'PROCESSING', now)) || wrote;
    } else if (row.status === 'REQUESTED' && authoritative && (!row.claimedUntil || row.claimedUntil <= now)) {
      await tx.orderRefund.update({ where: { id: row.id }, data: { status: 'REFUSED', claimedUntil: null, lastError: 'Asaas did not answer, and holds no such refund' } });
      wrote = true;
    } else if (row.status !== 'DONE') {
      uncovered = true;
    }
  }

  // Beyond every row: made at Asaas itself. Not while a row waits to be told apart from it.
  if (!uncovered) {
    const room = await refundableOf(tx, charge);
    const outside = [
      { amountCents: Math.min(done, room), status: 'DONE' as const },
      { amountCents: Math.min(pending, room - Math.min(done, room)), status: 'PROCESSING' as const },
    ];
    for (const { amountCents, status } of outside) {
      if (amountCents <= 0) continue;
      const row = await tx.orderRefund.create({ data: { orderId: charge.orderId, storeId: charge.storeId, providerId: charge.providerId, amountCents, origin: 'ASAAS', status: 'REQUESTED', createdAt: now } });
      await take(tx, charge, row, status, now);
      wrote = true;
    }
  }
  return wrote;
}

/** A row written as taken by Asaas, or as concluded; the first of the two tells the customer. */
async function take(tx: Tx, charge: RefundedCharge, row: OrderRefundModel, status: 'PROCESSING' | 'DONE', now: Date): Promise<boolean> {
  const first = row.acceptedAt === null;
  await tx.orderRefund.update({ where: { id: row.id }, data: { status, claimedUntil: null, acceptedAt: row.acceptedAt ?? now, doneAt: status === 'DONE' ? (row.doneAt ?? now) : null } });
  if (first) await tellRefunded(tx, charge, row, now);
  return true;
}

/**
 * The news that money is going back, owed once a refund: the line in the order's conversation, and
 * the row of `OrderRefundNotice` — the customer's e-mail, owed only to an account that confirmed
 * its e-mail and has not turned order notices off; one not owed is born done.
 */
async function tellRefunded(tx: Tx, charge: RefundedCharge, row: OrderRefundModel, at: Date): Promise<void> {
  const order = await tx.order.findUnique({ where: { id: charge.orderId }, select: { customerId: true, customer: { select: { notifyOrders: true, user: { select: { emailVerifiedAt: true } } } } } });
  if (!order) return;
  const owed = Boolean(order.customer.user?.emailVerifiedAt) && order.customer.notifyOrders;
  const { count } = await tx.orderRefundNotice.createMany({ data: [{ refundId: row.id, createdAt: at, nextAttemptAt: at, sentAt: owed ? null : at }], skipDuplicates: true });
  if (count > 0) await noteRefund(tx, { id: charge.orderId, customerId: order.customerId }, row.amountCents, at);
}

/**
 * What the books say of a charge's refunds, derived from its rows and nothing else: on the order's
 * payment, what went back and what is on its way, and `PARTIALLY_REFUNDED` or `REFUNDED` with it —
 * never back down from a `REFUNDED` Asaas itself said; on a stray payment, that it is settled once
 * the refunds Asaas took cover it. A payment with a refund on its way is asked about again by the
 * reconciliation.
 */
export async function settleRefundMoney(tx: Tx, providerId: string, now: Date): Promise<void> {
  const taken = await tx.orderRefund.findMany({ where: { providerId, status: { in: [...TAKEN_REFUNDS] } }, select: { amountCents: true, status: true } });
  const doneCents = sumOf(taken.filter((row) => row.status === 'DONE'));
  const takenCents = sumOf(taken);

  const payment = await tx.orderPayment.findUnique({ where: { providerId } });
  if (payment && (holdsMoney(payment.status) || payment.status === 'REFUNDED')) {
    const whole = payment.status === 'REFUNDED' || doneCents >= payment.amountCents;
    const refundedCents = whole ? payment.amountCents : doneCents;
    const refundingCents = whole ? 0 : Math.min(takenCents - doneCents, payment.amountCents - refundedCents);
    const status = whole ? ('REFUNDED' as const) : refundedCents > 0 ? ('PARTIALLY_REFUNDED' as const) : payment.status;
    const nextCheckAt = refundingCents > 0 ? (payment.nextCheckAt ?? nextCheckAfter(payment.checks, now)) : null;
    if (refundedCents !== payment.refundedCents || refundingCents !== payment.refundingCents || status !== payment.status || nextCheckAt?.getTime() !== payment.nextCheckAt?.getTime()) {
      await tx.orderPayment.update({ where: { id: payment.id }, data: { refundedCents, refundingCents, status, nextCheckAt } });
    }
  }

  const stray = await tx.orderStrayPayment.findUnique({ where: { providerId } });
  if (stray && !stray.resolvedAt && takenCents >= stray.amountCents) await tx.orderStrayPayment.update({ where: { id: stray.id }, data: { resolvedAt: now } });
}

/** A refund about to be asked of Asaas: the charge's one `REQUESTED` row, held until `claimedUntil`. */
export function claimRefund(
  tx: Tx,
  charge: RefundedCharge,
  refund: { amountCents: number; reason: string; origin: 'PANEL' | 'CANCELLATION'; requestedById: string | null; claimedUntil: Date },
): Promise<OrderRefundModel> {
  return tx.orderRefund.create({ data: { orderId: charge.orderId, storeId: charge.storeId, providerId: charge.providerId, status: 'REQUESTED', ...refund } });
}

/** Asaas took the refund and its answer did not say how far along it is: on its way, until a reading says more. */
export async function takeRefund(tx: Tx, charge: RefundedCharge, id: string, now: Date): Promise<void> {
  const row = await tx.orderRefund.findUnique({ where: { id } });
  if (row?.status === 'REQUESTED') await take(tx, charge, row, 'PROCESSING', now);
}

/** Asaas said no to the refund: kept, with its words, for the shop to read. */
export async function refuseRefund(tx: Tx, id: string, reason: string): Promise<void> {
  await tx.orderRefund.updateMany({ where: { id, status: 'REQUESTED' }, data: { status: 'REFUSED', claimedUntil: null, lastError: reason.slice(0, LAST_ERROR_MAX_LENGTH) } });
}

/** Asaas was never asked — the shop's account could not be reached at all: nothing happened, and nothing is kept. */
export async function dropRefund(tx: Tx, id: string): Promise<void> {
  await tx.orderRefund.deleteMany({ where: { id, status: 'REQUESTED' } });
}

/** Asaas did not answer and the charge does not show the refund yet: nobody asks again before `until`. */
export async function holdRefund(tx: Tx, id: string, until: Date): Promise<void> {
  await tx.orderRefund.updateMany({ where: { id, status: 'REQUESTED' }, data: { claimedUntil: until } });
}

/** Every refund of an order as it stands: what a hearing compares before and after, to know whether to tell anybody. */
export async function refundMarkOf(tx: Tx, orderId: string): Promise<string> {
  const rows = await tx.orderRefund.findMany({ where: { orderId }, select: { id: true, status: true }, orderBy: { id: 'asc' } });
  const strays = await tx.orderStrayPayment.count({ where: { orderId, resolvedAt: { not: null } } });
  return `${rows.map((row) => `${row.id}:${row.status}`).join(',')}|${strays}`;
}
