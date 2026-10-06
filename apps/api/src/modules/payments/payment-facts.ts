// Types
import type { OnlinePaymentMethod, StrayPaymentReason } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import { methodOfPlan, type ChargePlan } from './charge-plan.js';
import { nextCheckAfter } from './payment-checks.js';
import { notePaymentApproved } from '../conversations/order-status-notice.js';
import { DEAD_STATUSES, holdsMoney, isLive, statusAfter, statusSaidBy, wasPaid } from './payment-status.js';
import { reconcileRefunds, settleRefundMoney, unrefundedOf } from './payment-refunds.js';
import { endOfBrasiliaDay } from './payment-terms.js';
import { LAST_ERROR_MAX_LENGTH } from './payments.constants.js';

type Tx = Prisma.TransactionClient;

/**
 * The writers of `order_payments` (BEELINK-204). Every one runs in a transaction that holds the
 * shop's row — the lock a placement, a status change and a cancellation take — so a charge and its
 * order are never read halfway through each other.
 */

/**
 * The door a fact from Asaas comes in by: a charge as Asaas tells it now — the answer to a creation,
 * a listing, a read, whether a customer, a webhook or the reconciliation made bee-link ask — written
 * on the row that names it, or on a new row when bee-link first hears of it (a charge a dead process
 * left behind). A plan is known by its first instalment or by the plan's own id. The status only
 * moves the money's way (`statusAfter`), with one way back: a receipt in cash the shop declared at
 * Asaas and then undid — no money ever went through. What Asaas changed of a charge still alive —
 * its amount, its due day — is followed, and a Pix's code dropped with it: Asaas makes another. It
 * talks to nobody: whatever must be removed at Asaas for the row to stand alone is `OrderPayments`'
 * to do first. This is also the one place a charge is known to have just been paid, whoever heard
 * it: what that owes the customer is written here (`tellPaid`), in the same transaction.
 *
 * Money given back comes in here too (BEELINK-208): the charge's refunds as Asaas adds them up are
 * written on `order_refunds` (`reconcileRefunds`), and what the row says of them — how much went
 * back, how much is on its way, `PARTIALLY_REFUNDED`, `REFUNDED` — is derived from those rows
 * (`settleRefundMoney`), whether the refund was asked here or made at Asaas's own panel.
 */
export async function applyCharge(tx: Tx, order: { id: string; storeId: string; method: OnlinePaymentMethod }, plan: ChargePlan, now: Date): Promise<OrderPaymentModel> {
  const known =
    (await tx.orderPayment.findUnique({ where: { providerId: plan.id } })) ??
    (plan.installmentId ? await tx.orderPayment.findFirst({ where: { orderId: order.id, providerInstallmentId: plan.installmentId } }) : null);
  const undone = known?.status === 'RECEIVED' && known.providerStatus === 'RECEIVED_IN_CASH' && !plan.deleted && (plan.status === 'PENDING' || plan.status === 'OVERDUE');
  const status = undone ? statusSaidBy(plan.status, null) : statusAfter(known?.status ?? null, plan);
  const paid = wasPaid(status);
  const waiting = status === 'PENDING' || status === 'OVERDUE';
  const told = {
    status,
    providerStatus: plan.status.slice(0, 40),
    providerInstallmentId: plan.installmentId,
    invoiceUrl: plan.invoiceUrl ?? known?.invoiceUrl ?? null,
    paidAt: paid ? (known?.paidAt ?? now) : null,
    cancelledAt: isLive(status) ? null : (known?.cancelledAt ?? now),
    checkedAt: now,
    // Asked about again only while it waits; when is the reconciliation's to push further.
    nextCheckAt: waiting ? (known?.nextCheckAt ?? nextCheckAfter(0, now)) : null,
    // The code of a charge no longer to be paid is not kept: a QR is a few kilobytes of base64 a row.
    ...(paid || !isLive(status) ? { pixPayload: null, pixImage: null } : {}),
  };
  const row = known
    ? await tx.orderPayment.update({ where: { id: known.id }, data: { ...told, ...(isLive(status) ? changedOf(known, plan) : {}) } })
    : await tx.orderPayment.create({
        data: {
          orderId: order.id,
          storeId: order.storeId,
          providerId: plan.id,
          method: methodOfPlan(plan, order.method),
          installments: plan.installments,
          amountCents: plan.totalCents,
          dueDate: plan.dueDate ? new Date(`${plan.dueDate}T00:00:00.000Z`) : null,
          expiresAt: plan.dueDate ? endOfBrasiliaDay(plan.dueDate) : null,
          ...told,
        },
      });
  if (holdsMoney(status) && !(known && wasPaid(known.status))) await tellPaid(tx, order, now);
  if (!paid || !row.providerId) return row;

  if (plan.refunds) await reconcileRefunds(tx, { orderId: order.id, storeId: order.storeId, providerId: row.providerId, amountCents: row.amountCents }, plan.refunds, now);
  await settleRefundMoney(tx, row.providerId, now);
  return tx.orderPayment.findUniqueOrThrow({ where: { id: row.id } });
}

