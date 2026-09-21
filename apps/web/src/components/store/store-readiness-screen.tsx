"use client"

// React
import { useState } from "react"

// UI
import { SectionCards } from "@harness-monorepo/ui/blocks/dashboard/section-cards"
import { StoreListSkeleton } from "@harness-monorepo/ui/blocks/store/store-list-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@harness-monorepo/ui/components/select"

// Types
import type { Store } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"

// App
import { StoreErrorAlert } from "@/components/store/store-error-alert"
import { storeErrorCopy } from "@/components/store/store-error-copy"
import { format } from "@/locales"
import { useMyStores } from "@/services/stores/store-hooks"

/**
 * What a shop needs before it can sell, and nothing else.
 *
 * Orders and sales are deliberately absent: neither exists in the product yet, and a card reading
 * "0 pedidos" above a shop that cannot take one is a lie with a number on it. What someone setting
 * a shop up actually needs is what is still missing, and that is real data today.
 */
function readinessOf(store: Store, text: WebMessages["dashboard"]["readiness"]) {
  const checks: Array<[boolean, string]> = [
    [Boolean(store.description?.trim()), text.items.description],
    [store.category !== null, text.items.category],
    [Boolean(store.logoUrl), text.items.logo],
    [Boolean(store.bannerImageUrl), text.items.banner],
    [Boolean(store.address.city?.trim()), text.items.address],
    [Boolean(store.socialNetworks.whatsapp), text.items.whatsapp],
  ]

  return {
    done: checks.filter(([ok]) => ok).length,
    total: checks.length,
    missing: checks.filter(([ok]) => !ok).map(([, name]) => name),
  }
}

export interface StoreReadinessScreenProps {
  ui: UiMessages
  web: WebMessages
}

export function StoreReadinessScreen({ ui, web }: StoreReadinessScreenProps) {
  const stores = useMyStores()
  const text = web.dashboard.readiness
  /** "" means every shop. Kept here and not in the address, so a filter is not a bookmarkable page. */
  const [only, setOnly] = useState("")

  if (stores.isPending) return <StoreListSkeleton messages={ui} />
  if (stores.isError) {
    return <StoreErrorAlert message={storeErrorCopy(stores.error, web) ?? web.errors.UNKNOWN} />
  }

  const all = stores.data ?? []
  const shown = only ? all.filter((store) => store.slug === only) : all

  const cards = shown.map((store) => {
    const { done, total, missing } = readinessOf(store, text)

    return {
      label: store.name,
      value: missing.length === 0 ? text.complete : format(text.done, { done: String(done), total: String(total) }),
      footnote:
        missing.length === 0
          ? store.latitude !== null && store.longitude !== null
            ? text.onMap
            : text.offMap
          : format(text.missing, { items: missing.join(", ") }),
    }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* A filter only where there is something to filter: one shop is not a choice. */}
      {all.length > 1 ? (
        <div className="flex items-center gap-2 px-4 lg:px-6">
          <span className="text-sm text-muted-foreground">{text.storeLabel}</span>
          <Select value={only} onValueChange={(value) => setOnly(value ?? "")}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder={text.allStores} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{text.allStores}</SelectItem>
              {all.map((store) => (
                <SelectItem key={store.slug} value={store.slug}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <SectionCards cards={cards} />
    </div>
  )
}
