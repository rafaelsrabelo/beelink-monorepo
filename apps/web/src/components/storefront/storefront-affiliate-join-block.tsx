// React
import type { ReactNode } from "react"

// Types
import type { PublicAffiliateJoinBanner, PublicComponent } from "@harness-monorepo/contracts"

// UI
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import { StorefrontAffiliateJoinBanner } from "@harness-monorepo/ui/blocks/storefront/storefront-affiliate-join-banner"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { joinBannerOf, joinMarksOf } from "@/lib/affiliate-join"
import type { StorefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontAffiliateJoinBlockProps {
  component: PublicComponent
  /** What `{loja}` becomes. */
  shopName: string
  routes: StorefrontRoutes
  linkComponent?: LinkComponent
  messages: UiMessages
}

/**
 * A "Programa de afiliados" block (plan 2026-11-19): the shop's "Seja afiliado" page's banner, read with
 * the page, its marks filled in, leading to that page. Nothing while the read brought none — the page
 * is not on the air, or this is an affiliate's sub-site (`joinBlocksFor`).
 */
export function StorefrontAffiliateJoinBlock({ component, shopName, routes, linkComponent, messages }: StorefrontAffiliateJoinBlockProps): ReactNode {
  const [banner] = component.items as PublicAffiliateJoinBanner[]
  if (!banner) return null
  const join = messages.affiliateJoin

  return (
    <StorefrontAffiliateJoinBanner
      view={joinBannerOf(banner, join.defaults, joinMarksOf({ name: shopName }, banner, join, "pt-BR"))}
      href={routes.affiliateJoin()}
      {...(linkComponent ? { linkComponent } : {})}
    />
  )
}
