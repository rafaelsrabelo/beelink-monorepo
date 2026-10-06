/* ── payments: an order charged online, in the shop's own Asaas account (BEELINK-204) ── */

// Types
import type { PaymentMethod } from "./store.js";

/**
 * Where an order is paid. `OFFLINE` is a label and nothing more: the shop and the customer settle
 * it between them, as before Asaas. `ONLINE` is charged at the shop's own Asaas account.
 */
export type OrderPaymentChannel = "OFFLINE" | "ONLINE";

/** What an order is charged with online: Pix, or a credit card on Asaas's hosted invoice. */
export type OnlinePaymentMethod = Extract<PaymentMethod, "PIX" | "CREDIT_CARD">;

/**
 * Where a charge stands. Paid is `CONFIRMED` (approved; on a card the money is still held) or
 * `RECEIVED`. `OVERDUE` is past its due day and still payable at Asaas until it is replaced.
 * `CANCELLED` was removed from Asaas; `FAILED` is one Asaas refused to create.
 */
export type OrderPaymentStatus = "PENDING" | "CONFIRMED" | "RECEIVED" | "OVERDUE" | "REFUNDED" | "PARTIALLY_REFUNDED" | "CANCELLED" | "FAILED";

/**
 * An order's charge as both sides read it: the one standing, else the last one tried. Every amount
 * is whole cents.
 */
export interface OrderPayment {
  status: OrderPaymentStatus;
  method: OnlinePaymentMethod;
  /** 1 is in full; more only on a card. */
  installments: number;
  amountCents: number;
  /** What went back to the customer for good: every refund Asaas concluded. */
  refundedCents: number;
  /** What is on its way back (BEELINK-208): refunds Asaas took and has not concluded — days, on a card. */
  refundingCents: number;
  /** Its refunds, the oldest first. The customer reads only those Asaas took: `PROCESSING` and `DONE`. */
  refunds: OrderRefund[];
  /** ISO-8601: until when it is offered to be paid here — the end of its due day in Brasília. Null on a `FAILED` one, which never existed. */
  expiresAt: string | null;
  /** ISO-8601; null until paid. */
  paidAt: string | null;
}

/**
 * Where a refund stands (BEELINK-208). `REQUESTED` is being asked of Asaas, or was asked and not
 * answered: nothing else is asked of that charge until it is known. `PROCESSING` was taken by Asaas
 * and is not concluded; `DONE` is money back. `REFUSED` is one Asaas said no to, or never made;
 * `DENIED` is one it took and cancelled afterwards.
 */
export type OrderRefundStatus = "REQUESTED" | "PROCESSING" | "DONE" | "REFUSED" | "DENIED";

/** Where a refund came from: asked on the order's page, with the order's cancellation, or made at Asaas's own panel. */
export type OrderRefundOrigin = "PANEL" | "CANCELLATION" | "ASAAS";

/** One refund of an order's payment. Whole cents. */
export interface OrderRefund {
  id: string;
  amountCents: number;
  status: OrderRefundStatus;
  /** ISO-8601: when it was asked for, or when bee-link learned of one made at Asaas. */
  requestedAt: string;
  /** ISO-8601; null until Asaas concluded it. */
  doneAt: string | null;
}

/** A refund as the shop reads it. */
export interface ShopOrderRefund extends OrderRefund {
  origin: OrderRefundOrigin;
  /** Why, as the shop wrote it; null on one made at Asaas. */
  reason: string | null;
  /** On a `REFUSED` or `DENIED` one: what Asaas said, in its words; null otherwise. */
  lastError: string | null;
  /** It gave back money the order did not ask for, not the order's own payment. */
  stray: boolean;
}

/** What a list says of an order's charge. */
export type OrderPaymentBrief = Pick<OrderPayment, "status" | "expiresAt" | "paidAt" | "refundingCents">;

