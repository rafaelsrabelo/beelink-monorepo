// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontOrderPaymentRow {
  label: string
  value: string
  /** A saving: the free delivery, the discount. */
  positive?: boolean
}

export interface StorefrontOrderPaymentProps {
  /** Subtotal, delivery, discount — only the ones that apply, already in words. */
  rows: readonly StorefrontOrderPaymentRow[]
  total: string
  /** How it was agreed, as a label: the shop charges, never the platform, so nothing is ever "approved". */
  method: string
  messages?: UiMessages
}

/** What the order cost (6e): the sums, the total, and the way of paying agreed with the shop. */
export function StorefrontOrderPayment({ rows, total, method, messages = defaultMessages }: StorefrontOrderPaymentProps) {
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
    </section>
  )
}
