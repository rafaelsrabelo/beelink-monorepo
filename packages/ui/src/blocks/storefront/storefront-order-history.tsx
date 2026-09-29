// UI
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontOrderHistoryEvent {
  /** "28 de set."; the block formats nothing. */
  day: string
  time: string
  title: string
  detail: string | null
}

export interface StorefrontOrderHistoryProps {
  /** Most recent first: what happened last is what the shopper came to read. */
  events: readonly StorefrontOrderHistoryEvent[]
  messages?: UiMessages
}

/** Every change of the order with its day and time (6e), the latest marked, on a line down the side. */
export function StorefrontOrderHistory({ events, messages = defaultMessages }: StorefrontOrderHistoryProps) {
  const text = messages.storefront

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-shop-line bg-shop-background p-5 text-shop-on-background shop-md:p-6">
      <h2 className="text-lg font-extrabold shop-md:text-xl">{text.orderHistory}</h2>
      <ol className="flex flex-col">
        {events.map((event, index) => (
          <li key={`${event.day}-${event.time}-${event.title}`} className="group flex gap-4">
            <span className="flex w-[84px] shrink-0 flex-col text-[13px] text-shop-muted">
              <b className="font-bold text-shop-on-background">{event.day}</b>
              {event.time}
            </span>
            <span aria-hidden="true" className="flex shrink-0 flex-col items-center">
              <span className={cn("mt-[3px] size-3.5 shrink-0 rounded-full", index === 0 ? "bg-shop-positive" : "border-2 border-shop-line-strong bg-shop-background")} />
              <span className="w-0.5 grow bg-shop-line group-last:hidden" />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5 pb-5 group-last:pb-0">
              <span className="text-[15px] font-bold">{event.title}</span>
              {event.detail ? <span className="text-[13px] text-shop-muted">{event.detail}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
