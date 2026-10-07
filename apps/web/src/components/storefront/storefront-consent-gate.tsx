// React
import type { ReactNode } from "react"

// Types
import type { PublicStore } from "@harness-monorepo/contracts"

// UI
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ConsentProvider } from "./consent-provider"
import { StorefrontConsentLive } from "./storefront-consent-live"
import type { ConsentChoice } from "@/lib/consent-cookie"
import { LEGAL_ROUTES } from "@/lib/legal-routes"

export interface StorefrontConsentGateProps {
  slug: string
  /** The shop, or null for an address nobody holds — whose page is a 404 and asks nothing. */
  store: Pick<PublicStore, "metaPixelId" | "colors"> | null
  /** What the server read from this shop's `bl_consent`. */
  choice: ConsentChoice | null
  messages: UiMessages
  /** Every page of the shop. */
  children: ReactNode
}

/**
 * Whether a shop asks its visitor about tracking at all (BEELINK-271): only one that connected a
 * Meta Pixel does. Such a shop gets the strip above its pages and the visitor's answer around them;
 * any other gets its pages and nothing else — no strip, no state, and so no cookie ever written.
 *
 * It sits in the shop's layout, outside the element that carries the shop's `--shop-*` variables,
 * so the strip is handed them here, with the shop's typeface.
 */
export function StorefrontConsentGate({ slug, store, choice, messages, children }: StorefrontConsentGateProps) {
  if (!store?.metaPixelId) return children

  return (
    <ConsentProvider slug={slug} choice={choice}>
      <div style={{ ...shopPaletteVariables(store.colors), fontFamily: "var(--font-shop, inherit)" }}>
        <StorefrontConsentLive privacyHref={LEGAL_ROUTES.privacy} messages={messages} />
      </div>
      {children}
    </ConsentProvider>
  )
}
