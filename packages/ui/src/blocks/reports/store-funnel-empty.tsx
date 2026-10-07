// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface StoreFunnelEmptyProps {
  messages?: UiMessages
}

/**
 * A period in which the shop window counted nothing (BEELINK-276). Says so, and the one thing that
 * most often explains it to a shopkeeper who just opened their own shop to try: their visits, with
 * the panel open, do not count.
 */
export function StoreFunnelEmpty({ messages = defaultMessages }: StoreFunnelEmptyProps) {
  const text = messages.reports.funnel.empty

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
      <p className="font-medium">{text.title}</p>
      <p className="text-muted-foreground max-w-xl text-sm">{text.text}</p>
    </div>
  )
}
