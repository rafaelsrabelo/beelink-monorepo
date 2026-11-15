// Types
import type { PublicAffiliatePage } from "@harness-monorepo/contracts"

// App
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { joinExampleOf, joinFormViewOf, joinMarksOf, joinPageViewOf, joinSuccessOf } from "@/lib/affiliate-join"
import { shopperAt } from "@/lib/shopper"
import { siteOrigin } from "@/lib/site-origin"
import type { SectionPlace } from "@/lib/storefront-section"
import { storefrontRoutes } from "@/lib/storefront-routes"
import { StorefrontAffiliateJoinLive } from "./storefront-affiliate-join-live"

export interface StorefrontAffiliateJoinSectionProps {
  place: SectionPlace
  /** The page as the API answered it: the section page reads it first, so a closed one is a 404. */
  page: PublicAffiliatePage
}

/**
 * The shop's "Seja afiliado" page (plan 2026-11-14), in the shop's frame: its texts drawn here, in the
 * HTML a crawler reads, and the form live in the browser. The link's preview starts at the address the
 * visitor is on — the shop's own domain, or the platform's host and the shop's slug.
 */
export async function StorefrontAffiliateJoinSection({ place, page }: StorefrontAffiliateJoinSectionProps) {
  const { store, navigation, messages: ui } = place
  const locale = "pt-BR"
  const routes = storefrontRoutes(store)
  const [shopper, origin] = await Promise.all([shopperAt(store.slug), siteOrigin()])
  const marks = joinMarksOf(store, page.rateBps, locale)
  const linkBase = store.ownDomain && store.customDomain ? `${store.customDomain.host}/` : `${new URL(origin).host}/${store.slug}/`

  return (
    <StorefrontFrame store={store} categories={navigation.categories} onSale={navigation.onSale} year={new Date().getFullYear()} shopper={shopper} messages={ui}>
      <StorefrontAffiliateJoinLive
        slug={store.slug}
        view={joinPageViewOf(page, ui.affiliateJoin.defaults, marks)}
        form={joinFormViewOf(page, ui.affiliateJoin, marks)}
        success={joinSuccessOf(page, ui.affiliateJoin.defaults, marks)}
        terms={page.terms.text}
        linkBase={linkBase}
        example={joinExampleOf(page.rateBps, ui.affiliateJoin, locale)}
        homeHref={routes.home}
        messages={ui}
      />
    </StorefrontFrame>
  )
}
