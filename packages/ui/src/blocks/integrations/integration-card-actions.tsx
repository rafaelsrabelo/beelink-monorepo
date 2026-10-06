// UI
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import type { IntegrationCardView } from "@harness-monorepo/ui/lib/integrations"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { providerTextOf } from "./integration-providers"

export interface IntegrationCardActionsProps {
  card: IntegrationCardView
  /** Reads this card's connection again, after a read that failed. */
  onRetry: () => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * What a card on the Integrations page offers to do, by where its connection stands: connect, set
 * up, connect again, or read again. Each is written short and read out with the provider's name,
 * since several cards share the page.
 *
 * Where connecting begins an authorization at the third party it is a plain anchor, never the app's
 * link: a router link prefetches its address, and that address begins the authorization the moment
 * it is fetched. Where it is only the integration's own page, it is the app's link like any other.
 */
export function IntegrationCardActions({ card, onRetry, linkComponent: Link = AnchorLink, messages = defaultMessages }: IntegrationCardActionsProps) {
  const text = messages.integrations.cards
  const provider = providerTextOf(messages, card.provider)
  const { connection } = card

  if (connection === "loading" || (connection !== "failed" && connection.state === "unavailable")) return null
  if (connection === "failed") {
    return (
      <Button type="button" variant="outline" aria-label={format(text.retryLabel, { name: provider.title })} onClick={onRetry}>
        {messages.integrations.retry}
      </Button>
    )
  }

  const configure = (
    // Through `cn`, as `Button` does: raw, the base's transparent border outranks the outline's.
    <Link href={card.href} aria-label={format(text.configureLabel, { name: provider.title })} className={cn(buttonVariants({ variant: "outline" }))}>
      {text.configure}
    </Link>
  )
  if (connection.state === "connected") return configure

  const mending = connection.state === "needsReconnect"
  const wayIn = { "aria-label": mending ? format(text.reconnectLabel, { name: provider.title }) : provider.connect, className: cn(buttonVariants()), children: mending ? text.reconnect : text.connect }

  return (
    <>
      {card.connectBy === "authorization" ? <a href={card.connectHref} {...wayIn} /> : <Link href={card.connectHref} {...wayIn} />}
      {/* Its own page stays within reach of one to mend — it is where it is disconnected — unless mending already leads there. */}
      {mending && card.connectHref !== card.href ? configure : null}
    </>
  )
}
