// Types
import type { CustomerFavoriteFilter } from "@harness-monorepo/contracts"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// UI
import { StorefrontFavoriteCard } from "@harness-monorepo/ui/blocks/storefront/storefront-favorite-card"
import { StorefrontFavoritesEmpty } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-empty"
import { StorefrontFavoritesHint } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-hint"
import { StorefrontFavoritesOutcome } from "@harness-monorepo/ui/blocks/storefront/storefront-favorites-outcome"
import { StorefrontOrderTabs } from "@harness-monorepo/ui/blocks/storefront/storefront-order-tabs"
import { StorefrontPagination } from "@harness-monorepo/ui/blocks/storefront/storefront-pagination"

// App
import { AppLink } from "@/components/app-link"
import { customerFavoritesAt } from "@/lib/customer-favorites"
import { favoriteProductHrefOf, favoriteRemoveActionOf, likedOnOf } from "@/lib/favorite-card-view"
import { errorSentenceOf } from "@/lib/error-sentence"
import {
  beforeCentsOf,
  FAVORITE_REMOVED,
  FAVORITES_ERROR_KEY,
  favoriteListApiQueryOf,
  favoriteListEntriesOf,
  favoriteListQueryOf,
  type FavoriteListQuery,
} from "@/lib/favorite-list-query"
import { paramOf, type StorefrontRoutes } from "@/lib/storefront-routes"
import type { SectionQuery } from "@/lib/storefront-section"
import type { WebMessages } from "@/locales"
import { FavoriteCartLive } from "../favorites/favorite-cart-live"

export interface FavoritesTabProps {
  slug: string
  routes: StorefrontRoutes
  query: SectionQuery
  /** Whether the shopper kept the favourites' notices by e-mail on (J16), from the profile the menu read. */
  notices: boolean
  locale: string
  errors: WebMessages["errors"]
  messages: UiMessages
}

const FILTERS: readonly { key: "ALL" | CustomerFavoriteFilter; filter: CustomerFavoriteFilter | undefined }[] = [
  { key: "ALL", filter: undefined },
  { key: "PRICE_DROPPED", filter: "PRICE_DROPPED" },
  { key: "ON_SALE", filter: "ON_SALE" },
  { key: "SOLD_OUT", filter: "SOLD_OUT" },
]

/**
 * Favoritos (6g): the products the shopper liked at this shop, priced as of now and narrowed by the
 * address — filter, order, page — read on the server with their session, once per request with
 * the order beside the title. A list that could not be read says so, and offers to read it again.
 */
export async function FavoritesTab({ slug, routes, query, notices, locale, errors, messages }: FavoritesTabProps) {
  const text = messages.storefront
  const asked = favoriteListQueryOf(query)
  const page = await customerFavoritesAt(slug, favoriteListApiQueryOf(asked))
  const href = (patch: Partial<FavoriteListQuery>) => routes.accountTab("favorites", favoriteListEntriesOf(asked, patch))

  if (!page) {
    return <StorefrontFavoritesEmpty variant="unavailable" href={href({ page: asked.page })} linkComponent={AppLink} messages={messages} />
  }

  const refused = paramOf(query[FAVORITES_ERROR_KEY])
  const removed = paramOf(query.aviso) === FAVORITE_REMOVED
  const filterLabels = { ALL: text.favoritesTabAll, PRICE_DROPPED: text.favoritesTabDropped, ON_SALE: text.favoritesTabOnSale, SOLD_OUT: text.favoritesTabSoldOut }
  const pageCount = Math.max(1, Math.ceil(page.total / page.pageSize))
  const back = href({ page: asked.page })

  return (
    <div className="flex flex-col gap-5">
      {refused ? (
        <StorefrontFavoritesOutcome tone="failed" message={errorSentenceOf(errors, refused)} />
      ) : removed ? (
        <StorefrontFavoritesOutcome tone="done" message={text.favoriteRemoved} />
      ) : null}

      {page.counts.ALL === 0 ? null : <StorefrontFavoritesHint on={notices} settingsHref={`${routes.accountTab("profile")}#avisos`} linkComponent={AppLink} messages={messages} />}

      {page.counts.ALL === 0 ? null : (
        <StorefrontOrderTabs
          label={text.favoritesFilterLabel}
          tabs={FILTERS.map((entry) => ({ label: filterLabels[entry.key], count: page.counts[entry.key], href: href({ filter: entry.filter }), current: asked.filter === entry.filter }))}
          linkComponent={AppLink}
          messages={messages}
        />
      )}

      {page.favorites.length === 0 ? (
        <StorefrontFavoritesEmpty
          variant={page.counts.ALL === 0 ? "none" : "filtered"}
          href={page.counts.ALL === 0 ? routes.catalog() : routes.accountTab("favorites")}
          linkComponent={AppLink}
          messages={messages}
        />
      ) : (
        <ul className="grid grid-cols-2 gap-4 shop-md:grid-cols-3 shop-lg:grid-cols-4">
          {page.favorites.map((favorite) => (
            <li key={favorite.productId}>
              <StorefrontFavoriteCard
                name={favorite.name}
                href={favoriteProductHrefOf(favorite, routes)}
                imageUrl={favorite.imageUrl}
                variantLabel={favorite.variant?.label ?? null}
                priceCents={favorite.priceCents}
                beforeCents={beforeCentsOf(favorite)}
                dropCents={favorite.priceDropCents}
                likedOn={likedOnOf(favorite.likedAt, locale)}
                soldOut={favorite.soldOut}
                action={
                  <FavoriteCartLive
                    productId={favorite.productId}
                    name={favorite.name}
                    variantId={favorite.variant?.id ?? null}
                    choose={favorite.variant === null && favorite.hasOptions}
                    messages={messages}
                  />
                }
                remove={{ action: favoriteRemoveActionOf(slug), fields: { produto: favorite.productId, retorno: back, entrada: routes.signIn() } }}
                locale={locale}
                linkComponent={AppLink}
                messages={messages}
              />
            </li>
          ))}
        </ul>
      )}

      {pageCount > 1 ? <StorefrontPagination page={page.page} pageCount={pageCount} href={(next) => href({ page: next })} linkComponent={AppLink} messages={messages} /> : null}
    </div>
  )
}
