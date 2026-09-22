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
import { SectionTargetFields } from "./section-target-fields"
import { EMPTY_BANNER } from "./section-form-types"
import type {
  SectionFormLayout,
  SectionFormPlacement,
  SectionFormTarget,
  SectionFormValues,
  SectionFormWidth,
  SectionTargetOption,
} from "./section-form-types"

/**
 * Re-exported here, and that is not tidiness. The package's export map points `./blocks/*` at
 * `.tsx`, so a types-only `.ts` beside a block cannot be imported from an app — the screen reaches
 * them through the block it is already importing.
 */
export { EMPTY_BANNER }
export type {
  SectionFormLayout,
  SectionFormPlacement,
  SectionFormTarget,
  SectionFormValues,
  SectionFormWidth,
  SectionTargetOption,
}

export interface SectionFormProps {
  value: SectionFormValues
  onChange: (value: SectionFormValues) => void
  categories: readonly SectionTargetOption[]
  products: readonly SectionTargetOption[]
  errors?: FieldIssues<SectionFormValues>
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
export function SectionForm({
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
}: SectionFormProps) {
  const text = messages.banners
  const set = <K extends keyof SectionFormValues>(key: K, next: SectionFormValues[K]) =>
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
        <FieldLabel htmlFor="banner-placement">{text.placementLabel}</FieldLabel>
        <Select
          disabled={pending}
          value={value.placement}
          onValueChange={(next: string | null) =>
            set("placement", (next ?? "BANNER") as SectionFormPlacement)
          }
        >
          <SelectTrigger id="banner-placement">
            <SelectValue>
              {(selected: string) =>
                selected === "HERO" ? text.placementHero : text.placementBody
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="HERO">{text.placementHero}</SelectItem>
            <SelectItem value="BANNER">{text.placementBody}</SelectItem>
          </SelectContent>
        </Select>
        <FieldDescription>{text.placementHelp}</FieldDescription>
      </Field>

      {/*
        The two shape questions are asked one at a time, because only one of them ever applies. A
        hero is as wide as the page or contained by it; a poster in the body is already contained,
        and what it chooses is how many sit beside it.
      */}
      {value.placement === "HERO" ? (
        <Field>
          <FieldLabel htmlFor="banner-width">{text.widthLabel}</FieldLabel>
          <Select
            disabled={pending}
            value={value.width}
            onValueChange={(next: string | null) => set("width", (next ?? "FULL") as SectionFormWidth)}
          >
            <SelectTrigger id="banner-width">
              <SelectValue>
                {(selected: string) => (selected === "CONTAINED" ? text.widthContained : text.widthFull)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FULL">{text.widthFull}</SelectItem>
              <SelectItem value="CONTAINED">{text.widthContained}</SelectItem>
            </SelectContent>
          </Select>
          <FieldDescription>{text.widthHelp}</FieldDescription>
        </Field>
      ) : (
      <Field>
        <FieldLabel htmlFor="banner-layout">{text.layoutLabel}</FieldLabel>
        <Select
          disabled={pending}
          value={value.layout}
          onValueChange={(next: string | null) => set("layout", (next ?? "FULL") as SectionFormLayout)}
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
      )}

      <SectionTargetFields
        value={value}
        onChange={onChange}
        categories={categories}
        products={products}
        errors={errors}
        disabled={pending}
        messages={messages}
      />

      {/*
        A slide has no visibility of its own: a hero is shown or hidden as one block, in design
        mode. Drawing the switch here would be offering a choice that changes nothing.
      */}
      {value.placement === "HERO" ? null : (
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
      )}

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
