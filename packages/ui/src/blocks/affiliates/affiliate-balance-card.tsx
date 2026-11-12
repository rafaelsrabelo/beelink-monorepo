// React
import type { ReactNode } from "react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateBalanceView } from "@harness-monorepo/ui/lib/affiliate-money"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface AffiliateBalanceCardProps {
  balance: AffiliateBalanceView
  /** Their orders, on the orders list. */
  ordersHref: string
  onPay: () => void
  onAdjust: () => void
  /** The statement, under the balances. */
  children?: ReactNode
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * What the shop owes one affiliate (IMPULSEIA-107): available now — below zero is what the next
 * payment is short by — and pending; the ways to record a payment made outside and to adjust.
 */
export function AffiliateBalanceCard({ balance, ordersHref, onPay, onAdjust, children, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateBalanceCardProps) {
  const text = messages.affiliates.money

  return (
    <section aria-labelledby="affiliate-money-title" className="bg-shell-surface border-shell-border flex flex-col gap-5 rounded-xl border p-4 shadow-xs sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="affiliate-money-title" className="text-lg font-semibold">
          {text.title}
        </h2>
        <Link href={ordersHref} className="text-sm underline-offset-4 hover:underline">
          {text.orders}
        </Link>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-sm">{text.available}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{balance.available}</dd>
          {balance.negativeNotice ? <dd className="text-destructive text-xs">{balance.negativeNotice}</dd> : null}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-sm">{text.pending}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{balance.pending}</dd>
          <dd className="text-muted-foreground text-xs">{text.pendingHelp}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!balance.canPay} onClick={onPay}>
          {text.pay}
        </Button>
        <Button type="button" variant="outline" onClick={onAdjust}>
          {text.adjust}
        </Button>
      </div>

      {children}
    </section>
  )
}
