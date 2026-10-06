// UI
import type { IntegrationCardView, IntegrationProviderValue } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { IntegrationCard } from "./integration-card"

export interface IntegrationCardsProps {
  /** Every third party there is, connected or not, in the order the page shows them. */
  cards: readonly IntegrationCardView[]
  /** Reads one card's connection again; the others are left as they are. */
  onRetry: (provider: IntegrationProviderValue) => void
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The Integrations page: every third party a shop can connect, a card each, side by side where the
 * page is wide enough for two. Wide enough is asked of the page's own column and not of the window,
 * which the panel's rail narrows.
 */
export function IntegrationCards({ cards, onRetry, linkComponent, messages = defaultMessages }: IntegrationCardsProps) {
  return (
    <div className="@container">
      <ul className="grid gap-4 @2xl:grid-cols-2">
        {cards.map((card) => (
          <li key={card.provider}>
            <IntegrationCard card={card} onRetry={() => onRetry(card.provider)} linkComponent={linkComponent} messages={messages} />
          </li>
        ))}
      </ul>
    </div>
  )
}
