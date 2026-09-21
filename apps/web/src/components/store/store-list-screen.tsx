"use client"

// UI
import { StoreCard } from "@harness-monorepo/ui/blocks/store/store-card"
import { StoreEmptyState } from "@harness-monorepo/ui/blocks/store/store-empty-state"
import { StoreListSkeleton } from "@harness-monorepo/ui/blocks/store/store-list-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { StoreErrorAlert } from "@/components/store/store-error-alert"
import { storeErrorCopy } from "@/components/store/store-error-copy"
import { useMyStores } from "@/services/stores/store-hooks"

export interface StoreListScreenProps {
  ui: UiMessages
  web: WebMessages
}

/**
 * The shops this person owns, each with a way into its panel and a way to see it as a customer
 * does. The storefront link was withheld while `/<slug>` did not exist — a button that 404s is
 * worse than no button — and that page is now built.
 */
export function StoreListScreen({ ui, web }: StoreListScreenProps) {
  const stores = useMyStores()

  if (stores.isPending) return <StoreListSkeleton messages={ui} />

  if (stores.isError) {
    return <StoreErrorAlert message={storeErrorCopy(stores.error, web) ?? web.errors.UNKNOWN} />
  }

  if (stores.data.length === 0) {
    return <StoreEmptyState createHref="/create-store" linkComponent={AppLink} messages={ui} />
  }

  return (
    <div className="flex flex-col gap-4">
      {/*
        No "new shop" button here. This screen is the doorway — the one question it asks is which
        shop you are about to work in — and the switcher inside every shop already offers the same
        thing, as does the empty state for a shopkeeper who has none.

        It was also the Button primitive rendered as an anchor, which Base UI refuses out loud: a
        component acting as a button expects a real `<button>` under it. That mistake has now
        appeared twice, so `arch-gates` refuses it — if it navigates it is a link, and
        `buttonVariants` is how a link wears the button's clothes.
      */}
      <div className="grid gap-4 @3xl/main:grid-cols-2">
        {stores.data.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            // The shop's own home, not its settings. Picking a shop here is entering it, and what
            // somebody entering a shop wants is the shop — what is left to set up, the products,
            // the orders. Settings is one of the things inside, not the front door to them.
            panelHref={`/admin/${store.slug}`}
            storefrontHref={`/${store.slug}`}
            linkComponent={AppLink}
            messages={ui}
          />
        ))}
      </div>
    </div>
  )
}
