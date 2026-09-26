"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BannerSlidesField } from "./banner-slides-field"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"
import type { ComponentDisplay } from "./design-types"

/**
 * What a banner has beyond a heading: its pictures. Not its width nor its format — those are how it
 * sits, asked in the Layout tab and held in the draft until Publicar.
 */
export interface BannerValue {
  slides: SlideValue[]
}

export interface BannerFieldsProps {
  value: BannerValue
  onChange: (next: Partial<BannerValue>) => void
  /** How the pictures sit, chosen in the Layout tab: the hint says what one more picture does there. */
  display?: ComponentDisplay
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  newItemId: () => string
  messages?: UiMessages
}

/**
 * A banner's own fields: the pictures, each with its words and where it leads.
 *
 * Its own block, and the seam falls here: `ComponentContentFields` knows which kind it is holding,
 * and this knows what a banner is.
 */
export function BannerFields({
  value,
  onChange,
  display = "CAROUSEL",
  categories,
  products,
  onUploadImage,
  imagePending = false,
  newItemId,
  messages = defaultMessages,
}: BannerFieldsProps) {
  return (
    <BannerSlidesField
      value={value.slides}
      onChange={(next) => onChange({ slides: next })}
      categories={categories}
      products={products}
      {...(onUploadImage ? { onUploadImage } : {})}
      imagePending={imagePending}
      newSlideId={newItemId}
      display={display}
      messages={messages}
    />
  )
}
