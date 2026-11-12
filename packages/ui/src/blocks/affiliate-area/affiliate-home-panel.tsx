// Libs
import { InfoIcon } from "lucide-react"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { AffiliateHomeView } from "@harness-monorepo/ui/lib/affiliate-area"
import { AffiliateCopyLink } from "./affiliate-copy-link"

export interface AffiliateHomePanelProps {
  home: AffiliateHomeView
  /** Whether the link was just copied. */
  copied: boolean
  onCopy: (url: string) => void
  messages?: UiMessages
}

const CARD = "bg-shell-surface border-shell-border flex flex-col gap-1 rounded-xl border p-4 shadow-xs"

/**
 * The affiliate's front page at a shop (IMPULSEIA-108): what is owed now and what waits, the next
 * payment day, the link to share, and the last thirty days in four numbers.
 */
export function AffiliateHomePanel({ home, copied, onCopy, messages = defaultMessages }: AffiliateHomePanelProps) {
  const text = messages.affiliateArea.home

  return (
    <div className="flex flex-col gap-4">
      {home.notice ? (
        <p role="status" className="bg-muted flex items-start gap-2 rounded-lg px-3 py-2 text-sm">
          <InfoIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {home.notice}
        </p>
      ) : null}

      <dl className="grid gap-3 sm:grid-cols-3">
        <div className={CARD}>
          <dt className="text-muted-foreground text-sm">{text.available}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{home.available}</dd>
          <dd className={home.negativeNotice ? "text-destructive text-xs" : "text-muted-foreground text-xs"}>{home.negativeNotice ?? text.availableHelp}</dd>
        </div>
        <div className={CARD}>
          <dt className="text-muted-foreground text-sm">{text.pending}</dt>
          <dd className="text-2xl font-semibold tabular-nums">{home.pending}</dd>
          <dd className="text-muted-foreground text-xs">{text.pendingHelp}</dd>
        </div>
        <div className={CARD}>
          <dt className="text-muted-foreground text-sm">{text.next}</dt>
          <dd className="text-base font-semibold">{home.next ?? <span className="text-muted-foreground text-sm font-normal">{text.nextNone}</span>}</dd>
        </div>
      </dl>

      {home.link ? (
        <section aria-labelledby="affiliate-link-title" className={`${CARD} gap-3`}>
          <div className="flex flex-col gap-1">
            <h2 id="affiliate-link-title" className="font-medium">
              {text.link}
            </h2>
            <p className="text-muted-foreground text-sm">{text.linkHelp}</p>
          </div>
          <AffiliateCopyLink url={home.link} name={text.link} copied={copied} onCopy={onCopy} messages={messages} />
          <p className="text-muted-foreground text-xs">{home.table}</p>
        </section>
      ) : null}

      <section aria-labelledby="affiliate-numbers-title" className="flex flex-col gap-3">
        <h2 id="affiliate-numbers-title" className="font-medium">
          {home.numbers.title}
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              [text.visits, home.numbers.visits],
              [text.orders, home.numbers.orders],
              [text.sales, home.numbers.sales],
              [text.commission, home.numbers.commission],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className={CARD}>
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="text-xl font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
