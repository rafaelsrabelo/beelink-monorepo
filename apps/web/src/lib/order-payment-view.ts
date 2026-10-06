// Types
import type { CustomerOrderPayment } from "@harness-monorepo/contracts"
import type { StorefrontPaymentNoticeVariant } from "@harness-monorepo/ui/blocks/storefront/storefront-payment-notice"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { format } from "@harness-monorepo/ui/locales/index"

/** What the screen needs of the order besides its charge. */
export interface PaymentOrderFacts {
  cancelled: boolean
  /** A delivery whose fee is not agreed: only a closed total is charged. */
  awaitingTotal: boolean
}

/** The payment screen, as one state: a Pix to pay, a card to pay, or a notice of why there is neither. */
export type PaymentScreen =
  | { kind: "pix"; amountCents: number; image: string; payload: string; expiresAt: string }
  | { kind: "card"; amountCents: number; installments: number; invoiceUrl: string; expiresAt: string }
  | { kind: "notice"; variant: Exclude<StorefrontPaymentNoticeVariant, "unread">; /** A charge can be made from here. */ acts: boolean }

const notice = (variant: Exclude<StorefrontPaymentNoticeVariant, "unread">, acts = false): PaymentScreen => ({ kind: "notice", variant, acts })

/**
 * What the payment screen shows (BEELINK-205), from the charge as the bee-link API tells it and
 * never from anything the browser saw at Asaas: paid is what the API says is paid.
 *
 * Money first — a charge paid or given back says so whatever became of the order. Then the order: a
 * cancelled one has nothing to pay, and one whose fee is not agreed waits on the shop. Then the
 * charge: none (or one Asaas refused, or one removed) offers to make one; one past its time offers
 * another; a Pix whose code Asaas has not handed over yet waits for it.
 */
export function paymentScreenOf(payment: CustomerOrderPayment | null, order: PaymentOrderFacts, now: Date): PaymentScreen {
  if (payment?.status === "CONFIRMED" || payment?.status === "RECEIVED") return notice("paid")
  if (payment?.status === "REFUNDED" || payment?.status === "PARTIALLY_REFUNDED") return notice("refunded")
  if (order.cancelled) return notice("orderCancelled")
  if (order.awaitingTotal) return notice("awaitingTotal")
  if (!payment || payment.status === "FAILED") return notice("none", true)
  if (payment.status === "CANCELLED") return notice("chargeCancelled", true)

  const expired = payment.status === "OVERDUE" || payment.expiresAt === null || new Date(payment.expiresAt) <= now
  if (payment.method === "PIX") {
    if (expired) return notice("pixExpired", true)
    if (!payment.pix || new Date(payment.pix.expiresAt) <= now) return payment.pix ? notice("pixExpired", true) : notice("pixWaiting")
    return { kind: "pix", amountCents: payment.amountCents, image: payment.pix.image, payload: payment.pix.payload, expiresAt: payment.pix.expiresAt }
  }
  if (expired || !payment.invoiceUrl || payment.expiresAt === null) return notice("cardExpired", true)
  return { kind: "card", amountCents: payment.amountCents, installments: payment.installments, invoiceUrl: payment.invoiceUrl, expiresAt: payment.expiresAt }
}

/** How often the screen reads the charge again while it waits for money. */
export const PAYMENT_POLL_MS = 5_000
/** Slower while a Pix's code has not come: each of those reads asks Asaas for it again. */
export const PIX_CODE_POLL_MS = 15_000

/**
 * How long until the charge is read again, or false when nothing will change by itself: the screen
 * asks only while it shows something a payment — or Asaas handing over a code — would change.
 */
export function paymentPollMsOf(screen: PaymentScreen): number | false {
  if (screen.kind !== "notice") return PAYMENT_POLL_MS
  return screen.variant === "pixWaiting" ? PIX_CODE_POLL_MS : false
}

/** How a card's charge is split, in words: in full, or each instalment at its amount — rounded down, as Asaas leaves the rest on the last. */
export function paymentInstallmentsText(amountCents: number, installments: number, money: (cents: number) => string, text: UiMessages["storefront"]): string {
  return installments <= 1 ? text.paymentInstallmentsFull : format(text.paymentInstallments, { count: String(installments), amount: money(Math.floor(amountCents / installments)) })
}

/** Until when a charge is paid, as the screen writes it: "7 de out., 23:59", in Brasília's time. */
export function paymentDeadlineOf(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso))
}
