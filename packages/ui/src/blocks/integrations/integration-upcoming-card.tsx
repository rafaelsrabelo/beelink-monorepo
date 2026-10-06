// React
import { useId } from "react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import type { UpcomingIntegrationValue, UpcomingIntegrationView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { IntegrationLogo } from "./integration-logo"

export interface IntegrationUpcomingCardProps {
  item: UpcomingIntegrationView
  messages?: UiMessages
}

/**
 * Something on its way, announced among the Integrations page's cards: its mark, its name, what it
 * will do, and that it is coming. Drawn as its neighbours are, so it reads as one of them to come and
 * not as one that broke — and it holds no link and no button, since there is nowhere yet to lead.
 * A disabled button would still be a stop for the keyboard with nothing behind it.
 */
export function IntegrationUpcomingCard({ item, messages = defaultMessages }: IntegrationUpcomingCardProps) {
  const text = messages.integrations.upcoming
  const products: Record<UpcomingIntegrationValue, { title: string; summary: string }> = { BEEFLOW: text.beeflow }
  const product = products[item.product]
  const id = useId()

  return (
    <article aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex h-full flex-col gap-4 rounded-xl border p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-4">
        <IntegrationLogo src={item.logoSrc} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id={`${id}-title`} className="text-base leading-tight font-semibold">
            {product.title}
          </h2>
          <Badge variant="outline">{text.badge}</Badge>
        </div>
      </div>

      <p className="text-muted-foreground text-sm">{product.summary}</p>

      {/* As tall as its neighbours' button, so the three cards end on one line. */}
      <p className="text-muted-foreground mt-auto flex min-h-8 items-center pt-1 text-sm">{text.note}</p>
    </article>
  )
}
