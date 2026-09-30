// Types
import type { StorefrontFooterColumn } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * bee-link's terms of use and privacy policy (BEELINK-171): the platform's pages at the site's root,
 * not any shop's. The API keeps `termos` and `privacidade` out of the slugs a shop can take, so a
 * shop's front door never sits where these are.
 */
export const LEGAL_ROUTES = { terms: "/termos", privacy: "/privacidade" } as const

/** The footer's last column, on every shop and site: the texts a shopper's account is opened under. */
export function legalFooterColumnOf(messages: UiMessages): StorefrontFooterColumn {
  return {
    id: "legal",
    title: messages.legal.footerTitle,
    items: [
      { label: messages.legal.terms, href: LEGAL_ROUTES.terms },
      { label: messages.legal.privacy, href: LEGAL_ROUTES.privacy },
    ],
  }
}
