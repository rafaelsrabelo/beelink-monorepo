"use client"

// UI
import { valuePhotoOf, type TaggedPhoto } from "@harness-monorepo/ui/lib/photo-choice"
import { targetOf, valueStateOf, type ChoiceOption, type ChoiceVariant, type Selection } from "@harness-monorepo/ui/lib/variant-choice"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { formatCents } from "./storefront-price"
import { StorefrontVariantOption } from "./storefront-variant-option"

export interface StorefrontVariantPickerProps {
  options: readonly ChoiceOption[]
  variants: readonly ChoiceVariant[]
  selection: Selection
  onSelect: (optionId: string, valueId: string) => void
  /** The product's photos, so a value tagged in one shows it on its card. */
  images?: readonly (TaggedPhoto & { url: string })[]
  /** A price on every value, in this language; absent — the shop hides prices — none. */
  locale?: string
  messages?: UiMessages
}

/**
 * Every option of the product, as 5b draws them: photo cards for an option whose values have a photo
 * or a colour, pills for the rest. Each value carries what it would cost with the rest of the choice
 * kept — on every value, as 5b does, even when they cost the same.
 */
export function StorefrontVariantPicker({ options, variants, selection, onSelect, images = [], locale, messages = defaultMessages }: StorefrontVariantPickerProps) {
  return (
    <div className="flex flex-col gap-3.5">
      {options.map((option) => {
        const photos = option.values.map((value) => valuePhotoOf(images, value.id)?.url ?? null)
        const cards = photos.some(Boolean) || option.values.some((value) => value.colorHex)

        return (
          <StorefrontVariantOption
            key={option.id}
            option={option}
            states={option.values.map((value) => valueStateOf(selection, option.id, value.id, options, variants))}
            prices={option.values.map((value) => {
              const cents = locale ? targetOf(selection, option.id, value.id, options, variants)?.priceCents : undefined
              return cents === undefined || !locale ? null : formatCents(cents, locale, "BRL")
            })}
            photos={photos}
            chosenId={selection[option.id]}
            layout={cards ? "cards" : "pills"}
            onSelect={(valueId) => onSelect(option.id, valueId)}
            messages={messages}
          />
        )
      })}
    </div>
  )
}
