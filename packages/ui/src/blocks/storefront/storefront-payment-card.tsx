// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontPaymentCardProps {
  /** What is charged, already written: "R$ 239,70". */
  amount: string
  /** How it is split, already written: "À vista", "3x de R$ 79,90 sem juros". */
  installments: string
  /** Asaas's hosted invoice: the card is typed there, never here. */
  invoiceUrl: string
  /** Until when it is paid, already written. */
  validUntil: string
  messages?: UiMessages
}

/**
 * A credit card to be paid: the amount, how it is split, and the door to Asaas's own page, in a new
 * tab so this one stays — it is here the confirmation shows. The card's number never crosses the shop.
 */
export function StorefrontPaymentCard({ amount, installments, invoiceUrl, validUntil, messages = defaultMessages }: StorefrontPaymentCardProps) {
  const text = messages.storefront
  const id = useId()

  return (
    <section aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-2xl border border-shop-line bg-shop-background p-5 shop-md:p-7">
      <h2 id={`${id}-title`} className="text-[17px] font-extrabold">
        {text.paymentCardTitle}
      </h2>
      <dl className="flex flex-col gap-1">
        <div className="flex items-baseline gap-3">
          <dt className="text-sm text-shop-muted">{text.paymentAmount}</dt>
          <dd className="ml-auto text-2xl font-extrabold">{amount}</dd>
        </div>
        <div className="flex items-baseline gap-3 text-sm">
          <dt className="text-shop-muted">{text.checkoutInstallments}</dt>
          <dd className="ml-auto font-semibold">{installments}</dd>
        </div>
      </dl>
      <p className="text-sm text-shop-muted">{text.paymentCardBody}</p>
      <a
        href={invoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-shop-primary text-base font-semibold text-shop-on-primary transition-opacity hover:opacity-90"
      >
        <span>
          {text.paymentCardOpen}{" "}
          <span className="sr-only">{text.paymentNewTab}</span>
        </span>
        <ExternalLinkIcon aria-hidden="true" className="size-4" />
      </a>
      <p className="text-sm font-semibold">{format(text.paymentValidUntil, { date: validUntil })}</p>
    </section>
  )
}
