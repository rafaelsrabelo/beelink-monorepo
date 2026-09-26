// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { OrderDetailView } from "./order-types"

export interface OrderHistoryProps {
  events: OrderDetailView["events"]
  when: (iso: string) => string
  messages?: UiMessages
}

/** Every status the order had, when and by whom — oldest first, the way it happened. */
export function OrderHistory({ events, when, messages = defaultMessages }: OrderHistoryProps) {
  const text = messages.orders.detail

  return (
    <section aria-labelledby="order-history-title" className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
      <h2 id="order-history-title" className="font-semibold">
        {text.history}
      </h2>
      <ol className="flex flex-col gap-3">
        {events.map((event, index) => (
          <li key={`${event.at}-${index}`} className="border-border flex flex-col gap-0.5 border-l-2 pl-3">
            <span className="text-sm font-medium">{messages.orders.statuses[event.status]}</span>
            <span className="text-muted-foreground text-xs">
              <time dateTime={event.at}>{when(event.at)}</time> · {text.actors[event.actor]}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
