// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface StorefrontOrderPaymentRow {
  label: string
  value: string
  /** A saving: the free delivery, the discount. */
  positive?: boolean
}

/** Where an order's online payment stands, in words: waiting, approved, or ended some other way. */
export interface StorefrontOrderPaymentStatus {
  label: string
  tone: "wait" | "done" | "stop"
}

export const PAYMENT_STATUS_TONE = { wait: "text-shop-on-background", done: "text-shop-positive-ink", stop: "text-shop-muted" } as const

export interface StorefrontOrderPaymentProps {
  /** Subtotal, delivery, discount — only the ones that apply, already in words. */
  rows: readonly StorefrontOrderPaymentRow[]
  total: string
  /** How it is paid: a label agreed with the shop, or the way it is charged online. */
  method: string
  /** Where an online payment stands (BEELINK-205); absent on an order settled with the shop, which is never "approved" here. */
  status?: StorefrontOrderPaymentStatus | null
  /** The payment screen, while there is something to pay: "Pagar agora". */
  payHref?: string | null
  /** What the order earns in cashback and where that credit stands (BEELINK-243), in words; none, and nothing is said. */
  cashback?: string | null
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * What the order cost (6e): the sums, the total, how it is paid and the cashback it earns. An order
 * charged online says where its payment stands, and leads to it while there is something to pay.
 */
export function StorefrontOrderPayment({ rows, total, method, status = null, payHref = null, cashback = null, linkComponent: Link = AnchorLink, messages = defaultMessages }: StorefrontOrderPaymentProps) {
  const text = messages.storefront

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-shop-line bg-shop-background p-5 text-sm text-shop-on-background">
      <h2 className="mb-1 text-[17px] font-extrabold">{text.orderPaymentTitle}</h2>
      <dl className="flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="flex gap-3">
            <dt>{row.label}</dt>
            <dd className={cn("ml-auto", row.positive && "font-bold text-shop-positive-ink")}>{row.value}</dd>
          </div>
        ))}
        <div className="flex gap-3 border-t border-shop-line pt-2 text-base font-extrabold">
          <dt>{text.orderTotalRow}</dt>
          <dd className="ml-auto">{total}</dd>
        </div>
      </dl>
      <p className="text-[13px] text-shop-muted">{method}</p>
      {status ? <p className={cn("text-sm font-bold", PAYMENT_STATUS_TONE[status.tone])}>{status.label}</p> : null}
      {payHref ? (
        <Link href={payHref} className="mt-1 flex h-11 items-center justify-center rounded-xl bg-shop-primary px-4 text-sm font-bold text-shop-on-primary hover:opacity-90">
          {text.orderPayNow}
        </Link>
      ) : null}
      {cashback ? <p className="text-[13px] font-semibold text-shop-positive-ink">{cashback}</p> : null}
    </section>
  )
}
