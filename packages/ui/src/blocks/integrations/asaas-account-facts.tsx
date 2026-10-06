// Libs
import { TriangleAlertIcon } from "lucide-react"

// UI
import type { AsaasCardView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface AsaasAccountFactsProps {
  view: AsaasCardView
  messages?: UiMessages
}

/**
 * Whose Asaas account the shop connected — its name and its document, masked — and, while the
 * connection stands, where its payment notices are. A key Asaas stopped accepting says nothing of
 * the notices: mending the key registers them again.
 */
export function AsaasAccountFacts({ view, messages = defaultMessages }: AsaasAccountFactsProps) {
  const text = messages.integrations.asaas
  const troubled = view.webhook === "PAUSED" || view.webhook === "ERROR"

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1">
        <dt className="text-muted-foreground text-sm">{text.account}</dt>
        <dd className="text-sm font-medium">
          {view.account?.name}
          {view.account?.document ? <span className="text-muted-foreground block font-normal tabular-nums">{view.account.document}</span> : null}
        </dd>
      </div>
      {view.status === "CONNECTED" && view.webhook ? (
        <div className="flex flex-col gap-1">
          <dt className="text-muted-foreground text-sm">{text.webhook}</dt>
          <dd className="text-sm">
            <span className={cn("flex items-center gap-1.5 font-medium", troubled && "text-destructive")}>
              {troubled ? <TriangleAlertIcon aria-hidden="true" className="size-4 shrink-0" /> : null}
              {text.webhookStates[view.webhook]}
            </span>
            <span className="text-muted-foreground block">{text.webhookHints[view.webhook]}</span>
          </dd>
        </div>
      ) : null}
    </dl>
  )
}
