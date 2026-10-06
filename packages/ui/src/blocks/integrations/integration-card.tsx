// React
import { useId } from "react"

// Libs
import { CheckIcon, TriangleAlertIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { IntegrationCardView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { IntegrationCardActions } from "./integration-card-actions"
import { IntegrationLogo } from "./integration-logo"
import { providerTextOf } from "./integration-providers"

export interface IntegrationCardProps {
  card: IntegrationCardView
  /** Reads this card's connection again, after a read that failed. */
  onRetry: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * A third party on the Integrations page: its own mark and name, what connecting gives, where the
 * shop stands with it, whose account is connected, and the way on.
 *
 * Who it is and what it gives are known before anything is read, so they are there from the first
 * paint: only where the connection stands waits, as grey shapes in its place. A read that failed is
 * said in this card alone, and is never drawn as a shop that connected nothing.
 */
export function IntegrationCard({ card, onRetry, linkComponent, messages = defaultMessages }: IntegrationCardProps) {
  const text = messages.integrations.cards
  const provider = providerTextOf(messages, card.provider)
  const id = useId()
  const { connection } = card
  const read = connection === "loading" || connection === "failed" ? null : connection
  const offered = read !== null && read.state !== "unavailable"

  return (
    <article aria-labelledby={`${id}-title`} aria-busy={connection === "loading" || undefined} className="bg-shell-surface border-shell-border flex h-full flex-col gap-4 rounded-xl border p-5 shadow-xs sm:p-6">
      <div className="flex items-center gap-4">
        <IntegrationLogo src={card.logoSrc} />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h2 id={`${id}-title`} className="text-base leading-tight font-semibold">
            {provider.title}
          </h2>
          {connection === "loading" ? (
            <Skeleton aria-hidden="true" className="h-5 w-24 rounded-full" />
          ) : offered ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {read.state === "connected" ? (
                <Badge variant="success">
                  <CheckIcon aria-hidden="true" />
                  {provider.connected}
                </Badge>
              ) : read.state === "needsReconnect" ? (
                <Badge variant="destructive">{provider.needsReconnectBadge}</Badge>
              ) : (
                <Badge variant="outline">{provider.disconnectedBadge}</Badge>
              )}
              {read.sandbox ? (
                <Badge variant="secondary" title={provider.sandboxHint}>
                  {provider.sandbox}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-muted-foreground text-sm">{provider.summary}</p>

      {connection === "failed" ? (
        <p role="alert" className="border-destructive/30 bg-destructive/10 rounded-lg border px-3 py-2 text-sm">
          {text.failed}
        </p>
      ) : read?.state === "unavailable" ? (
        <p className="bg-muted rounded-lg px-3 py-2 text-sm">{provider.unavailable}</p>
      ) : read?.state === "needsReconnect" ? (
        <div role="alert" className="border-destructive/30 bg-destructive/10 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm">
          <TriangleAlertIcon aria-hidden="true" className="text-destructive mt-0.5 size-4 shrink-0" />
          <span>{provider.needsReconnectCard}</span>
        </div>
      ) : null}
      {offered && read.account ? <p className="truncate text-sm font-medium">{format(text.account, { name: read.account })}</p> : null}

      {read?.state === "unavailable" ? null : (
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {connection === "loading" ? <Skeleton aria-hidden="true" className="h-8 w-28" /> : <IntegrationCardActions card={card} onRetry={onRetry} linkComponent={linkComponent} messages={messages} />}
        </div>
      )}
    </article>
  )
}
