"use client"

// Next
import { useRouter } from "next/navigation"

// UI
import { StoreCreateForm } from "@harness-monorepo/ui/blocks/store/store-create-form"
import { StoreSettingsSkeleton } from "@harness-monorepo/ui/blocks/store/store-settings-skeleton"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Types
import type { StoreColors } from "@harness-monorepo/contracts"
import type { WebMessages } from "@/locales"
import type { StoreCreateValues } from "@/components/store/store-payloads"

// App
import { StoreErrorAlert } from "@/components/store/store-error-alert"
import { firstStoreErrorCopy, storeErrorCopy } from "@/components/store/store-error-copy"
import { toCreatePayload } from "@/components/store/store-payloads"
import { useZipCodeLookup } from "@/services/cep/cep-hooks"
import { useCreateStore, useStoreCategories, useStoreColorPresets } from "@/services/stores/store-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"

export interface StoreCreateScreenProps {
  ui: UiMessages
  web: WebMessages
}

/**
 * The legacy five-step wizard, as one tabbed form. The steps were never a constraint the data
 * imposed — they were four screens over one insert — and the insert dropped everything steps 3 and
 * 4 collected. Here every group is on the wire and every field is the form library's, which is what
 * lets a refusal point at the tab that caused it.
 *
 * It waits for the palettes rather than opening on a colour of its own: a new shop's four colours
 * are the first palette's, and a literal here would be the one this workspace is not allowed to
 * hold (`web/no-hex-colors`). The categories ride along in the same wait — both are platform
 * reference data the identity and appearance tabs need before they can draw anything true.
 */
export function StoreCreateScreen({ ui, web }: StoreCreateScreenProps) {
  const router = useRouter()
  const categories = useStoreCategories()
  const presets = useStoreColorPresets()
  const create = useCreateStore()
  const zipCode = useZipCodeLookup()
  const image = useImageUpload()

  if (presets.isPending || categories.isPending) return <StoreSettingsSkeleton messages={ui} />

  // A list that came back empty is as unusable as one that failed: without a palette there is no
  // honest colour to open the appearance tab on, and four empty strings would be refused by the
  // form's own schema with a verdict nobody could act on.
  const palette = presets.data?.[0]

  if (!palette) {
    return <StoreErrorAlert message={storeErrorCopy(presets.error, web) ?? web.errors.UNKNOWN} />
  }

  return (
    <StoreCreateForm
      defaultValues={emptyStore(palette.colors)}
      categories={categories.data ?? []}
      colorPresets={presets.data}
      onZipCodeLookup={zipCode.lookup}
      zipCodeLookupPending={zipCode.pending}
      onImageUpload={image.upload}
      imageUploadPending={image.pending}
      pending={create.isPending}
      error={firstStoreErrorCopy([create.error, image.error, zipCode.error], web)}
      messages={ui}
      onSubmit={(values: StoreCreateValues) => {
        // The card has one place for a sentence: a postcode or an upload that failed earlier is
        // cleared, so what a refused create says is what the create was refused for.
        zipCode.reset()
        image.reset()
        create.mutate(toCreatePayload(values), {
          onSuccess: (store) => {
            // `replace`, not `push`: a back button that returns to a form which has already been
            // submitted offers to create the same shop twice.
            router.replace(`/admin/${store.slug}`)
          },
        })
      }}
    />
  )
}

/**
 * A shop before anything is typed. The slug stays empty and the form proposes one from the name;
 * the colours are the first palette's, which is the platform's own theme as far as this workspace
 * can see it — the column defaults live in the database and are served nowhere on their own.
 */
function emptyStore(colors: StoreColors): StoreCreateValues {
  return {
    slug: "",
    identity: { name: "", type: "ECOMMERCE", description: "", logoUrl: "", categoryId: "" },
    address: { zipCode: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" },
    social: { whatsapp: "", instagram: "", tiktok: "", spotify: "", youtube: "" },
    colors,
  }
}
