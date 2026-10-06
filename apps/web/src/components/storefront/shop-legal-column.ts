// React
import { createElement } from "react"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"
import type { StorefrontFooterColumn } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { StorefrontConsentReopen } from "./storefront-consent-reopen"
import { legalFooterColumnOf } from "@/lib/legal-routes"

/**
 * The legal column of one shop's footer: bee-link's terms and policy, and — only at a shop that
 * connected a Meta Pixel — "Cookies", the way back to the choice its strip asked for (BEELINK-271).
 * A shop with no pixel asked nothing, so it has nothing to lead back to.
 */
export function shopLegalColumnOf(store: Pick<PublicStore, "metaPixelId">, messages: UiMessages): StorefrontFooterColumn {
  const column = legalFooterColumnOf(messages)
  if (!store.metaPixelId) return column

  return {
    ...column,
    items: [...column.items, { id: "cookies", action: createElement(StorefrontConsentReopen, { label: messages.storefront.consent.footerLink }) }],
  }
}
