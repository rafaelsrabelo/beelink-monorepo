// Libs
import { CircleAlertIcon, CircleCheckIcon } from "lucide-react"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StorefrontReorderNoticeProps {
  number: number
  /** What came of it: in the cart, nothing on sale any more, or the order could not be read. */
  outcome: "added" | "none" | "failed"
  /** Each line that stayed out or went in with fewer, already in words: "Whey (Sabor: Uva) — esgotado". */
  left: readonly string[]
  /** Part of the order did not fit the cart's own limits. */
  trimmed?: boolean
  messages?: UiMessages
}

/**
 * Over the cart after "Comprar de novo": which order the lines came from, and what stayed out and
 * why — a line that vanished without a word would read as the cart losing it.
 */
export function StorefrontReorderNotice({ number, outcome, left, trimmed = false, messages = defaultMessages }: StorefrontReorderNoticeProps) {
  const text = messages.storefront
  const words = { added: text.reorderDone, none: text.reorderNone, failed: text.reorderFailed }[outcome]
  const Icon = outcome === "added" ? CircleCheckIcon : CircleAlertIcon

  return (
    <div role="status" className="flex flex-col gap-2 rounded-xl bg-shop-fill px-4 py-3 text-sm text-shop-on-background">
      <p className="flex items-start gap-2 font-semibold">
        <Icon aria-hidden="true" className={outcome === "added" ? "mt-0.5 size-4 shrink-0 text-shop-positive-ink" : "mt-0.5 size-4 shrink-0 text-shop-muted"} />
        {format(words, { number: String(number) })}
      </p>
      {trimmed ? <p className="pl-6 text-shop-muted">{text.reorderTrimmed}</p> : null}
      {left.length ? (
        <div className="flex flex-col gap-1 pl-6">
          <p className="text-shop-muted">{text.reorderLeft}</p>
          <ul className="flex list-disc flex-col gap-0.5 pl-4">
            {left.map((line, index) => (
              // By position: two lines of an order can read alike.
              <li key={index}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
