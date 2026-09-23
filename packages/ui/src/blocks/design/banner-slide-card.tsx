"use client"

// Libs
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import { TargetFields } from "./target-fields"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"

export interface BannerSlideCardProps {
  slide: SlideValue
  at: number
  total: number
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  onSet: (next: Partial<SlideValue>) => void
  onMove: (by: number) => void
  onRemove: () => void
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  messages: UiMessages
}

/**
 * One picture of a banner, with its words and where it goes.
 *
 * Its own file because the list it came out of had reached the line limit, and the split falls
 * where the responsibility does — the list owns how many there are and their order, and this owns
 * what one slide holds.
 */
export function BannerSlideCard({
  slide,
  at,
  total,
  categories,
  products,
  onSet,
  onMove,
  onRemove,
  onUploadImage,
  imagePending = false,
  messages,
}: BannerSlideCardProps) {
  const text = messages.design
  const banner = messages.banners
  const name = format(text.slidePosition, { position: String(at + 1), total: String(total) })


  return (
    <div className="border-shell-border flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium uppercase">{name}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${banner.moveUp}: ${name}`}
            disabled={at === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronUpIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${banner.moveDown}: ${name}`}
            disabled={at === total - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`${banner.delete}: ${name}`}
            onClick={onRemove}
          >
            <Trash2Icon aria-hidden="true" className="size-4" />
          </Button>
        </div>
      </div>

      <StoreImageField
        id={`slide-${slide.id}`}
        label={banner.imageLabel}
        value={slide.imageUrl}
        onChange={(next) => onSet({ imageUrl: next })}
        {...(onUploadImage ? { onUpload: onUploadImage } : {})}
        pending={imagePending}
        hint={banner.imageHelp}
        previewAlt={banner.imageLabel}
        aspect="wide"
        messages={messages}
      />

      <Field>
        <FieldLabel htmlFor={`slide-title-${slide.id}`}>{banner.titleLabel}</FieldLabel>
        <FieldContent>
          <Input
            id={`slide-title-${slide.id}`}
            value={slide.title}
            onChange={(event) => onSet({ title: event.target.value })}
            placeholder={banner.titlePlaceholder}
          />
        </FieldContent>
      </Field>

      <Field>
        <FieldLabel htmlFor={`slide-subtitle-${slide.id}`}>{banner.subtitleLabel}</FieldLabel>
        <FieldContent>
          <Input
            id={`slide-subtitle-${slide.id}`}
            value={slide.subtitle}
            onChange={(event) => onSet({ subtitle: event.target.value })}
          />
          <FieldDescription>{banner.subtitleHelp}</FieldDescription>
        </FieldContent>
      </Field>

      <TargetFields
        idPrefix={`slide-${slide.id}`}
        value={slide}
        onChange={onSet}
        categories={categories}
        products={products}
        messages={messages}
      />
    </div>
  )
}
