"use client"

// UI
import { SetupCard } from "@harness-monorepo/ui/blocks/dashboard/setup-card"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { useBanners } from "@/services/banners/banner-hooks"
import { useProducts } from "@/services/catalog/catalog-hooks"
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
  // One row is enough: the card asks whether the shop has any product, not how many.
  const products = useProducts(slug, { pageSize: 1 })
  const banners = useBanners(slug)

  const loading = store.isPending || products.isPending || banners.isPending
  const bannerRows = banners.data ?? []

  /**
   * Two wide, then three. The first row is what the shop is FOR — the window a customer opens and
   * what they may pay with — and the second is what has to be filled in before either means
   * anything. A uniform grid made "see your shop" look like one chore among five.
   */
  const cards = [
    {
      title: text.cards.viewTitle,
      description: text.cards.viewText,
      actionLabel: text.cards.viewAction,
      href: `/${slug}`,
      // The shop's own window is not the panel, so it opens where a customer would see it.
      external: true,
      wide: true,
    },
    {
      title: text.cards.paymentsTitle,
      description: text.cards.paymentsText,
      actionLabel: text.cards.paymentsAction,
      href: `/admin/${slug}/store`,
      // No `done`. Every shop opens with all four methods on, so a tick here would be true from
      // the first second and would mean nothing — and the card is a review, not a task.
      wide: true,
    },
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
      done: (products.data?.total ?? 0) > 0,
    },
    {
      title: text.cards.bannersTitle,
      description: text.cards.bannersText,
      actionLabel: text.cards.bannersAction,
      href: `/admin/${slug}/banners`,
      // Banners, not categories. The old predicate asked the panel whether the shop had any
      // category, which the landing page never drew — a shop whose categories all held nothing
      // published read "Feito" over a home with no poster and no menu item at all.
      done: bannerRows.length > 0,
    },
  ]

  return (
    <div className="flex w-full flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">{store.data?.name ?? slug}</h1>
        <p className="text-muted-foreground text-sm">{text.subtitle}</p>
      </header>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-6">
          <Skeleton className="h-52 w-full lg:col-span-3" />
          <Skeleton className="h-52 w-full lg:col-span-3" />
          <Skeleton className="h-44 w-full lg:col-span-2" />
          <Skeleton className="h-44 w-full lg:col-span-2" />
          <Skeleton className="h-44 w-full lg:col-span-2" />
        </div>
      ) : (
        /*
          Six columns, so two of three and three of two land on the same grid. Below `lg` it is one
          column: two wide cards side by side on a phone are two narrow cards, which is the shape
          this layout exists to avoid.
        */
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {cards.map(({ wide, ...card }) => (
            <SetupCard
              key={card.title}
              {...card}
              className={wide ? "sm:col-span-2 lg:col-span-3" : "lg:col-span-2"}
              linkComponent={AppLink}
              messages={ui}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
