// React
import type { ReactNode } from "react"

// Types
import type { PublicProductCategory, PublicSection, PublicStore } from "@harness-monorepo/contracts"

// UI
import { StorefrontCategories } from "@harness-monorepo/ui/blocks/storefront/storefront-categories"
import { StorefrontWindow } from "@harness-monorepo/ui/blocks/storefront/storefront-window"
import type { LinkComponent } from "@harness-monorepo/ui/blocks/auth/auth-link"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { ctaOf, menuOf, siteFooterColumnsOf } from "./site-chrome"
import { announcementOf } from "./storefront-sections"
import { StorefrontSearchLive } from "./storefront-search-live"
import { addressLineOf, orderHrefOf, storefrontLinksOf } from "./storefront-links"
import { storefrontRoutes } from "@/lib/storefront-routes"

export interface StorefrontFrameProps {
  store: PublicStore
  /**
   * Every category the shop has, parents and children alike, never the ones a filter left:
   * navigation must not vanish in use. The menu draws the first level; the second belongs to the
   * page of the category it hangs off.
   */
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
   * The year on the footer's last line. It arrives from the page rather than from `new Date()` in
   * here, because a component that reads the clock renders differently on the server and in the
   * browser on the thirty-first of December and hydration says so out loud.
   */
  year: number
  /**
   * Replaces the live search. The design preview passes a plain form, because the live one asks
   * the API on every keystroke and a preview that talks to the network is a preview that costs
   * something to look at.
   */
  /**
   * The landing page's own blocks, drawn edge to edge in the shopkeeper's order.
   *
   * When it is given the frame stops drawing the cover and the promises band from the shop's
   * columns: on that page they are blocks. Every other page passes `children` and keeps them.
   */
  blocks?: ReactNode
  /**
   * The palette to paint with, when it is not the one the shop has saved.
   *
   * Design mode passes the colours being edited, so the preview answers the picker rather than
   * the database. Nothing else passes it: a shop window painting anything other than what the
   * shop stores would be a shop window showing a page no visitor gets.
   */
  colors?: PublicStore["colors"]
  /**
   * The arrangement being drawn, when it is not the one the store has saved.
   *
   * Design mode passes its draft, so a site's menu and footer answer the band the owner just
   * renamed rather than the page the server cached — the same reason `colors` is a prop. Nothing
   * else passes it.
   */
  sections?: readonly PublicSection[]
  searchSlot?: ReactNode
  /**
   * How every injected link is drawn. The preview passes one that renders no `href`, so nothing
   * in it navigates and nothing in it takes a tab stop. `StorefrontWindow` does not forward this
   * to its children, so it is handed to the category band here and to the bands below by whoever
   * builds them.
   */
  linkComponent?: LinkComponent
  messages: UiMessages
  /** Optional: a page that arranges its own blocks passes those instead. */
  children?: ReactNode
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
  blocks,
  colors,
  sections,
  year,
  searchSlot,
  linkComponent,
  messages,
  children,
}: StorefrontFrameProps) {
  const routes = storefrontRoutes(store)
  const text = messages.storefront

  // A site presents and takes contact; it has no search, no basket, no account and no category
  // band. Its header is the page's own named bands, as anchors. One frame and a branch, not two
  // frames: everything else about the window — colours, footer, strip — is the same thing.
  const site = store.type === "INSTITUTIONAL"

  // The menu is the first level. A shop with five headings and nineteen subheadings in one row is
  // not a menu, and the subcategories are one click away on the page of the category they are in.
  const topLevel = categories.filter((category) => !category.parentSlug)

  // A subcategory being open marks its parent up here: the heading the visitor is standing under
  // is the one the menu can show, and marking nothing would say they are nowhere.
  const openCategory = categories.find((category) => category.slug === activeCategory)
  const markedCategory = openCategory?.parentSlug ?? activeCategory

  // The shop's own pages, and how to reach a person. Built here and not in the block for the
  // reason every href is: a block that knew "Produtos" links to `routeWords.products` would be
  // holding the very word this whole scheme exists to keep out of components.
  const whatsapp = orderHrefOf(store)
  const shopColumns = [
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
  const drawn = sections ?? store.sections
  const footerColumns = site ? siteFooterColumnsOf(store, drawn, messages) : shopColumns
  // The strip is above the masthead on every page, so it is read here from the same bands the
  // landing page's blocks come from — the draft's in design mode, the shop's everywhere else.
  const announcement = announcementOf(drawn)

  return (
    <StorefrontWindow
      name={store.name}
      description={description}
      logoUrl={store.logoUrl}
      homeHref={routes.home}
      colors={colors ?? store.colors}
      // The live one, which answers while someone types. It replaces the plain form rather than
      // sitting beside it, and falls back to exactly that form when scripting is off.
      {...(site
        ? { menu: menuOf(drawn), cta: ctaOf(drawn) }
        : {
            searchSlot: searchSlot ?? (
              <StorefrontSearchLive
                slug={store.slug}
                routeWords={store.routeWords}
                initialTerm={searchValue}
                locale="pt-BR"
                messages={messages}
              />
            ),
            searchAction: routes.search(),
            // Both icons, on every page. They were held back while they had nowhere to go; the
            // basket has an address now, and the account is the sign-in the platform already has.
            cartHref: routes.cart(),
            accountHref: "/login",
          })}
      {...(linkComponent ? { linkComponent } : {})}
      categories={
        !site && topLevel.length ? (
          <StorefrontCategories
            categories={topLevel}
            active={markedCategory}
            href={(categorySlug) => (categorySlug ? routes.category(categorySlug) : routes.catalog())}
            // The menu, unless the shopkeeper asked for the row of photographs. The switch in the
            // panel is called "ícones de categoria", and that is exactly what it now chooses.
            variant={store.layoutSettings.showCategoryIcons ? "tiles" : "bar"}
            {...(linkComponent ? { linkComponent } : {})}
          />
        ) : undefined
      }
      {...(blocks ? { blocks } : {})}
      {...(announcement ? { announcement } : {})}
      banner={
        showBanner && store.layoutType === "BANNER" && store.bannerImageUrl
          ? { imageUrl: store.bannerImageUrl }
          : null
      }
      footerColumns={footerColumns}
      copyright={text.copyright.replace("{year}", String(year)).replace("{name}", store.name)}
      links={storefrontLinksOf(store)}
      orderHref={description && !site ? orderHrefOf(store) : undefined}
      addressLine={addressLineOf(store)}
      messages={messages}
    >
      {children}
    </StorefrontWindow>
  )
}
