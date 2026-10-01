// React
import { Suspense } from "react"

// Next
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontAccountSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-account-skeleton"
import { StorefrontFavoritesSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-skeleton"
import { StorefrontReviewsSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-reviews-skeleton"
import { StorefrontOrdersSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-orders-skeleton"
import { StorefrontOrdersToolbarSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-orders-toolbar-skeleton"

// App
import { StorefrontAccountSection } from "@/components/storefront/storefront-account-section"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { accountTabTitleOf, deliveredAccountTabOf } from "@/lib/account-menu"
import { customerFavoritesAt } from "@/lib/customer-favorites"
import { customerOrdersAt } from "@/lib/customer-orders"
import { pendingReviewsAt } from "@/lib/customer-reviews"
import { getMessages } from "@/lib/locale"
import { shopperAt } from "@/lib/shopper"
import { navigationAt, shopAt } from "@/lib/storefront-data"
import { conversationOrderOf, sectionOf, storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import { AccountConversations } from "../conversations/account-conversations"
import { FavoritesTab } from "./favorites-tab"
import { FavoritesToolbar } from "./favorites-toolbar"
import { OrdersTab } from "./orders-tab"
import { OrdersToolbar } from "./orders-toolbar"
import { ReviewsTab } from "./reviews-tab"
import { StorefrontAccountArea } from "./storefront-account-area"

/**
 * One tab of the shopper's area, at `/<shop>/<account>/<tab>` — the same three segments a product
 * takes, told apart by the second word. A third segment under the account that names no delivered
 * tab is nothing, like a third segment under a category.
 */
async function load(slug: string, section: string, item: string) {
  const store = await shopAt(slug)
  if (!store || sectionOf(section, store.routeWords).kind !== "account") return null

  const tab = deliveredAccountTabOf(item, store.routeWords)
  if (!tab) return null

  return { store, tab }
}

/** Whether a three-segment address is a tab of the area rather than a product. */
export function isAccountSegment(section: string, routeWords: Parameters<typeof sectionOf>[1]): boolean {
  return sectionOf(section, routeWords).kind === "account"
}

export async function accountTabMetadata(slug: string, section: string, item: string): Promise<Metadata> {
  const loaded = await load(slug, section, item)
  if (!loaded) return {}

  const { ui } = await getMessages()
  return {
    title: `${accountTabTitleOf(loaded.tab, ui.storefront)} · ${loaded.store.name}`,
    alternates: { canonical: storefrontRoutes(loaded.store).accountTab(loaded.tab) },
    // The shopper's own pages are nobody's search result.
    robots: { index: false, follow: true },
  }
}

export interface AccountTabPageProps {
  slug: string
  section: string
  item: string
  query: SectionQuery
}

export async function AccountTabPage({ slug, section, item, query }: AccountTabPageProps) {
  const loaded = await load(slug, section, item)
  if (!loaded) notFound()

  const { store, tab } = loaded
  const routes = storefrontRoutes(store)
  const shopper = await shopperAt(slug)
  // Theirs alone: a visitor signs in and comes back to this very tab.
  if (!shopper) redirect(routes.signIn({ back: routes.accountTab(tab) }) as Parameters<typeof redirect>[0])

  const [{ ui, web }, { categories, onSale }, inProgress, liked, toRate] = await Promise.all([
    getMessages(),
    navigationAt(slug),
    customerOrdersAt(slug, { situation: "ACTIVE", pageSize: 1 }),
    customerFavoritesAt(slug, { pageSize: 1 }),
    pendingReviewsAt(slug),
  ])

  return (
    <StorefrontFrame
      store={store}
      categories={categories}
      activeCategory={null}
      catalogActive={false}
      markedCategory={null}
      onSale={onSale}
      year={new Date().getFullYear()}
      shopper={shopper}
      messages={ui}
    >
      <StorefrontAccountArea
        slug={store.slug}
        routes={routes}
        shopper={shopper}
        tab={tab}
        activeOrders={inProgress?.counts.ACTIVE}
        favorites={liked?.counts.ALL}
        pendingReviews={toRate?.length}
        tools={
          tab === "orders" ? (
            <Suspense fallback={<StorefrontOrdersToolbarSkeleton />}>
              <OrdersToolbar slug={store.slug} routes={routes} query={query} messages={ui} />
            </Suspense>
          ) : tab === "favorites" ? (
            // The orders' toolbar's shape holds the title row's height until the order arrives.
            <Suspense fallback={<StorefrontOrdersToolbarSkeleton />}>
              <FavoritesToolbar slug={store.slug} routes={routes} query={query} messages={ui} />
            </Suspense>
          ) : undefined
        }
        messages={ui}
      >
        {tab === "orders" ? (
          <Suspense fallback={<StorefrontOrdersSkeleton />}>
            <OrdersTab slug={store.slug} routes={routes} query={query} locale="pt-BR" messages={ui} />
          </Suspense>
        ) : tab === "favorites" ? (
          <Suspense fallback={<StorefrontFavoritesSkeleton />}>
            <FavoritesTab slug={store.slug} routes={routes} query={query} notices={shopper.notifications.favorites} locale="pt-BR" errors={web.errors} messages={ui} />
          </Suspense>
        ) : tab === "reviews" ? (
          <Suspense fallback={<StorefrontReviewsSkeleton />}>
            <ReviewsTab slug={store.slug} routes={routes} query={query} locale="pt-BR" errors={web.errors} messages={ui} />
          </Suspense>
        ) : tab === "messages" ? (
          <AccountConversations key={conversationOrderOf(query) ?? "list"} slug={store.slug} routeWords={store.routeWords} initialOrder={conversationOrderOf(query)} messages={ui} />
        ) : (
          <Suspense fallback={<StorefrontAccountSkeleton />}>
            <StorefrontAccountSection slug={store.slug} accountHref={routes.accountTab("profile")} signInHref={routes.signIn()} profile={shopper} query={query} errors={web.errors} messages={ui} />
          </Suspense>
        )}
      </StorefrontAccountArea>
    </StorefrontFrame>
  )
}
