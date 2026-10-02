// React
import { useId } from "react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { CashbackOwedView } from "@harness-monorepo/ui/lib/cashback"

export interface CashbackOwedProps {
  owed: CashbackOwedView
  money: (cents: number) => string
  messages?: UiMessages
}

/**
 * What the shop owes its customers in credit (BEELINK-242): what they can spend now, what waits on
 * orders still to be delivered, and how much of it expires soon. Each figure is the API's, so this
 * and the customers' records never disagree.
 */
export function CashbackOwed({ owed, money, messages = defaultMessages }: CashbackOwedProps) {
  const text = messages.cashback.owed
  const titleId = useId()
  const figures = [
    { label: text.available, value: owed.availableCents, help: text.availableHelp },
    { label: text.pending, value: owed.pendingCents, help: text.pendingHelp },
    { label: format(text.expiringSoon, { days: String(owed.expiringSoonDays) }), value: owed.expiringSoonCents, help: null },
  ]

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3">
      <h2 id={titleId} className="font-semibold">
        {text.title}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        {figures.map((figure) => (
          <div key={figure.label} className="bg-shell-surface border-shell-border flex flex-col gap-1 rounded-xl border p-4 shadow-xs">
            <dt className="text-muted-foreground text-xs">{figure.label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{money(figure.value)}</dd>
            {figure.help ? <dd className="text-muted-foreground text-xs">{figure.help}</dd> : null}
          </div>
        ))}
      </dl>
    </section>
  )
}