/**
 * The news that an order was paid (BEELINK-207), owed once an order — the unique order id of
 * `OrderPaidNotice` is what makes a second hearing, or a card's `CONFIRMED` turning `RECEIVED`, owe
 * nothing again. The line in the conversation is written with it; the e-mail is owed only to a
 * customer whose account confirmed its e-mail and who has not turned order notices off, read here
 * as an order's move reads them — one not owed is born done. `PaymentNews` tells the panel after
 * the commit. A cancelled order's money is never "approved": it is a stray payment the shop gives
 * back.
 */
async function tellPaid(tx: Tx, order: { id: string; storeId: string }, at: Date): Promise<void> {
  const current = await tx.order.findUnique({
    where: { id: order.id },
    select: { status: true, customerId: true, customer: { select: { notifyOrders: true, user: { select: { emailVerifiedAt: true } } } } },
  });
  if (!current || current.status === 'CANCELLED') return;

  const owed = Boolean(current.customer.user?.emailVerifiedAt) && current.customer.notifyOrders;
  const { count } = await tx.orderPaidNotice.createMany({ data: [{ orderId: order.id, storeId: order.storeId, createdAt: at, nextAttemptAt: at, sentAt: owed ? null : at }], skipDuplicates: true });
  if (count > 0) await notePaymentApproved(tx, { id: order.id, customerId: current.customerId }, at);
}

/** Somebody at the shop opened a paid order: the bell stops telling of it. Answers whether it was still telling. */
export async function markPaidSeen(db: Pick<Tx, 'orderPaidNotice'>, orderId: string, at: Date): Promise<boolean> {
  const { count } = await db.orderPaidNotice.updateMany({ where: { orderId, seenAt: null }, data: { seenAt: at } });
  return count > 0;
}

/** The one caller that tells the panel a payment was approved: whoever takes `toldAt` first. */
export async function claimPaidNews(db: Pick<Tx, 'orderPaidNotice'>, orderId: string, at: Date): Promise<boolean> {
  const { count } = await db.orderPaidNotice.updateMany({ where: { orderId, toldAt: null }, data: { toldAt: at } });
  return count > 0;
}

/** What Asaas holds differently from the row: an amount or a due day the shop changed at Asaas's own panel. */
function changedOf(known: OrderPaymentModel, plan: ChargePlan) {
  const amount = plan.totalCents > 0 && plan.totalCents !== known.amountCents;
  const due = plan.dueDate !== '' && known.dueDate?.toISOString().slice(0, 10) !== plan.dueDate;
  return {
    ...(amount ? { amountCents: plan.totalCents, installments: plan.installments } : {}),
    ...(due ? { dueDate: new Date(`${plan.dueDate}T00:00:00.000Z`), expiresAt: endOfBrasiliaDay(plan.dueDate) } : {}),
    ...(amount || due ? { pixPayload: null, pixImage: null } : {}),
  };
}

