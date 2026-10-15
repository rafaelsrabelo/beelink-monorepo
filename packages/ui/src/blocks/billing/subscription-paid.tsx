"use client"

// React
import { useId } from "react"

// Libs
import { ExternalLinkIcon } from "lucide-react"

// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"
import { planMoney } from "@harness-monorepo/ui/lib/plan-figures"
import type { SubscriptionPaidView } from "@harness-monorepo/ui/lib/subscription"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface SubscriptionPaidProps {
  view: SubscriptionPaidView
  locale: string
  /** The page's panel: the way back from here. */
  panelHref: string
  /** The renewal's invoice was opened. */
  onOpenRenewal?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A page whose paid period is running, as the Assinar screen shows it (BEELINK-293): nothing to buy.
 * The plan and its cycle, the last day paid for, and how the next one is paid — a credit card renews
 * by itself; anything else is a new invoice, whose link is here once Asaas made it. The card is
 * named by its brand and last four digits, which is all bee-link keeps of it.
 */
export function SubscriptionPaid({ view, locale, panelHref, onOpenRenewal, linkComponent: Link = AnchorLink, messages = defaultMessages }: SubscriptionPaidProps) {
  const text = messages.subscription
  const id = useId()
  // Only a credit card is kept at Asaas and charged again: a debit card, a Pix and a boleto are each a new invoice.
  const renewal = view.method === "CREDIT_CARD" ? text.paid.renewsByCard : view.method ? text.paid.renewsByInvoice : null

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <h2 id={`${id}-title`} className="text-lg font-semibold">
        {text.paid.title}
      </h2>
      <dl className="grid gap-4 sm:grid-cols-3">
        {view.cycle && view.priceCents !== null ? (
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">{text.paid.planLabel}</dt>
            <dd className="text-sm font-medium">{format(text.paid.plan, { cycle: text.cycles.names[view.cycle], amount: planMoney(view.priceCents, locale) })}</dd>
          </div>
        ) : null}
        {view.paidUntil ? (
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">{text.paid.untilLabel}</dt>
            <dd className="text-sm font-medium tabular-nums">{view.paidUntil}</dd>
          </div>
        ) : null}
        {view.method ? (
          <div className="flex flex-col gap-1">
            <dt className="text-muted-foreground text-sm">{text.paid.methodLabel}</dt>
            <dd className="text-sm font-medium">
              {view.card ? format(text.paid.card, { brand: view.card.brand, last4: view.card.last4 }) : text.paid.methods[view.method]}
            </dd>
          </div>
        ) : null}
      </dl>
      {renewal ? <p className="text-muted-foreground text-sm">{renewal}</p> : null}
      {view.renewalInvoiceUrl ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">{text.paid.renewalOut}</p>
          <a href={view.renewalInvoiceUrl} target="_blank" rel="noopener noreferrer" onClick={onOpenRenewal} className={buttonVariants({ variant: "outline" })}>
            {text.paid.payRenewal}
            <ExternalLinkIcon aria-hidden="true" />{" "}
            <span className="sr-only">{text.newTab}</span>
          </a>
        </div>
      ) : null}
      <Link href={panelHref} className={cn(buttonVariants({ variant: "link" }), "w-fit px-0")}>
        {text.paid.back}
      </Link>
    </section>
  )
}
