// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliatePagerView, AffiliatePayoutView } from "@harness-monorepo/ui/lib/affiliate-area"
import { AffiliateAreaPager } from "./affiliate-area-pager"

export interface AffiliatePayoutsListProps {
  payouts: readonly AffiliatePayoutView[]
  pager: AffiliatePagerView
  onPage: (page: number) => void
  messages?: UiMessages
}

/** The payments the shop registered for the affiliate (IMPULSEIA-108), made outside bee-link. */
export function AffiliatePayoutsList({ payouts, pager, onPage, messages = defaultMessages }: AffiliatePayoutsListProps) {
  const text = messages.affiliateArea.payouts

  return (
    <section aria-labelledby="affiliate-payouts-title" className="flex flex-col gap-3">
      <h2 id="affiliate-payouts-title" className="font-medium">
        {text.title}
      </h2>
      {payouts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{text.empty}</p>
      ) : (
        <ul className="divide-border flex flex-col divide-y">
          {payouts.map((payout) => (
            <li key={payout.id} className="flex items-start justify-between gap-4 py-2.5">
              <div className="flex min-w-0 flex-col">
                <span className="text-sm">{payout.detail}</span>
                {payout.note ? <span className="text-muted-foreground text-xs">{payout.note}</span> : null}
              </div>
              <span className="shrink-0 text-sm font-medium tabular-nums">{payout.amount}</span>
            </li>
          ))}
        </ul>
      )}
      <AffiliateAreaPager pager={pager} label={text.title} onPage={onPage} messages={messages} />
    </section>
  )
}
