"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BannerSlidesField } from "./banner-slides-field"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"
import type { ComponentDisplay } from "./design-types"
import { DisplayField } from "./display-field"

/**
 * What a banner has beyond a heading: how its pictures sit, and the pictures. Not its width — that
 * is every block's, chosen on the block's card in the panel, and a second control for it here wrote
 * the same column behind the draft's back.
 */
export interface BannerValue {
  display: ComponentDisplay
  slides: SlideValue[]
}

export interface BannerFieldsProps {
  value: BannerValue
  onChange: (next: Partial<BannerValue>) => void
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  newItemId: () => string
  messages?: UiMessages
}

/**
 * A banner's own fields: whether its pictures take turns or share the space, and the pictures.
 *
 * Its own block because the component form had passed the line limit, and the seam falls here —
 * the form knows which kind it is holding, and this knows what a banner is.
 */
export function BannerFields({
  value,
  onChange,
  categories,
  products,
  onUploadImage,
  imagePending = false,
  newItemId,
  messages = defaultMessages,
}: BannerFieldsProps) {
  return (
    <>
      <DisplayField value={value.display} onChange={(display) => onChange({ display })} messages={messages} />

      <BannerSlidesField
        value={value.slides}
        onChange={(next) => onChange({ slides: next })}
        categories={categories}
        products={products}
        {...(onUploadImage ? { onUploadImage } : {})}
        imagePending={imagePending}
        newSlideId={newItemId}
        display={value.display}
        messages={messages}
      />
    </>
  )
}
