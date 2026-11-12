// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateOwedView as OwedView } from "@harness-monorepo/ui/lib/affiliate-money"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AffiliateOwedDays } from "./affiliate-owed-days"

export interface AffiliateOwedViewProps {
  owed: OwedView
  linkComponent?: LinkComponent
  messages?: UiMessages
}

const CARD = "bg-shell-surface border-shell-border flex flex-col gap-5 rounded-xl border p-4 shadow-xs sm:p-6"

/**
 * What the shop owes its affiliates, by due day (IMPULSEIA-107): the total, what fell due — overdue
 * first — and what will, what waits on a delivery, and each affiliate's part with the Pix key the
 * shop pays to. A payment is recorded on the affiliate's record.
 */
export function AffiliateOwedView({ owed, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateOwedViewProps) {
  const text = messages.affiliates.owed

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        {[
          [text.owed, owed.owed],
          [text.upcoming, owed.upcoming],
          [text.awaiting, owed.awaiting],
        ].map(([term, amount]) => (
          <div key={term} className="bg-shell-surface border-shell-border flex flex-col gap-1 rounded-xl border p-4 shadow-xs">
            <dt className="text-muted-foreground text-sm">{term}</dt>
            <dd className="text-2xl font-semibold tabular-nums">{amount}</dd>
          </div>
        ))}
      </dl>

      <section aria-label={text.due} className={CARD}>
        <AffiliateOwedDays title={text.due} days={owed.due} empty={text.dueEmpty} />
        {owed.undated ? (
          <p className="flex justify-between gap-3 border-t pt-3 text-sm">
            <span>{text.undated}</span>
            <span className="font-medium tabular-nums">{owed.undated}</span>
          </p>
        ) : null}
        <AffiliateOwedDays title={text.upcoming} days={owed.upcomingDays} empty={text.upcomingEmpty} />
      </section>

      <section aria-labelledby="affiliate-owed-people" className={CARD}>
        <h2 id="affiliate-owed-people" className="font-semibold">
          {text.byAffiliate}
        </h2>
        {owed.affiliates.length === 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{text.empty}</p>
            <p className="text-muted-foreground text-sm">{text.emptyHint}</p>
          </div>
        ) : (
          <ul className="divide-border flex flex-col divide-y">
            {owed.affiliates.map((row) => (
              <li key={row.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={row.href} aria-label={format(text.pay, { name: row.name })} className="text-sm font-medium underline-offset-4 hover:underline">
                      {row.name}
                    </Link>
                    {row.overdue ? <Badge variant="destructive">{text.states.OVERDUE}</Badge> : null}
                  </div>
                  <span className="text-muted-foreground text-xs break-all">
                    {text.pixKey}: {row.pixKey ?? text.none}
                  </span>
                </div>
                <dl className="flex gap-6 text-sm">
                  <div className="flex flex-col items-end">
                    <dt className="text-muted-foreground text-xs">{text.available}</dt>
                    <dd className={cn("font-medium tabular-nums", row.short ? "text-destructive" : "")}>{row.available}</dd>
                  </div>
                  <div className="flex flex-col items-end">
                    <dt className="text-muted-foreground text-xs">{text.pending}</dt>
                    <dd className="tabular-nums">{row.pending}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
