// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Button } from "@harness-monorepo/ui/components/button"

// Block
import type { OrderAffiliateView } from "@harness-monorepo/ui/lib/affiliate-money"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"

export interface OrderAffiliateCardProps {
  view: OrderAffiliateView
  /** Opens the change; offered only when the view says it can change. */
  onChange?: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * Whom an order is credited to (IMPULSEIA-107), in the order's side column: the affiliate, the
 * commission and where it stands, money given back that it did not follow, and every change of it.
 */
export function OrderAffiliateCard({ view, onChange, linkComponent: Link = AnchorLink, messages = defaultMessages }: OrderAffiliateCardProps) {
  const text = messages.affiliates.order
  const { affiliate, commission } = view

  return (
    <section aria-labelledby="order-affiliate-title" className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
      <h2 id="order-affiliate-title" className="font-semibold">
        {text.title}
      </h2>

      {affiliate ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link href={affiliate.href} aria-label={format(text.open, { name: affiliate.name })} className="text-sm font-medium underline-offset-4 hover:underline">
            {affiliate.name}
          </Link>
          {affiliate.standing ? <Badge variant="outline">{affiliate.standing}</Badge> : null}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{text.none}</p>
      )}

      {commission ? (
        <div className="flex flex-col gap-1 text-sm">
          <p className="flex items-baseline justify-between gap-3">
            <span className="text-muted-foreground">{text.commission}</span>
            <span className={commission.reversed ? "text-muted-foreground font-medium tabular-nums line-through" : "font-medium tabular-nums"}>{commission.amount}</span>
          </p>
          <p className="text-muted-foreground text-xs">{commission.detail}</p>
          <p className="text-xs">{commission.state}</p>
          {commission.ownPurchase ? <p className="text-muted-foreground text-xs">{commission.ownPurchase}</p> : null}
        </div>
      ) : null}

      {view.refundNotice ? (
        <p role="note" className="bg-muted rounded-md p-2 text-xs">
          {view.refundNotice}
        </p>
      ) : null}
      {view.lockedHint ? <p className="text-muted-foreground text-xs">{view.lockedHint}</p> : null}

      {view.action && onChange ? (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={onChange}>
          {view.action}
        </Button>
      ) : null}

      {view.changes.length ? (
        <div className="flex flex-col gap-1.5 border-t pt-3">
          <h3 className="text-muted-foreground text-xs font-medium">{text.history}</h3>
          <ol className="flex flex-col gap-1.5">
            {view.changes.map((change) => (
              <li key={change.key} className="flex flex-col text-xs">
                <span>
                  <span className="text-muted-foreground">{change.at} · </span>
                  {change.text}
                </span>
                <span className="text-muted-foreground">{change.reason}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </section>
  )
}
