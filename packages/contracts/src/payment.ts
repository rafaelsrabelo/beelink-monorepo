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
  refundedCents: number;
  /** ISO-8601: until when it is offered to be paid here — the end of its due day in Brasília. Null on a `FAILED` one, which never existed. */
  expiresAt: string | null;
  /** ISO-8601; null until paid. */
  paidAt: string | null;
}

/** What a list says of an order's charge. */
export type OrderPaymentBrief = Pick<OrderPayment, "status" | "expiresAt">;

/**
 * Why money that arrived at the shop's Asaas account is not the order's payment (BEELINK-206): the
 * order had been cancelled when it was paid, or it was already paid by another charge. bee-link
 * refunds nothing on its own — the shop decides (BEELINK-208).
 */
export type StrayPaymentReason = "ORDER_CANCELLED" | "ORDER_ALREADY_PAID";

/** A payment the order did not ask for, as the shop reads it. Whole cents. */
export interface StrayPayment {
  reason: StrayPaymentReason;
  method: OnlinePaymentMethod;
  amountCents: number;
  /** ISO-8601: when bee-link learned of it. */
  paidAt: string;
}

/** The charge as the shop reads it. */
export interface ShopOrderPayment extends OrderPayment {
  /** The status in Asaas's own word — `AWAITING_RISK_ANALYSIS`, `CHARGEBACK_REQUESTED`… — which says more than ours. */
  providerStatus: string | null;
  /** What Asaas last refused about it, in its words; null when it refused nothing. */
  lastError: string | null;
  /** Money the order did not ask for, the oldest first; empty on nearly every order. */
  strays: StrayPayment[];
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
