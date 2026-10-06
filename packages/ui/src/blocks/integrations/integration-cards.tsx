// UI
import type { IntegrationCardView, IntegrationProviderValue, UpcomingIntegrationView } from "@harness-monorepo/ui/lib/integrations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { LinkComponent } from "../auth/auth-link"
import { IntegrationCard } from "./integration-card"
import { IntegrationUpcomingCard } from "./integration-upcoming-card"

export interface IntegrationCardsProps {
  /** Every third party there is, connected or not, in the order the page shows them. */
  cards: readonly IntegrationCardView[]
  /** Reads one card's connection again; the others are left as they are. */
  onRetry: (provider: IntegrationProviderValue) => void
  /** What is on its way, announced after what there is: a card each, with nothing to press. */
  upcoming?: readonly UpcomingIntegrationView[]
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The Integrations page: every third party a shop can connect, a card each, then what is on its way.
 * Two abreast, and three where the page is wide enough, so three cards never leave one alone under
 * two. Wide enough is asked of the page's own column and not of the window, which the panel's rail
 * narrows.
 */
export function IntegrationCards({ cards, onRetry, upcoming = [], linkComponent, messages = defaultMessages }: IntegrationCardsProps) {
  return (
    <div className="@container">
      <ul className="grid gap-4 @2xl:grid-cols-2 @4xl:grid-cols-3">
        {cards.map((card) => (
          <li key={card.provider}>
            <IntegrationCard card={card} onRetry={() => onRetry(card.provider)} linkComponent={linkComponent} messages={messages} />
          </li>
        ))}
        {upcoming.map((item) => (
          <li key={item.product}>
            <IntegrationUpcomingCard item={item} messages={messages} />
          </li>
        ))}
      </ul>
    </div>
  )
}
