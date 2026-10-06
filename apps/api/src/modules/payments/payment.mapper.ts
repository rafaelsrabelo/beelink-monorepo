// Types
import type { CustomerOrderPayment, OnlinePaymentMethod, OrderPayment, OrderPaymentBrief, OrderRefund, ShopOrderPayment, ShopOrderRefund, StrayPayment } from '@harness-monorepo/contracts';
import type { OrderPaymentModel, OrderRefundModel, OrderStrayPaymentModel } from '../../generated/prisma/models.js';

// App
import { holdsMoney, isLive } from './payment-status.js';

type BriefRow = Pick<OrderPaymentModel, 'status' | 'expiresAt' | 'paidAt' | 'createdAt' | 'refundingCents'>;

/**
 * The charge an order shows, of every attempt it had: the one alive, else the last tried — a
 * cancelled or refused one tells both sides another is to be made.
 */
export function shownPaymentOf<Row extends Pick<BriefRow, 'status' | 'createdAt'>>(rows: readonly Row[]): Row | null {
  const latestFirst = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return latestFirst.find((row) => isLive(row.status)) ?? latestFirst[0] ?? null;
}

export function toPaymentBrief(rows: readonly BriefRow[]): OrderPaymentBrief | null {
  const row = shownPaymentOf(rows);
  return row ? { status: row.status, expiresAt: row.expiresAt?.toISOString() ?? null, paidAt: row.paidAt?.toISOString() ?? null, refundingCents: row.refundingCents } : null;
}

const oldestFirst = <Row extends { createdAt: Date; id: string }>(rows: readonly Row[]): Row[] => [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));

function toRefund(row: OrderRefundModel): OrderRefund {
  return { id: row.id, amountCents: row.amountCents, status: row.status, requestedAt: row.createdAt.toISOString(), doneAt: row.doneAt?.toISOString() ?? null };
}

/** The refunds the customer reads: of the order's own payment, and only those Asaas took — one asked and refused is the shop's business. */
function customerRefundsOf(row: OrderPaymentModel, refunds: readonly OrderRefundModel[]): OrderRefund[] {
  return oldestFirst(refunds.filter((refund) => refund.providerId === row.providerId && (refund.status === 'PROCESSING' || refund.status === 'DONE'))).map(toRefund);
}

function toPayment(row: OrderPaymentModel, refunds: readonly OrderRefundModel[]): OrderPayment {
  return {
    status: row.status,
    // A CHECK keeps the column to the two.
    method: row.method as OnlinePaymentMethod,
    installments: row.installments,
    amountCents: row.amountCents,
    refundedCents: row.refundedCents,
    refundingCents: row.refundingCents,
    refunds: customerRefundsOf(row, refunds),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export function toOrderPayment(rows: readonly OrderPaymentModel[], refunds: readonly OrderRefundModel[]): OrderPayment | null {
  const row = shownPaymentOf(rows);
  return row ? toPayment(row, refunds) : null;
}

/** What a new refund of a charge may still ask for: its amount, less every refund that stands. */
function refundableOf(charge: { providerId: string | null; amountCents: number }, refunds: readonly OrderRefundModel[]): number {
  const standing = refunds.filter((refund) => refund.providerId === charge.providerId && refund.status !== 'REFUSED' && refund.status !== 'DENIED');
  return Math.max(charge.amountCents - standing.reduce((sum, refund) => sum + refund.amountCents, 0), 0);
}

function toStray(row: OrderStrayPaymentModel, refunds: readonly OrderRefundModel[]): StrayPayment {
  return {
    id: row.id,
    reason: row.reason,
    // A CHECK keeps a charge to the two.
    method: row.method as OnlinePaymentMethod,
    amountCents: row.amountCents,
    paidAt: row.paidAt.toISOString(),
    refundableCents: refundableOf(row, refunds),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

/**
 * `notice` is the news that the order was paid (BEELINK-207): while nobody at the shop opened it since, the bell tells of it.
 * Every refund of the order is the shop's to read (BEELINK-208) — its payment's and a stray one's, taken or refused.
 */
export function toShopOrderPayment(rows: readonly OrderPaymentModel[], strays: readonly OrderStrayPaymentModel[], notice: { seenAt: Date | null } | null, refunds: readonly OrderRefundModel[]): ShopOrderPayment | null {
  const row = shownPaymentOf(rows);
  if (!row) return null;
  const shopRefunds = oldestFirst(refunds).map((refund): ShopOrderRefund => ({ ...toRefund(refund), origin: refund.origin, reason: refund.reason, lastError: refund.lastError, stray: refund.providerId !== row.providerId }));
  return {
    ...toPayment(row, refunds),
    refunds: shopRefunds,
    refundableCents: holdsMoney(row.status) ? refundableOf(row, refunds) : 0,
    providerStatus: row.providerStatus,
    lastError: row.lastError,
    strays: oldestFirst(strays).map((stray) => toStray(stray, refunds)),
    unseen: notice !== null && notice.seenAt === null,
  };
}

/** With what it is paid with — only while it is still to be paid: a code or an invoice of a charge paid, removed or past its time leads nowhere. */
export function toCustomerPayment(row: OrderPaymentModel, now: Date, orderStands: boolean, refunds: readonly OrderRefundModel[]): CustomerOrderPayment {
  // A cancelled order's charge is not offered, even one Asaas has not removed yet.
  const within = orderStands && row.expiresAt !== null && row.expiresAt > now;
  const pix = row.status === 'PENDING' && within && row.pixPayload && row.pixImage && row.expiresAt ? { payload: row.pixPayload, image: row.pixImage, expiresAt: row.expiresAt.toISOString() } : null;
  const invoiceUrl = row.method === 'CREDIT_CARD' && row.status === 'PENDING' && within ? row.invoiceUrl : null;
  return { ...toPayment(row, refunds), pix, invoiceUrl };
}
