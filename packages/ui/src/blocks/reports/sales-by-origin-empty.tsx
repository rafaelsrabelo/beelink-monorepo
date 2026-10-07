// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ExampleLink } from "./example-link"

export interface SalesByOriginEmptyProps {
  /** A link to the shop's own address with the three campaign labels on it. The screen builds it. */
  exampleUrl: string
  messages?: UiMessages
}

/**
 * A period with no sale (BEELINK-275). Says so, and says how a sale comes to have an origin — the
 * one thing a shopkeeper who expected a campaign here can act on — with a link they can copy.
 */
export function SalesByOriginEmpty({ exampleUrl, messages = defaultMessages }: SalesByOriginEmptyProps) {
  const text = messages.reports.salesByOrigin.empty

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
      <p className="font-medium">{text.title}</p>
      <p className="text-muted-foreground max-w-xl text-sm">{text.text}</p>
      <ExampleLink url={exampleUrl} label={text.exampleLabel} />
    </div>
  )
}
