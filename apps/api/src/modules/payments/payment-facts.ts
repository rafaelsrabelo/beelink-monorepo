// Types
import type { OnlinePaymentMethod } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import { methodOfPlan, type ChargePlan } from './charge-plan.js';
import { DEAD_STATUSES, isLive, statusAfter, wasPaid } from './payment-status.js';
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
 * a listing, a read; a webhook's payload later (BEELINK-206) — written on the row that names it, or
 * on a new row when bee-link first hears of it (a charge a dead process left behind). The status only
 * moves the money's way (`statusAfter`). It talks to nobody: whatever must be removed at Asaas for
 * the row to stand alone is `OrderPayments`' to do first.
 */
export async function applyCharge(tx: Tx, order: { id: string; storeId: string; method: OnlinePaymentMethod }, plan: ChargePlan, now: Date): Promise<OrderPaymentModel> {
  const known = await tx.orderPayment.findUnique({ where: { providerId: plan.id } });
  const status = statusAfter(known?.status ?? null, plan);
  const paid = wasPaid(status);
  const told = {
    status,
    providerStatus: plan.status.slice(0, 40),
    providerInstallmentId: plan.installmentId,
    invoiceUrl: plan.invoiceUrl ?? known?.invoiceUrl ?? null,
    paidAt: paid ? (known?.paidAt ?? now) : null,
    cancelledAt: isLive(status) ? null : (known?.cancelledAt ?? now),
    // The code of a charge no longer to be paid is not kept: a QR is a few kilobytes of base64 a row.
    ...(paid || !isLive(status) ? { pixPayload: null, pixImage: null } : {}),
  };
  if (known) return tx.orderPayment.update({ where: { id: known.id }, data: told });

  return tx.orderPayment.create({
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
}

/**
 * Rows whose charges Asaas no longer holds — removed there, or not in the account the shop has now —
 * marked cancelled, while they are still unpaid. By their ids, as they were read before Asaas was
 * listed: a row written since belongs to a charge that listing never saw, and is not this caller's
 * to cancel. A row leaves the living on Asaas's word alone.
 */
export async function cancelRows(tx: Tx, ids: readonly string[], now: Date): Promise<void> {
  if (ids.length === 0) return;
  await tx.orderPayment.updateMany({ where: { id: { in: [...ids] }, status: { in: ['PENDING', 'OVERDUE'] } }, data: { status: 'CANCELLED', cancelledAt: now, pixPayload: null, pixImage: null } });
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
