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
  /**
   * The year on the footer's last line. It arrives from the page rather than from `new Date()` in
   * here, because a component that reads the clock renders differently on the server and in the
   * browser on the thirty-first of December and hydration says so out loud.
   */
  year: number
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
  year,
  messages,
  children,
}: StorefrontFrameProps) {
  const routes = storefrontRoutes(store)
  const text = messages.storefront

  // The shop's own pages, and how to reach a person. Built here and not in the block for the
  // reason every href is: a block that knew "Produtos" links to `routeWords.products` would be
  // holding the very word this whole scheme exists to keep out of components.
  const whatsapp = orderHrefOf(store)
  const footerColumns = [
    {
      id: "shop",
      title: text.footerShop,
      items: [
        { label: text.catalogTitle, href: routes.catalog() },
        { label: text.categoriesTitle, href: routes.categories() },
        { label: text.cart, href: routes.cart() },
      ],
    },
    ...(whatsapp
      ? [{ id: "contact", title: text.footerContact, items: [{ label: text.order, href: whatsapp }] }]
      : []),
  ]

  return (
    <StorefrontWindow
      name={store.name}
      description={description}
      logoUrl={store.logoUrl}
      homeHref={routes.home}
      colors={store.colors}
      searchAction={routes.search()}
      searchValue={searchValue}
      // Both icons, on every page. They were held back while they had nowhere to go; the basket
      // has an address now, and the account is the sign-in the platform already has.
      cartHref={routes.cart()}
      accountHref="/login"
      categories={
        categories.length ? (
          <StorefrontCategories
            categories={categories}
            active={activeCategory}
            href={(categorySlug) => (categorySlug ? routes.category(categorySlug) : routes.catalog())}
            // The menu, unless the shopkeeper asked for the row of photographs. The switch in the
            // panel is called "ícones de categoria", and that is exactly what it now chooses.
            variant={store.layoutSettings.showCategoryIcons ? "tiles" : "bar"}
          />
        ) : undefined
      }
      banner={
        showBanner && store.layoutType === "BANNER" && store.bannerImageUrl
          ? { imageUrl: store.bannerImageUrl }
          : null
      }
      highlights={showHighlights ? paymentHighlightsOf(store, messages) : []}
      footerColumns={footerColumns}
      copyright={text.copyright.replace("{year}", String(year)).replace("{name}", store.name)}
      links={storefrontLinksOf(store)}
      orderHref={description ? orderHrefOf(store) : undefined}
      addressLine={addressLineOf(store)}
      messages={messages}
    >
      {children}
    </StorefrontWindow>
  )
}
