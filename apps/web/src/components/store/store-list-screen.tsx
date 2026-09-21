"use client"

// UI
import { StoreCard } from "@harness-monorepo/ui/blocks/store/store-card"
import { StoreEmptyState } from "@harness-monorepo/ui/blocks/store/store-empty-state"
import { StoreListSkeleton } from "@harness-monorepo/ui/blocks/store/store-list-skeleton"
import { Button } from "@harness-monorepo/ui/components/button"
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
 * The shops this person owns. No `storefrontHref` is handed to the cards: `/<slug>` is the phase
 * that builds the shop window, and a button that 404s is worse than no button.
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
      {/* The empty state carries its own way in; this is the one for a shopkeeper who already
          has a shop and is opening a second. Nothing limits how many they may own. */}
      <Button variant="outline" className="self-start" render={<AppLink href="/create-store" />}>
        {web.stores.list.create}
      </Button>
      <div className="grid gap-4 @3xl/main:grid-cols-2">
        {stores.data.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            panelHref={`/admin/${store.slug}`}
            linkComponent={AppLink}
            messages={ui}
          />
        ))}
      </div>
    </div>
  )
}
