"use client"

// Libs
import { ChevronDownIcon, ChevronUpIcon, Trash2Icon } from "lucide-react"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import type { SlideTarget, SlideTargetOption, SlideValue } from "./banner-slides-field"

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

  const targetLabel = (target: string) =>
    target === "CATEGORY"
      ? banner.targetCategory
      : target === "PRODUCT"
        ? banner.targetProduct
        : target === "EXTERNAL"
          ? banner.targetExternal
          : banner.targetNone

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

      <Field orientation="responsive">
        <FieldLabel htmlFor={`slide-target-${slide.id}`}>{banner.targetLabel}</FieldLabel>
        <FieldContent>
          <Select
            value={slide.target}
            onValueChange={(next: string | null) => onSet({ target: (next ?? "NONE") as SlideTarget })}
          >
            <SelectTrigger id={`slide-target-${slide.id}`}>
              <SelectValue>{(selected: string) => targetLabel(selected)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">{banner.targetNone}</SelectItem>
              <SelectItem value="CATEGORY">{banner.targetCategory}</SelectItem>
              <SelectItem value="PRODUCT">{banner.targetProduct}</SelectItem>
              <SelectItem value="EXTERNAL">{banner.targetExternal}</SelectItem>
            </SelectContent>
          </Select>
        </FieldContent>
      </Field>

      {slide.target === "CATEGORY" ? (
        <SlidePicker
          id={`slide-category-${slide.id}`}
          label={banner.categoryLabel}
          empty={banner.categoryNone}
          options={categories}
          value={slide.categoryId}
          onChange={(next) => onSet({ categoryId: next })}
        />
      ) : null}

      {slide.target === "PRODUCT" ? (
        <SlidePicker
          id={`slide-product-${slide.id}`}
          label={banner.productLabel}
          empty={banner.productNone}
          options={products}
          value={slide.productId}
          onChange={(next) => onSet({ productId: next })}
        />
      ) : null}

      {slide.target === "EXTERNAL" ? (
        <Field>
          <FieldLabel htmlFor={`slide-url-${slide.id}`}>{banner.externalLabel}</FieldLabel>
          <FieldContent>
            <Input
              id={`slide-url-${slide.id}`}
              type="url"
              value={slide.externalUrl}
              onChange={(event) => onSet({ externalUrl: event.target.value })}
              placeholder="https://"
            />
            <FieldDescription>{banner.externalHelp}</FieldDescription>
          </FieldContent>
        </Field>
      ) : null}
    </div>
  )
}

/** A picker over things that survive a rename: the label is the name, the value is the id. */
function SlidePicker({
  id,
  label,
  empty,
  options,
  value,
  onChange,
}: {
  id: string
  label: string
  empty: string
  options: readonly SlideTargetOption[]
  value: string
  onChange: (value: string) => void
}) {
  const nameOf = (candidate: string) => options.find((option) => option.id === candidate)?.name ?? empty

  return (
    <Field orientation="responsive">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <FieldContent>
        <Select value={value} onValueChange={(next: string | null) => onChange(next ?? "")}>
          <SelectTrigger id={id}>
            <SelectValue>{(selected: string) => nameOf(selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldContent>
    </Field>
  )
}
