// Libs
import { CircleCheckIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontOrderCancelledNoticeProps {
  /** The order just cancelled; null says nothing, and the region waits for the next one. */
  number: number | null
  /** Where focus lands after a cancel — the card may leave the tab shown, and this line stays — found by this id. */
  id?: string
  messages?: UiMessages
}

/**
 * "Pedido nº 14 cancelado.", over the list. On the tab of orders on their way the cancelled order
 * leaves the list, so without this line nothing would say the cancel went through.
 */
export function StorefrontOrderCancelledNotice({ number, id, messages = defaultMessages }: StorefrontOrderCancelledNoticeProps) {
  const text = messages.storefront

  return (
    <div
      id={id}
      role="status"
      tabIndex={-1}
      className={
        number === null
          ? "sr-only"
          : "flex items-center gap-2 rounded-xl bg-shop-fill px-4 py-3 text-sm font-semibold text-shop-on-background outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-shop-primary-ink"
      }
    >
      {number === null ? null : (
        <>
          <CircleCheckIcon aria-hidden="true" className="size-4 shrink-0 text-shop-positive-ink" />
          {format(text.orderCancelledNotice, { number: String(number) })}
        </>
      )}
    </div>
  )
}
