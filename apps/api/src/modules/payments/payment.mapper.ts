// Types
import type { CustomerOrderPayment, OnlinePaymentMethod, OrderPayment, OrderPaymentBrief, ShopOrderPayment, StrayPayment } from '@harness-monorepo/contracts';
import type { OrderPaymentModel, OrderStrayPaymentModel } from '../../generated/prisma/models.js';

// App
import { isLive } from './payment-status.js';

type BriefRow = Pick<OrderPaymentModel, 'status' | 'expiresAt' | 'paidAt' | 'createdAt'>;

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
  return row ? { status: row.status, expiresAt: row.expiresAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null } : null;
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

function toStray(row: OrderStrayPaymentModel): StrayPayment {
  // A CHECK keeps a charge to the two.
  return { reason: row.reason, method: row.method as OnlinePaymentMethod, amountCents: row.amountCents, paidAt: row.paidAt.toISOString() };
}

/** `notice` is the news that the order was paid (BEELINK-207): while nobody at the shop opened it since, the bell tells of it. */
export function toShopOrderPayment(rows: readonly OrderPaymentModel[], strays: readonly OrderStrayPaymentModel[], notice: { seenAt: Date | null } | null): ShopOrderPayment | null {
  const row = shownPaymentOf(rows);
  const oldestFirst = [...strays].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return row ? { ...toPayment(row), providerStatus: row.providerStatus, lastError: row.lastError, strays: oldestFirst.map(toStray), unseen: notice !== null && notice.seenAt === null } : null;
}

/** With what it is paid with — only while it is still to be paid: a code or an invoice of a charge paid, removed or past its time leads nowhere. */
export function toCustomerPayment(row: OrderPaymentModel, now: Date, orderStands: boolean): CustomerOrderPayment {
  // A cancelled order's charge is not offered, even one Asaas has not removed yet.
  const within = orderStands && row.expiresAt !== null && row.expiresAt > now;
  const pix = row.status === 'PENDING' && within && row.pixPayload && row.pixImage && row.expiresAt ? { payload: row.pixPayload, image: row.pixImage, expiresAt: row.expiresAt.toISOString() } : null;
  const invoiceUrl = row.method === 'CREDIT_CARD' && row.status === 'PENDING' && within ? row.invoiceUrl : null;
  return { ...toPayment(row), pix, invoiceUrl };
}
