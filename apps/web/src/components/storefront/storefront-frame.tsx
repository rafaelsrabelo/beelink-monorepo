// React
import type { ReactNode } from "react"

// Types
import type { PublicProductCategory, PublicStore } from "@harness-monorepo/contracts"

// UI
import { StorefrontCategories } from "@harness-monorepo/ui/blocks/storefront/storefront-categories"
import { StorefrontWindow } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { paymentHighlightsOf } from "./storefront-highlights"
import { addressLineOf, orderHrefOf, storefrontLinksOf } from "./storefront-links"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontFrameProps {
  store: PublicStore
  /** Every category the shop has, never the ones a filter left: navigation must not vanish in use. */
  categories: readonly PublicProductCategory[]
  /** The category being shown, so the band marks it. Null on every page that is not one. */
  activeCategory?: string | null
  /** What was searched for, said back in the field someone typed it into. */
  searchValue?: string
  /** The shop's pitch, which only the home shows: an inner page is about the goods. */
  description?: string | null
  /** The cover, which only the home shows, and only when the shopkeeper chose that layout. */
  showBanner?: boolean
  /**
   * The band of what the shop takes, which belongs above a shelf and not above one product: on a
   * product page the thing someone came to see is what has to be at the top.
   */
  showHighlights?: boolean
  messages: UiMessages
  children: ReactNode
}

/**
 * The shop window, dressed from one shop, for every page that lives inside it.
 *
 * It exists because there are now five of those and the window takes a dozen props — and the ones
 * that matter are the ones easy to get subtly wrong in one place out of five: which address the
 * search posts to, whether the category band marks anything, and whether this page is allowed to
 * show the shop's pitch. Spread across five files those drift, and the drift is invisible until
 * somebody opens the fifth page.
 *
 * It fetches nothing. Every page hands it what it already loaded, which is what keeps one page's
 * reads one page's business and keeps this file clear of `web/no-fetch-in-components`.
 */
export function StorefrontFrame({
  store,
  categories,
  activeCategory = null,
  searchValue,
  description = null,
  showBanner = false,
  showHighlights = false,
  messages,
  children,
}: StorefrontFrameProps) {
  const routes = storefrontRoutes(store)

  return (
    <StorefrontWindow
      name={store.name}
      description={description}
      logoUrl={store.logoUrl}
      homeHref={routes.home}
      colors={store.colors}
      searchAction={routes.search()}
      searchValue={searchValue}
      categories={
        categories.length ? (
          <StorefrontCategories
            categories={categories}
            active={activeCategory}
            href={(categorySlug) => (categorySlug ? routes.category(categorySlug) : routes.catalog())}
            withImages={store.layoutSettings.showCategoryIcons ?? true}
          />
        ) : undefined
      }
      banner={
        showBanner && store.layoutType === "BANNER" && store.bannerImageUrl
          ? { imageUrl: store.bannerImageUrl }
          : null
      }
      highlights={showHighlights ? paymentHighlightsOf(store, messages) : []}
      links={storefrontLinksOf(store)}
      orderHref={description ? orderHrefOf(store) : undefined}
      addressLine={addressLineOf(store)}
      messages={messages}
    >
      {children}
    </StorefrontWindow>
  )
}
