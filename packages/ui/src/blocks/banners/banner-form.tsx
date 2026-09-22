"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Checkbox } from "@harness-monorepo/ui/components/checkbox"
import { Field, FieldContent, FieldDescription, FieldError, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@harness-monorepo/ui/components/select"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import type { FieldIssues } from "../store/store-types"
import { BannerTargetFields } from "./banner-target-fields"
import { EMPTY_BANNER } from "./banner-form-types"
import type {
  BannerFormLayout,
  BannerFormTarget,
  BannerFormValues,
  BannerTargetOption,
} from "./banner-form-types"

/**
 * Re-exported here, and that is not tidiness. The package's export map points `./blocks/*` at
 * `.tsx`, so a types-only `.ts` beside a block cannot be imported from an app — the screen reaches
 * them through the block it is already importing.
 */
export { EMPTY_BANNER }
export type { BannerFormLayout, BannerFormTarget, BannerFormValues, BannerTargetOption }

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

/**
 * What a poster is: a title, a line, a picture, a shape — and somewhere to go.
 *
 * Where it goes is its own block, because it is the only part with a rule worth stating on its own.
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

      <BannerTargetFields
        value={value}
        onChange={onChange}
        categories={categories}
        products={products}
        errors={errors}
        disabled={pending}
        messages={messages}
      />

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
