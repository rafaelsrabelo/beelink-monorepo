"use client"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnnouncementFields } from "./announcement-fields"
import { BannerFields } from "./banner-fields"
import type { SlideTargetOption, SlideValue } from "./banner-slides-field"
import { BenefitRowsField } from "./benefit-rows-field"
import { ButtonFields } from "./button-fields"
import type { BenefitValue } from "./benefit-rows-field"
import { ComponentTextFields } from "./component-text-fields"
import { contentReady, type ComponentFormValues } from "./component-form"
import { ContactFieldsField } from "./contact-fields-field"
import type { ContactFieldValue } from "./contact-fields-field"
import type { ComponentDisplay } from "./design-types"
import { ImageTextFields } from "./image-text-fields"
import { FaqItemsField, type FaqValue } from "./faq-items-field"
import { ShowcaseFields } from "./showcase-fields"
import type { ShowcasePick } from "./showcase-picks-field"

// Re-exported, because the package's export map points `./blocks/*` at `.tsx`: a types-only `.ts`
// beside a block cannot be reached from an app.
export type { BenefitValue, ComponentFormValues, ContactFieldValue, FaqValue, ShowcasePick, SlideTargetOption, SlideValue }
export { contentReady }

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

      {value.kind === "CALL_TO_ACTION" ? (
        <ButtonFields value={value} onChange={merge} categories={categories} products={products} messages={messages} />
      ) : null}

      {value.kind === "IMAGE_TEXT" ? (
        <ImageTextFields
          value={value}
          onChange={merge}
          categories={categories}
          products={products}
          {...(onUploadImage ? { onUploadImage } : {})}
          imagePending={imagePending}
          messages={messages}
        />
      ) : null}

      {value.kind === "FAQ" ? (
        <FaqItemsField value={value.faq} onChange={(faq) => merge({ faq })} newItemId={newItemId} messages={messages} />
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
