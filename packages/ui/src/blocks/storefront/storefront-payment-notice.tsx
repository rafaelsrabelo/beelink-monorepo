// Libs
import { BanIcon, CheckCircle2Icon, ClockIcon, RefreshCwIcon, Undo2Icon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

/**
 * Where a payment stands when there is no charge to show: none was made, the last one ended, it is
 * waiting on the shop, it is paid, it was given back, or it could not be read at all.
 */
export type StorefrontPaymentNoticeVariant =
  | "none"
  | "chargeCancelled"
  | "pixExpired"
  | "cardExpired"
  | "pixWaiting"
  | "awaitingTotal"
  | "paid"
  | "refunded"
  | "orderCancelled"
  | "unread"

export interface StorefrontPaymentNoticeProps {
  variant: StorefrontPaymentNoticeVariant
  /** The order's page: where the notices with nothing to do here lead. */
  orderHref: string
  /** Makes a charge — "Gerar pagamento", "Gerar novo Pix" — or, on `unread`, reads again. Absent, the notice offers no button. */
  onAction?: () => void
  /** The action is on its way: nothing is pressed twice. */
  pending?: boolean
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const PRIMARY = "flex h-11 items-center justify-center rounded-xl bg-shop-primary px-5 text-sm font-semibold text-shop-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"

/**
 * A payment with nothing to pay with right now, said in words and with the one thing to do about
 * it: make the charge, make a new Pix, read again — or go back to the order, when the wait is on
 * the shop or the matter is closed. "Pagamento aprovado" is one of these: it is what the screen
 * turns into, under the shopper's eyes, once the payment is confirmed.
 */
export function StorefrontPaymentNotice({ variant, orderHref, onAction, pending = false, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontPaymentNoticeProps) {
  const text = messages.storefront
  const words = {
    none: { icon: ClockIcon, title: text.paymentNoneTitle, body: text.paymentNoneBody, action: text.paymentCreate },
    chargeCancelled: { icon: ClockIcon, title: text.paymentCancelledTitle, body: text.paymentCancelledBody, action: text.paymentCreate },
    pixExpired: { icon: ClockIcon, title: text.paymentPixExpiredTitle, body: text.paymentPixExpiredBody, action: text.paymentPixRenew },
    cardExpired: { icon: ClockIcon, title: text.paymentCardExpiredTitle, body: text.paymentCardExpiredBody, action: text.paymentCreate },
    pixWaiting: { icon: ClockIcon, title: text.paymentPixWaitingTitle, body: text.paymentPixWaitingBody, action: null },
    awaitingTotal: { icon: ClockIcon, title: text.paymentAwaitingTotalTitle, body: text.paymentAwaitingTotalBody, action: null },
    paid: { icon: CheckCircle2Icon, title: text.paymentPaidTitle, body: text.paymentPaidBody, action: null },
    refunded: { icon: Undo2Icon, title: text.paymentRefundedTitle, body: text.paymentRefundedBody, action: null },
    orderCancelled: { icon: BanIcon, title: text.paymentOrderCancelledTitle, body: text.paymentOrderCancelledBody, action: null },
    unread: { icon: RefreshCwIcon, title: text.paymentUnreadTitle, body: text.paymentUnreadBody, action: text.paymentRetry },
  }[variant]
  const Icon = words.icon
  const acts = words.action !== null && onAction !== undefined

  return (
    // A status, so a screen reader hears the screen turn — a Pix into "Pagamento aprovado" — without being moved.
    <section role={variant === "unread" ? "alert" : "status"} className="flex flex-col items-center gap-3 rounded-2xl border border-shop-line bg-shop-background px-6 py-10 text-center">
      <Icon aria-hidden="true" className={variant === "paid" ? "size-10 text-shop-positive-ink" : "size-10 text-shop-muted"} strokeWidth={1.5} />
      <h2 className={variant === "paid" ? "text-xl font-extrabold text-shop-positive-ink" : "text-xl font-extrabold"}>{words.title}</h2>
      <p className="text-sm text-shop-muted">{words.body}</p>
      {acts ? (
        <button type="button" onClick={onAction} disabled={pending} aria-busy={pending || undefined} className={`${PRIMARY} mt-2`}>
          {pending && variant !== "unread" ? text.paymentCreating : words.action}
        </button>
      ) : (
        <Link href={orderHref} className={`${PRIMARY} mt-2`}>
          {text.paymentBack}
        </Link>
      )}
    </section>
  )
}
