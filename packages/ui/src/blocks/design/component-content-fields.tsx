"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnnouncementFields } from "./announcement-fields"
import { BannerFields } from "./banner-fields"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"
import { BenefitRowsField } from "./benefit-rows-field"
import type { BenefitValue } from "./benefit-rows-field"
import { ComponentTextFields } from "./component-text-fields"
import { ContactFieldsField, reachesBack } from "./contact-fields-field"
import type { ContactFieldValue } from "./contact-fields-field"
import type { ComponentDisplay, ComponentKind, ProductSource } from "./design-types"
import { ShowcaseFields, showcaseReady } from "./showcase-fields"
import type { ShowcasePick } from "./showcase-picks-field"
import type { Target } from "./target-fields"

/**
 * What a component's content holds while it is being filled in: one shape for every kind, of which
 * the fields draw only what the kind has. `""` where the wire carries null.
 *
 * What a block says, and nothing of how it sits: the format, the columns and the alignment are the
 * Layout tab's, held in the draft until Publicar; the strip's colour is its band's, in Estilo.
 */
export interface ComponentFormValues {
  kind: ComponentKind
  title: string
  subtitle: string
  body: string
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

export interface ComponentContentFieldsProps {
  value: ComponentFormValues
  onChange: (value: ComponentFormValues) => void
  /** How a banner's pictures sit, chosen in the Layout tab: its hint says what one more picture does. */
  display?: ComponentDisplay | null
  categories: readonly SlideTargetOption[]
  products: readonly SlideTargetOption[]
  optionsState?: "ready" | "loading" | "failed"
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  newItemId: () => string
  messages?: UiMessages
}

/**
 * Whether what the fields hold is a save the API would take: a contact form someone can answer, a
 * showcase whose source has what it needs. Asked here so Salvar says so, rather than a 400.
 */
export function contentReady(value: ComponentFormValues): boolean {
  if (value.kind === "CONTACT") return reachesBack(value.fields)
  if (value.kind === "PRODUCTS") return showcaseReady(value)

  return true
}

/**
 * Every component's content, dispatched on its kind — the Conteúdo tab.
 *
 * One set of fields and not seven screens, because the shopkeeper opens it the same way every time
 * — by clicking the block. What made the old panel unusable was the opposite: some kinds had a form
 * on a screen of their own, some had no form at all, and the ones with none were the ones reported
 * as "não consigo editar".
 */
export function ComponentContentFields({
  value,
  onChange,
  display,
  categories,
  products,
  optionsState = "ready",
  onUploadImage,
  imagePending = false,
  newItemId,
  messages = defaultMessages,
}: ComponentContentFieldsProps) {
  const merge = (next: Partial<ComponentFormValues>) => onChange({ ...value, ...next })

  return (
    <>
      <ComponentTextFields kind={value.kind} value={value} onChange={merge} messages={messages} />

      {value.kind === "ANNOUNCEMENT" ? (
        <AnnouncementFields value={value} onChange={merge} categories={categories} products={products} messages={messages} />
      ) : null}

      {value.kind === "BANNER" ? (
        <BannerFields
          value={value}
          onChange={merge}
          {...(display ? { display } : {})}
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
          onChange={(benefits) => merge({ benefits })}
          newRowId={newItemId}
          messages={messages}
        />
      ) : null}

      {value.kind === "CONTACT" ? (
        <ContactFieldsField
          value={value.fields}
          onChange={(fields) => merge({ fields })}
          newFieldId={newItemId}
          messages={messages}
        />
      ) : null}

      {value.kind === "PRODUCTS" ? (
        <ShowcaseFields
          value={value}
          onChange={merge}
          categories={categories}
          products={products}
          newItemId={newItemId}
          optionsState={optionsState}
          messages={messages}
        />
      ) : null}
    </>
  )
}
