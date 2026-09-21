"use client"

// UI
import { SetupCard } from "@harness-monorepo/ui/blocks/dashboard/setup-card"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { useStore } from "@/services/stores/store-hooks"

export interface ShopHomeScreenProps {
  slug: string
  ui: UiMessages
  web: WebMessages
}

/**
 * The panel's home for one shop: what is left to set up.
 *
 * Every card knows whether its thing is done, and asks the screens that own it rather than keeping
 * a checklist of its own — a stored "you have finished this step" goes stale the moment a
 * shopkeeper deletes their only product, and then the home says the shop is ready when it is empty.
 *
 * A finished card stays, marked. The list emptying as it is worked through would look broken on the
 * last step and would take away the way back into what was already set up.
 */
export function ShopHomeScreen({ slug, ui, web }: ShopHomeScreenProps) {
  const text = web.stores.home
  const store = useStore(slug)
  const products = useProducts(slug)
  const categories = useProductCategories(slug)

  const loading = store.isPending || products.isPending || categories.isPending
  const categoryRows = categories.data ?? []

  const cards = [
    {
      title: text.cards.identityTitle,
      description: text.cards.identityText,
      actionLabel: text.cards.identityAction,
      href: `/admin/${slug}/store`,
      // A logo is the one part of the identity a shop cannot be said to have by default: the name
      // is required at creation and the colours arrive as the platform's palette.
      done: Boolean(store.data?.logoUrl),
    },
    {
      title: text.cards.productsTitle,
      description: text.cards.productsText,
      actionLabel: text.cards.productsAction,
      href: `/admin/${slug}/products`,
      done: (products.data?.length ?? 0) > 0,
    },
    {
      title: text.cards.categoriesTitle,
      description: text.cards.categoriesText,
      actionLabel: text.cards.categoriesAction,
      href: `/admin/${slug}/categories`,
      done: categoryRows.length > 0,
    },
    {
      title: text.cards.showcaseTitle,
      description: text.cards.showcaseText,
      actionLabel: text.cards.showcaseAction,
      href: `/admin/${slug}/categories`,
      done: categoryRows.some((category) => category.showcaseLayout),
    },
    {
      title: text.cards.viewTitle,
      description: text.cards.viewText,
      actionLabel: text.cards.viewAction,
      href: `/${slug}`,
      // The shop's own window is not the panel, so it opens where a customer would see it.
      external: true,
      done: false,
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 lg:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{store.data?.name ?? slug}</h1>
        <p className="text-muted-foreground text-sm">{text.subtitle}</p>
      </header>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <SetupCard key={card.title} {...card} linkComponent={AppLink} messages={ui} />
          ))}
        </ul>
      )}
    </div>
  )
}
