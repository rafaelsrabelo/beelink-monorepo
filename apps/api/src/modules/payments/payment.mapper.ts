// Types
import type { CustomerOrderPayment, OnlinePaymentMethod, OrderPayment, OrderPaymentBrief, ShopOrderPayment } from '@harness-monorepo/contracts';
import type { OrderPaymentModel } from '../../generated/prisma/models.js';

// App
import { isLive } from './payment-status.js';

type BriefRow = Pick<OrderPaymentModel, 'status' | 'expiresAt' | 'createdAt'>;

/**
 * The charge an order shows, of every attempt it had: the one alive, else the last tried — a
 * cancelled or refused one tells both sides another is to be made.
 */
export function shownPaymentOf<Row extends BriefRow>(rows: readonly Row[]): Row | null {
  const latestFirst = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return latestFirst.find((row) => isLive(row.status)) ?? latestFirst[0] ?? null;
}

export function toPaymentBrief(rows: readonly BriefRow[]): OrderPaymentBrief | null {
  const row = shownPaymentOf(rows);
  return row ? { status: row.status, expiresAt: row.expiresAt?.toISOString() ?? null } : null;
}

function toPayment(row: OrderPaymentModel): OrderPayment {
  return {
    status: row.status,
    // A CHECK keeps the column to the two.
    method: row.method as OnlinePaymentMethod,
    installments: row.installments,
    amountCents: row.amountCents,
    refundedCents: row.refundedCents,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export function toOrderPayment(rows: readonly OrderPaymentModel[]): OrderPayment | null {
  const row = shownPaymentOf(rows);
  return row ? toPayment(row) : null;
}

export function toShopOrderPayment(rows: readonly OrderPaymentModel[]): ShopOrderPayment | null {
  const row = shownPaymentOf(rows);
  return row ? { ...toPayment(row), providerStatus: row.providerStatus, lastError: row.lastError } : null;
}

/** With what it is paid with — only while it is still to be paid: a code or an invoice of a charge paid, removed or past its time leads nowhere. */
export function toCustomerPayment(row: OrderPaymentModel, now: Date, orderStands: boolean): CustomerOrderPayment {
  // A cancelled order's charge is not offered, even one Asaas has not removed yet.
  const within = orderStands && row.expiresAt !== null && row.expiresAt > now;
  const pix = row.status === 'PENDING' && within && row.pixPayload && row.pixImage && row.expiresAt ? { payload: row.pixPayload, image: row.pixImage, expiresAt: row.expiresAt.toISOString() } : null;
  const invoiceUrl = row.method === 'CREDIT_CARD' && row.status === 'PENDING' && within ? row.invoiceUrl : null;
  return { ...toPayment(row), pix, invoiceUrl };
}
