"use client"

// UI
import { StoreCard } from "@harness-monorepo/ui/blocks/store/store-card"
import { StoreListSkeleton } from "@harness-monorepo/ui/blocks/store/store-list-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { AppLink } from "@/components/app-link"
import { StoreErrorAlert } from "@/components/store/store-error-alert"
import { storeErrorCopy } from "@/components/store/store-error-copy"
import { format } from "@/locales"
import { useStore } from "@/services/stores/store-hooks"

export interface StoreOverviewScreenProps {
  slug: string
  ui: UiMessages
  web: WebMessages
}

/**
 * One shop's panel home. It shows what phase 1 knows about a shop and nothing it does not: the
 * catalogue, the orders and the takings each arrive with the phase that models them.
 */
export function StoreOverviewScreen({ slug, ui, web }: StoreOverviewScreenProps) {
  const store = useStore(slug)

  if (store.isPending) return <StoreListSkeleton count={1} messages={ui} />

  if (store.isError) {
    return <StoreErrorAlert message={storeErrorCopy(store.error, web) ?? web.errors.UNKNOWN} />
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-medium">{store.data.name}</h2>
        <p className="text-sm text-muted-foreground">
          {format(web.stores.overview.description, { name: store.data.name })}
        </p>
      </div>
      <StoreCard
        store={store.data}
        panelHref={`/admin/${store.data.slug}/store`}
        linkComponent={AppLink}
        messages={ui}
      />
    </div>
  )
}
