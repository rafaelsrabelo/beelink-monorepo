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
 * Meta Pixel does. Such a shop gets the notice after its pages and the visitor's answer around them;
 * any other gets its pages and nothing else — no notice, no state, and so no cookie ever written.
 *
 * After the pages, because the notice is sticky to the foot of the screen and must rest, at the
 * page's end, in its own place under the footer. Its wrapper is `display: contents`: it carries the
 * shop's `--shop-*` variables and typeface — the layout is outside the element that sets them — but
 * draws no box, so the notice sticks within the whole shop and not within a wrapper its own height.
 */
export function StorefrontConsentGate({ slug, store, choice, messages, children }: StorefrontConsentGateProps) {
  if (!store?.metaPixelId) return children

  return (
    <ConsentProvider slug={slug} choice={choice}>
      {children}
      <div className="contents" style={{ ...shopPaletteVariables(store.colors), fontFamily: "var(--font-shop, inherit)" }}>
        <StorefrontConsentLive privacyHref={LEGAL_ROUTES.privacy} messages={messages} />
      </div>
    </ConsentProvider>
  )
}
