"use client"

// React
import { useState } from "react"

// UI
import { StoreSettingsForm } from "@harness-monorepo/ui/blocks/store/store-settings-form"
import { StoreSettingsSkeleton } from "@harness-monorepo/ui/blocks/store/store-settings-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { WebMessages } from "@/locales"

// App
import { StoreErrorAlert } from "@/components/store/store-error-alert"
import { firstStoreErrorCopy, storeErrorCopy } from "@/components/store/store-error-copy"
import { toSettingsValues, toUpdatePayload } from "@/components/store/store-payloads"
import { useAddressSearch, DEBOUNCE_MS } from "@/services/addresses/address-hooks"
import { mapTileUrl, pointOf } from "@/services/addresses/map-tiles"
import type { Point } from "@/services/addresses/map-tiles"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useZipCodeLookup } from "@/services/cep/cep-hooks"
import { useStore, useStoreCategories, useUpdateStore } from "@/services/stores/store-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface StoreSettingsScreenProps {
  slug: string
  ui: UiMessages
  web: WebMessages
}

/**
 * The panel's one form over its tabs, at the panel's full width. Everything the tabs cannot do for
 * themselves is handed in as a callback: the postcode lookup and the image upload. A block reaches
 * nothing — it is the screen that owns a request, which is what keeps every tab renderable in
 * Storybook. The Delivery tab saves on its own (BEELINK-177), so it is handed in whole.
 */
export function StoreSettingsScreen({ slug, ui, web }: StoreSettingsScreenProps) {
  const store = useStore(slug)
  const categories = useStoreCategories()
  const update = useUpdateStore(slug)
  const zipCode = useZipCodeLookup()
  // The block reports every keystroke; this is where it stops being one request each.
  const [addressQuery, setAddressQuery] = useState("")
  const addresses = useAddressSearch(useDebouncedValue(addressQuery, DEBOUNCE_MS))
  // Empty until a suggestion is picked; what shows before that is the shop's own point,
  // resolved on the server when it was last saved. Hooks run before `current` exists.
  const [picked, setPicked] = useState<Point | null>(null)
  const image = useImageUpload()

  if (store.isPending) return <StoreSettingsSkeleton messages={ui} />

  if (store.isError) {
    return <StoreErrorAlert message={storeErrorCopy(store.error, web) ?? web.errors.UNKNOWN} />
  }

  const current = store.data

  return (
    <div className="flex w-full flex-col gap-4">
      {update.isSuccess ? (
        <p role="status" className="text-sm text-muted-foreground">
          {web.stores.settings.saved}
        </p>
      ) : null}
      <StoreSettingsForm
        slug={current.slug}
        defaultValues={toSettingsValues(current)}
        categories={categories.data ?? []}
        onZipCodeLookup={zipCode.lookup}
        onAddressSearch={setAddressQuery}
        suggestions={addresses.suggestions}
        addressSearchPending={addresses.pending}
        onPointChange={setPicked}
        point={picked ?? pointOf(current)}
        mapTileUrl={mapTileUrl()}
        zipCodeLookupPending={zipCode.pending}
        onImageUpload={image.upload}
        imageUploadPending={image.pending}
        pending={update.isPending}
        error={firstStoreErrorCopy([update.error, image.error, zipCode.error], web)}
        messages={ui}
        onSubmit={(values) => {
          // A lookup that failed ten minutes ago is not what a save is refused for. The card has
          // one place for a sentence, so the older failures are cleared before a new one can arrive.
          zipCode.reset()
          image.reset()
          update.mutate(toUpdatePayload(current, values))
        }}
      />
    </div>
  )
}