/**
 * Which of a shop's orders, by where their money stands (BEELINK-207). `PAID` holds the customer's
 * money — `CONFIRMED`, `RECEIVED`, or refunded only in part. `PENDING` is charged online, not
 * cancelled, and was never paid. `PAID_UNSEEN` is paid and nobody at the shop opened it since: what
 * the panel's bell lists. `STRAY` has money it did not ask for, still to be settled by the shop.
 * `REFUNDED` had money given back, whole or in part, or has it on its way back (BEELINK-208).
 */
export type OrderPaymentFilter = "PAID" | "PENDING" | "PAID_UNSEEN" | "STRAY" | "REFUNDED";

/**
 * Why money that arrived at the shop's Asaas account is not the order's payment (BEELINK-206): the
 * order had been cancelled when it was paid, or it was already paid by another charge. bee-link
 * refunds nothing on its own — the shop does, from the order (BEELINK-208).
 */
export type StrayPaymentReason = "ORDER_CANCELLED" | "ORDER_ALREADY_PAID";

/** A payment the order did not ask for, as the shop reads it. Whole cents. */
export interface StrayPayment {
  /** What a refund of it is asked with (`RefundOrderPayload.strayId`). */
  id: string;
  reason: StrayPaymentReason;
  method: OnlinePaymentMethod;
  amountCents: number;
  /** ISO-8601: when bee-link learned of it. */
  paidAt: string;
  /** What of it is still to be given back: zero once a refund of all of it was asked and taken. */
  refundableCents: number;
  /** ISO-8601: when Asaas took the refund of all of it (BEELINK-208); null while the shop still has to settle it. */
  resolvedAt: string | null;
}

/** The charge as the shop reads it. */
export interface ShopOrderPayment extends OrderPayment {
  refunds: ShopOrderRefund[];
  /** What a refund may still ask for: the amount, less every refund done, on its way or being asked. Zero on a charge that holds no money. */
  refundableCents: number;
  /** The status in Asaas's own word — `AWAITING_RISK_ANALYSIS`, `CHARGEBACK_REQUESTED`… — which says more than ours. */
  providerStatus: string | null;
  /** What Asaas last refused about it, in its words; null when it refused nothing. */
  lastError: string | null;
  /** Money the order did not ask for, the oldest first, settled or not; empty on nearly every order. */
  strays: StrayPayment[];
  /** Paid, and nobody at the shop opened the order since (BEELINK-207): the bell still tells of it, until `POST …/orders/:number/payment/seen`. */
  unseen: boolean;
}

/** A Pix to be paid inside the shop. */
export interface OrderPaymentPix {
  /** The copy-and-paste code. */
  payload: string;
  /** The QR code, a PNG in base64. */
  image: string;
  /** ISO-8601: until when this code is paid. */
  expiresAt: string;
}

/** The charge as its customer reads it, with what they need to pay it. */
export interface CustomerOrderPayment extends OrderPayment {
  /** On a Pix still to be paid; null on a card, on one no longer payable, and while Asaas has not given the code. */
  pix: OrderPaymentPix | null;
  /** Asaas's hosted invoice, opened in a new tab, on a card still to be paid; null otherwise. */
  invoiceUrl: string | null;
}

/**
 * `GET` and `POST /stores/:slug/customer/orders/:number/payment`. Null on the read of an order paid
 * offline, and of one charged online that has no charge yet.
 */
export interface CustomerOrderPaymentAnswer {
  payment: CustomerOrderPayment | null;
}

/**
 * What a shop charges online right now, as its checkout reads it. Nothing of its Asaas account —
 * whose it is, its document, which key — travels here: this is read by anyone.
 */
export interface StorefrontOnlinePayments {
  pix: boolean;
  card: boolean;
  /** The most instalments a card is charged in, with no interest to the customer; 1 is in full only. */
  maxInstallments: number;
  /** Asaas's least charge, in whole cents: a closed total under it is not charged online. */
  minimumChargeCents: number;
  /** Asaas's least instalment on a card, in whole cents. */
  minimumInstallmentCents: number;
}

/**
 * `GET /stores/:slug/payment-options` (BEELINK-205): how a shop's checkout is paid. A shop with no
 * Asaas in good standing — never connected, disconnected, or to be reconnected — answers
 * `online: null` and `offline: true`, which is the checkout of before Asaas.
 */
