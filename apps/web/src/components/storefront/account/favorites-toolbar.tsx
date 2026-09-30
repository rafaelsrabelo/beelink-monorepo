// Types
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontFavoritesSort } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-sort"

// App
import { customerFavoritesAt } from "@/lib/customer-favorites"
import { FAVORITE_LIST_KEYS, favoriteListApiQueryOf, favoriteListEntriesOf, favoriteListQueryOf, SORT_WORD_OF } from "@/lib/favorite-list-query"
import type { StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"

export interface FavoritesToolbarProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  messages: UiMessages
}

/** Favoritos' "Ordenar", beside the tab's title as 6g draws it — from the same page the list reads, and only when there is something to order. */
export async function FavoritesToolbar({ slug, routes, query, messages }: FavoritesToolbarProps) {
  const text = messages.storefront
  const asked = favoriteListQueryOf(query)
  const page = await customerFavoritesAt(slug, favoriteListApiQueryOf(asked))
  if (!page || page.counts.ALL === 0) return null

  const filter = favoriteListEntriesOf(asked)[FAVORITE_LIST_KEYS.filter]
  return (
    <StorefrontFavoritesSort
      action={routes.accountTab("favorites")}
      name={FAVORITE_LIST_KEYS.sort}
      value={SORT_WORD_OF[asked.sort]}
      orders={[
        { value: SORT_WORD_OF.RECENT, label: text.favoritesSortRecent },
        { value: SORT_WORD_OF.PRICE_ASC, label: text.favoritesSortPrice },
        { value: SORT_WORD_OF.DISCOUNT, label: text.favoritesSortDiscount },
      ]}
      hidden={filter ? { [FAVORITE_LIST_KEYS.filter]: filter } : {}}
      messages={messages}
    />
  )
}