/**
 * A payment the order did not ask for (BEELINK-206), kept once per charge: answers whether this is
 * the first bee-link hears of it. Money the shop has already begun to give back whole — a paid order
 * cancelled with its refund (BEELINK-208) — is not one: nothing is left for the shop to settle.
 */
export async function noteStray(
  tx: Tx,
  stray: { orderId: string; storeId: string; providerId: string; method: OnlinePaymentMethod; amountCents: number },
  reason: StrayPaymentReason,
  now: Date,
): Promise<boolean> {
  if ((await unrefundedOf(tx, stray)) === 0) return false;
  const { count } = await tx.orderStrayPayment.createMany({ data: [{ ...stray, reason, paidAt: now }], skipDuplicates: true });
  return count > 0;
}

/**
 * Rows whose charges Asaas no longer holds — removed there, or not in the account the shop has now —
 * marked cancelled, while they are still unpaid. By their ids, as they were read before Asaas was
 * listed: a row written since belongs to a charge that listing never saw, and is not this caller's
 * to cancel. A row leaves the living on Asaas's word alone.
 */
export async function cancelRows(tx: Tx, ids: readonly string[], now: Date): Promise<void> {
  if (ids.length === 0) return;
  await tx.orderPayment.updateMany({ where: { id: { in: [...ids] }, status: { in: ['PENDING', 'OVERDUE'] } }, data: { status: 'CANCELLED', cancelledAt: now, nextCheckAt: null, pixPayload: null, pixImage: null } });
}

/** An attempt Asaas refused to make, kept for the shop to read why — in Asaas's words, which the customer is never told. Never alive. */
export async function recordRefusal(tx: Tx, order: { id: string; storeId: string; method: OnlinePaymentMethod; totalCents: number; installments: number }, reason: string): Promise<void> {
  await tx.orderPayment.create({
    data: { orderId: order.id, storeId: order.storeId, method: order.method, installments: order.installments, amountCents: order.totalCents, status: 'FAILED', lastError: reason.slice(0, LAST_ERROR_MAX_LENGTH) },
  });
}

/** What Asaas refused about the order's standing charge — removing it, most likely — for the shop to read. */
export async function noteRefusal(tx: Tx, orderId: string, reason: string): Promise<void> {
  await tx.orderPayment.updateMany({ where: { orderId, status: { notIn: [...DEAD_STATUSES] } }, data: { lastError: reason.slice(0, LAST_ERROR_MAX_LENGTH) } });
}

type Db = Pick<Tx, 'orderPayment'>;

/** What the reconciliation asks about: a charge still to be paid, and a paid one with a refund on its way (BEELINK-208). */
export const CHECKED = { OR: [{ status: { in: ['PENDING', 'OVERDUE'] } }, { refundingCents: { gt: 0 } }] } satisfies Prisma.OrderPaymentWhereInput;

/**
 * A charge about to be asked about by the reconciliation (BEELINK-206): counted, and its next
 * turn pushed before Asaas answers — one that keeps failing waits longer too. Answers whether the
 * turn was this caller's to take.
 */
export async function pushCheck(db: Db, row: { id: string; checks: number }, now: Date): Promise<boolean> {
  // Only while it is still due: of two processes on the same pass, one takes the turn and asks.
  const { count } = await db.orderPayment.updateMany({
    where: { id: row.id, AND: [CHECKED, { OR: [{ nextCheckAt: null }, { nextCheckAt: { lte: now } }] }] },
    data: { checks: { increment: 1 }, nextCheckAt: nextCheckAfter(row.checks + 1, now) },
  });
  return count > 0;
}

/** Asaas asked for time at a shop's account: none of the shop's waiting charges is due before it. */
export async function restChecks(db: Db, storeId: string, until: Date): Promise<void> {
  await db.orderPayment.updateMany({ where: { storeId, AND: [CHECKED, { OR: [{ nextCheckAt: null }, { nextCheckAt: { lt: until } }] }] }, data: { nextCheckAt: until } });
}
