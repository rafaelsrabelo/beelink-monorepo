// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateOrderView, AffiliatePagerView } from "@harness-monorepo/ui/lib/affiliate-area"
import { AffiliateAreaPager } from "./affiliate-area-pager"

export interface AffiliateOrdersListProps {
  orders: readonly AffiliateOrderView[]
  pager: AffiliatePagerView
  onPage: (page: number) => void
  messages?: UiMessages
}

/** The orders credited to the affiliate (IMPULSEIA-108): who bought by name, what, and the commission's state. */
export function AffiliateOrdersList({ orders, pager, onPage, messages = defaultMessages }: AffiliateOrdersListProps) {
  const text = messages.affiliateArea.orders

  return (
    <section aria-labelledby="affiliate-orders-title" className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id="affiliate-orders-title" className="text-lg font-semibold">
          {text.title}
        </h2>
        <p className="text-muted-foreground text-sm">{text.intro}</p>
      </header>

      {orders.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">{text.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.key} className="bg-shell-surface border-shell-border flex flex-col gap-2 rounded-xl border p-4 shadow-xs">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">
                  {order.number} · {order.customer}
                </span>
                <span className="text-muted-foreground text-xs">
                  {order.date} · {order.status}
                </span>
              </div>
              <ul className="text-muted-foreground text-sm">
                {order.items.map((item, index) => (
                  <li key={`${order.key}-${index}`}>{item}</li>
                ))}
              </ul>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-t pt-2">
                <span className="text-muted-foreground text-xs">
                  {order.base} · {order.state}
                </span>
                <span className={cn("font-semibold tabular-nums", order.void ? "text-muted-foreground line-through" : "")}>{order.commission}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AffiliateAreaPager pager={pager} label={text.title} onPage={onPage} messages={messages} />
    </section>
  )
}
