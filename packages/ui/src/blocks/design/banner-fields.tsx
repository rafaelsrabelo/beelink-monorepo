"use client"

// UI
import { Field, FieldContent, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { BannerSlidesField } from "./banner-slides-field"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"

export type BannerLayout = "FULL" | "HALVES" | "THIRDS"

/** What a banner has beyond a heading: a shape, and its pictures. */
export interface BannerValue {
  layout: BannerLayout
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
 * A banner's own fields: how wide it sits in a row, and the pictures in it.
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
  const text = messages.design

  const layoutLabel = (layout: string) =>
    layout === "HALVES" ? text.sizeHalves : layout === "THIRDS" ? text.sizeThirds : text.sizeFull

  return (
    <>
      <Field orientation="responsive">
        <FieldLabel htmlFor="component-layout">{text.sizeLabel}</FieldLabel>
        <FieldContent>
          <Select
            value={value.layout}
            onValueChange={(next: string | null) => onChange({ layout: (next ?? "FULL") as BannerLayout })}
          >
            <SelectTrigger id="component-layout">
              <SelectValue>{(selected: string) => layoutLabel(selected)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL">{text.sizeFull}</SelectItem>
              <SelectItem value="HALVES">{text.sizeHalves}</SelectItem>
              <SelectItem value="THIRDS">{text.sizeThirds}</SelectItem>
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      <BannerSlidesField
        value={value.slides}
        onChange={(next) => onChange({ slides: next })}
        categories={categories}
        products={products}
        {...(onUploadImage ? { onUploadImage } : {})}
        imagePending={imagePending}
        newSlideId={newItemId}
        messages={messages}
      />
    </>
  )
}
