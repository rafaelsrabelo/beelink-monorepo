// React
import { Suspense } from "react"

// Next
import { notFound, redirect } from "next/navigation"
import type { Metadata } from "next"

// UI
import { StorefrontAccountSkeleton } from "@harness-monorepo/ui/blocks/storefront/storefront-account-skeleton"

// App
import { StorefrontAccountSection } from "@/components/storefront/storefront-account-section"
import { StorefrontFrame } from "@/components/storefront/storefront-frame"
import { accountTabTitleOf, deliveredAccountTabOf } from "@/lib/account-menu"
import { getMessages } from "@/lib/locale"
import { shopperAt } from "@/lib/shopper"
import { navigationAt, shopAt } from "@/lib/storefront-data"
import { sectionOf, storefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
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

  const [{ ui, web }, { categories, onSale }] = await Promise.all([getMessages(), navigationAt(slug)])

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
      <StorefrontAccountArea slug={store.slug} routes={routes} shopper={shopper} tab={tab} messages={ui}>
        <Suspense fallback={<StorefrontAccountSkeleton />}>
          {tab === "profile" ? (
            <StorefrontAccountSection slug={store.slug} accountHref={routes.accountTab("profile")} profile={shopper} query={query} errors={web.errors} messages={ui} />
          ) : null}
        </Suspense>
      </StorefrontAccountArea>
    </StorefrontFrame>
  )
}
