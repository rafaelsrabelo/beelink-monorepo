"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import type { FieldIssues } from "../store/store-types"

export type BannerFormLayout = "FULL" | "HALVES" | "THIRDS"
export type BannerFormTarget = "CATEGORY" | "PRODUCT" | "EXTERNAL"

export interface BannerFormValues {
  title: string
  subtitle: string
  imageUrl: string
  layout: BannerFormLayout
  target: BannerFormTarget
  /** `""` is "not chosen". A select cannot hold null, and the screen turns it back. */
  categorySlug: string
  productSlug: string
  externalUrl: string
  isActive: boolean
}

export interface BannerTargetOption {
  slug: string
  name: string
}

export interface BannerFormProps {
  value: BannerFormValues
  onChange: (value: BannerFormValues) => void
  categories: readonly BannerTargetOption[]
  products: readonly BannerTargetOption[]
  errors?: FieldIssues<BannerFormValues>
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  messages?: UiMessages
}

export const EMPTY_BANNER: BannerFormValues = {
  title: "",
  subtitle: "",
  imageUrl: "",
  layout: "FULL",
  target: "CATEGORY",
  categorySlug: "",
  productSlug: "",
  externalUrl: "",
  isActive: true,
}

/**
 * Where a banner goes and what it looks like.
 *
 * The three destinations are held side by side rather than in one field the target switches. A
 * shopkeeper who picks a category, changes their mind, picks a product and changes back should
 * find their first choice still there — a single field would have thrown it away, and the cost of
 * keeping all three is two strings nobody reads.
 *
 * Only the one the target names is sent. The API clears the other two, so the row can never
 * disagree with itself and the database refuses the attempt besides.
 */
export function BannerForm({
  value,
  onChange,
  categories,
  products,
  errors = {},
  onUploadImage,
  imagePending = false,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: BannerFormProps) {
  const text = messages.banners
  const set = <K extends keyof BannerFormValues>(key: K, next: BannerFormValues[K]) =>
    onChange({ ...value, [key]: next })

  const layoutLabel = (layout: string) =>
    layout === "HALVES" ? text.layoutHalves : layout === "THIRDS" ? text.layoutThirds : text.layoutFull

  const targetLabel = (target: string) =>
    target === "PRODUCT" ? text.targetProduct : target === "EXTERNAL" ? text.targetExternal : text.targetCategory

  const picker = (
    key: "categorySlug" | "productSlug",
    options: readonly BannerTargetOption[],
    label: string,
    placeholder: string,
  ) => (
    <Field>
      <FieldLabel htmlFor={`banner-${key}`}>{label}</FieldLabel>
      <Select
        disabled={pending}
        value={value[key] === "" ? "none" : value[key]}
        onValueChange={(next: string | null) => set(key, !next || next === "none" ? "" : next)}
      >
        <SelectTrigger id={`banner-${key}`}>
          {/* A render function, not a bare value: Base UI shows the raw one, so the trigger would
              read "none" — the sentinel, on screen. */}
          <SelectValue>
            {(selected: string) =>
              selected === "none" || !selected
                ? placeholder
                : (options.find((option) => option.slug === selected)?.name ?? placeholder)
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{placeholder}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.slug} value={option.slug}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors[key]?.message ? <FieldError>{errors[key]?.message}</FieldError> : null}
    </Field>
  )

  return (
    <form
      className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-5 shadow-xs"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <Field>
        <FieldLabel htmlFor="banner-title">{text.titleLabel}</FieldLabel>
        <Input
          id="banner-title"
          disabled={pending}
          placeholder={text.titlePlaceholder}
          value={value.title}
          onChange={(event) => set("title", event.target.value)}
        />
        {errors.title?.message ? <FieldError>{errors.title.message}</FieldError> : null}
      </Field>

      <Field>
        <FieldLabel htmlFor="banner-subtitle">{text.subtitleLabel}</FieldLabel>
        <Input
          id="banner-subtitle"
          disabled={pending}
          value={value.subtitle}
          onChange={(event) => set("subtitle", event.target.value)}
        />
        <FieldDescription>{text.subtitleHelp}</FieldDescription>
      </Field>

      <StoreImageField
        id="banner-image"
        label={text.imageLabel}
        hint={text.imageHelp}
        value={value.imageUrl}
        onChange={(next) => set("imageUrl", next)}
        onUpload={onUploadImage}
        pending={imagePending}
        // Landscape, because that is the shape the shop draws it in. A square preview here would
        // show the shopkeeper a crop their own page never renders.
        previewAlt={value.title || text.imageLabel}
        aspect="wide"
        recommendedSize={{ width: 1200, height: 675 }}
        disabled={pending}
        {...(errors.imageUrl ? { error: errors.imageUrl } : {})}
      />

      <Field>
        <FieldLabel htmlFor="banner-layout">{text.layoutLabel}</FieldLabel>
        <Select
          disabled={pending}
          value={value.layout}
          onValueChange={(next: string | null) => set("layout", (next ?? "FULL") as BannerFormLayout)}
        >
          <SelectTrigger id="banner-layout">
            <SelectValue>{(selected: string) => layoutLabel(selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="FULL">{text.layoutFull}</SelectItem>
            <SelectItem value="HALVES">{text.layoutHalves}</SelectItem>
            <SelectItem value="THIRDS">{text.layoutThirds}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor="banner-target">{text.targetLabel}</FieldLabel>
        <Select
          disabled={pending}
          value={value.target}
          onValueChange={(next: string | null) => set("target", (next ?? "CATEGORY") as BannerFormTarget)}
        >
          <SelectTrigger id="banner-target">
            <SelectValue>{(selected: string) => targetLabel(selected)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="CATEGORY">{text.targetCategory}</SelectItem>
            <SelectItem value="PRODUCT">{text.targetProduct}</SelectItem>
            <SelectItem value="EXTERNAL">{text.targetExternal}</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      {value.target === "CATEGORY" ? picker("categorySlug", categories, text.categoryLabel, text.categoryNone) : null}
      {value.target === "PRODUCT" ? picker("productSlug", products, text.productLabel, text.productNone) : null}

      {value.target === "EXTERNAL" ? (
        <Field>
          <FieldLabel htmlFor="banner-external">{text.externalLabel}</FieldLabel>
          <Input
            id="banner-external"
            type="url"
            inputMode="url"
            disabled={pending}
            placeholder="https://"
            value={value.externalUrl}
            onChange={(event) => set("externalUrl", event.target.value)}
          />
          <FieldDescription>{text.externalHelp}</FieldDescription>
          {errors.externalUrl?.message ? <FieldError>{errors.externalUrl.message}</FieldError> : null}
        </Field>
      ) : null}

      <Field orientation="horizontal">
        <Checkbox
          id="banner-active"
          disabled={pending}
          checked={value.isActive}
          onCheckedChange={(checked) => set("isActive", checked)}
        />
        <FieldContent>
          <FieldLabel htmlFor="banner-active">{text.activeLabel}</FieldLabel>
          <FieldDescription>{text.activeHelp}</FieldDescription>
        </FieldContent>
      </Field>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : text.save}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {text.cancel}
        </Button>
      </div>
    </form>
  )
}