export interface StorefrontPaymentOptions {
  /** Null when nothing is charged online: no connection in good standing, or Pix and card both off. */
  online: StorefrontOnlinePayments | null;
  /** Paying on delivery or at pickup, by the shop's own labels (`PublicStore.paymentMethods`). Always true while `online` is null. */
  offline: boolean;
}

/** The `details` of `ORDER_PAYMENT_BELOW_MINIMUM`: Asaas's least charge, and how many instalments this total splits into. */
export interface OrderPaymentBelowMinimumDetails {
  minimumCents: number;
  /** Zero when the order itself is under the minimum. */
  maxInstallments: number;
}

/** The error codes of an order's payment routes, beyond `ORDER_NOT_FOUND` and `ORDER_CANCELLED`. */
export type OrderPaymentErrorCode =
  /** The order is paid offline: there is nothing to charge. */
  | "PAYMENT_NOT_ONLINE"
  /** The delivery fee is not agreed yet: only a closed total is charged. */
  | "PAYMENT_AWAITING_TOTAL"
  | "PAYMENT_ALREADY_PAID"
  /** Another request is making this order's charge right now: read again in a moment. */
  | "PAYMENT_IN_PROGRESS"
  /** Under Asaas's least charge. */
  | "PAYMENT_BELOW_MINIMUM"
  /** The customer's record has no CPF. */
  | "PAYMENT_DOCUMENT_MISSING"
  /** Asaas refused to make the charge. The shop reads why; the customer never does. */
  | "PAYMENT_REFUSED"
  /** The shop cannot be paid online right now — Asaas did not answer, or the shop's account needs attention. */
  | "PAYMENT_UNAVAILABLE";

/**
 * `POST /stores/:slug/orders/:number/refunds` (BEELINK-208): money given back from the order, whole
 * or in part. Answers the order as it stands then.
 */
export interface RefundOrderPayload {
  /** Whole cents, at least 1, never more than what is left to refund. */
  amountCents: number;
  /** Why, 3 to 300 characters: kept on the refund, and sent to Asaas as its description. */
  reason: string;
  /**
   * What the screen showed as left to refund when it was sent. A refund made meanwhile — another
   * tab, a second click — changes it, and this one is refused with `REFUND_STALE` rather than made twice.
   */
  refundableCents: number;
  /** Money the order did not ask for, by its id, instead of the order's own payment. */
  strayId?: string;
}

/** The refund a cancellation of a paid order carries: all that is left, asked before the order is cancelled. */
export type OrderCancellationRefund = Pick<RefundOrderPayload, "reason" | "refundableCents">;

/** The error codes of a refund, beyond `ORDER_NOT_FOUND` and `PAYMENT_UNAVAILABLE`. */
export type OrderRefundErrorCode =
  /** The order holds no money to give back — never paid, paid offline, or all refunded. */
  | "REFUND_NOTHING_TO_REFUND"
  /** More than what is left. Its `details` are `OrderRefundExceedsDetails`. */
  | "REFUND_EXCEEDS"
  /** What is left to refund is not what the screen showed: read the order again. */
  | "REFUND_STALE"
  /** Another refund of this charge is being asked of Asaas, or was not answered yet. */
  | "REFUND_IN_PROGRESS"
  /** Asaas does not let this charge be refunded now: under review, already being refunded, or disputed. */
  | "REFUND_NOT_READY"
  /** The shop's Asaas account has not the balance to give it back. */
  | "REFUND_NO_BALANCE"
  /** Asaas refused it for another reason. Its `details` are `OrderRefundRefusedDetails`. */
  | "REFUND_REFUSED"
  /** Asaas did not answer, and reading the charge did not show the refund: it may still have been made. */
  | "REFUND_UNCONFIRMED";

export interface OrderRefundExceedsDetails {
  refundableCents: number;
}

export interface OrderRefundRefusedDetails {
  /** Asaas's own words, for the shop alone. */
  reason: string;
}
