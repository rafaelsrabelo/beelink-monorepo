"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AlignField } from "./align-field"
import { AnnouncementFields } from "./announcement-fields"
import { BannerFields } from "./banner-fields"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"
import { BenefitRowsField } from "./benefit-rows-field"
import { CategoriesFields } from "./categories-fields"
import { ComponentTextFields } from "./component-text-fields"
import type { BenefitValue } from "./benefit-rows-field"
import { ContactFieldsField, reachesBack } from "./contact-fields-field"
import type { ContactFieldValue } from "./contact-fields-field"
import type { ComponentDisplay, ComponentKind, ProductSource, TextAlign } from "./design-types"
import { ShowcaseFields, showcaseReady } from "./showcase-fields"
import type { ShowcasePick } from "./showcase-picks-field"
import type { Target } from "./target-fields"

/**
 * What a component's form holds while it is being filled in: one shape for every kind, of which
 * the form draws only the fields the kind has. `""` where the wire carries null.
 */
export interface ComponentFormValues {
  kind: ComponentKind
  title: string
  subtitle: string
  body: string
  display: ComponentDisplay
  /** `0` is "let the grid decide", which is what null means on the wire. */
  columns: number
  /** Always resolved here — the kind's own habit stands in for a null — so the toggle marks one. */
  align: TextAlign
  /**
   * The strip's colour, which is its band's. The announcement is the one component whose band is
   * not drawn where it sits, so the band's colour is asked for here, beside the words it paints.
   * `""` is "as it always was".
   */
  background: string
  /** Where the strip leads — the same destination a slide holds, held once for the whole strip. */
  target: Target
  categoryId: string
  productId: string
  externalUrl: string
  slides: SlideValue[]
  benefits: BenefitValue[]
  /** A contact form's questions. */
  fields: ContactFieldValue[]
  /** A showcase's source, and what that source reads: its category, or its products in order. */
  source: ProductSource
  sourceCategoryId: string
  picks: ShowcasePick[]
  /** A showcase's limit as typed; `""` is the default, 24. */
  limit: string
}

// Re-exported, because the package's export map points `./blocks/*` at `.tsx`: a types-only `.ts`
// beside a block cannot be reached from an app.
export type { BenefitValue, ContactFieldValue, ShowcasePick, SlideTargetOption, SlideValue }

export interface ComponentFormProps {
  value: ComponentFormValues
  onChange: (value: ComponentFormValues) => void
  /** What the page is painted, so turning the strip's colour on starts somewhere visible. */
  pageBackground: string
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  optionsState?: "ready" | "loading" | "failed"
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  newItemId: () => string
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  messages?: UiMessages
}

/**
 * Every component's fields, dispatched on its kind.
 *
 * One form and not seven screens, because the shopkeeper opens it the same way every time — by
 * clicking the row. What made the old panel unusable was the opposite: some kinds had a form on a
 * screen of their own, some had no form at all, and the ones with none were the ones reported as
 * "não consigo editar".
 */
export function ComponentForm({
  value,
  onChange,
  pageBackground,
  categories,
  products,
  optionsState = "ready",
  onUploadImage,
  imagePending = false,
  newItemId,
  onSubmit,
  onCancel,
  pending = false,
  messages = defaultMessages,
}: ComponentFormProps) {
  const banner = messages.banners
  const set = <K extends keyof ComponentFormValues>(key: K, next: ComponentFormValues[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <ComponentTextFields kind={value.kind} value={value} onChange={(next) => onChange({ ...value, ...next })} messages={messages} />

      {value.kind === "ANNOUNCEMENT" ? (
        <AnnouncementFields
          value={value}
          onChange={(next) => onChange({ ...value, ...next })}
          pageBackground={pageBackground}
          categories={categories}
          products={products}
          messages={messages}
        />
      ) : null}

      {value.kind === "HEADING" || value.kind === "TEXT" ? (
        <AlignField value={value.align} onChange={(next) => set("align", next)} messages={messages} />
      ) : null}

      {value.kind === "CATEGORIES" ? (
        <CategoriesFields value={value} onChange={(next) => onChange({ ...value, ...next })} messages={messages} />
      ) : null}

      {value.kind === "BANNER" ? (
        <BannerFields
          value={value}
          onChange={(next) => onChange({ ...value, ...next })}
          categories={categories}
          products={products}
          {...(onUploadImage ? { onUploadImage } : {})}
          imagePending={imagePending}
          newItemId={newItemId}
          messages={messages}
        />
      ) : null}

      {value.kind === "BENEFITS" ? (
        <BenefitRowsField
          value={value.benefits}
          onChange={(next) => set("benefits", next)}
          newRowId={newItemId}
          messages={messages}
        />
      ) : null}

      {value.kind === "CONTACT" ? (
        <ContactFieldsField
          value={value.fields}
          onChange={(next) => set("fields", next)}
          newFieldId={newItemId}
          messages={messages}
        />
      ) : null}

      {value.kind === "PRODUCTS" ? (
        <ShowcaseFields
          value={value}
          onChange={(next) => onChange({ ...value, ...next })}
          categories={categories}
          products={products}
          newItemId={newItemId}
          optionsState={optionsState}
          messages={messages}
        />
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          {banner.cancel}
        </Button>
        <Button
          type="submit"
          disabled={
            pending || imagePending ||
            (value.kind === "CONTACT" && !reachesBack(value.fields)) ||
            (value.kind === "PRODUCTS" && !showcaseReady(value))
          }
        >
          {pending ? banner.saving : banner.save}
        </Button>
      </div>
    </form>
  )
}
