"use client"

// UI
import { Button } from "@harness-monorepo/ui/components/button"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { ProductBasicsFields } from "./product-basics-fields"
import type { ProductCategoryOption, ProductFormIssues, ProductFormValues } from "./product-form-types"
import { ProductInventoryFields } from "./product-inventory-fields"
import { ProductMediaField } from "./product-media-field"
import { ProductOrganizationFields } from "./product-organization-fields"
import { ProductPricingFields } from "./product-pricing-fields"
import { ProductSection } from "./product-section"
import { ProductShippingFields } from "./product-shipping-fields"

export interface ProductEditorProps {
  value: ProductFormValues
  onChange: (value: ProductFormValues) => void
  categories: readonly ProductCategoryOption[]
  shopSlug: string
  /** The shop's own word for products, so the address line shows the real one. */
  productsWord: string
  errors?: ProductFormIssues
  /** A sentence, already in the reader's language. This package never sees an `errorCode`. */
  error?: string
  onUploadImage: (file: File) => Promise<string>
  imagePending?: boolean
  onCreateCategory?: (name: string) => Promise<string>
  creatingCategory?: boolean
  onSubmit: () => void
  onCancel: () => void
  pending?: boolean
  submitLabel: string
  messages?: UiMessages
}

/**
 * One product, on a page of its own.
 *
 * Six cards rather than one column, and the order is the order a shopkeeper answers them in: name
 * it, photograph it, file it, price it — and then, whenever the shipping integration matters to
 * them, weigh it. The last two cards are the ones most often left alone, which is why they are
 * last and why nothing in them is required.
 *
 * It is a page and not a dialog because a product is not a quick edit: it has photographs to
 * upload and a description to write, and a dialog that holds that much is a page with a worse
 * scrollbar — and one an accidental click outside can throw away.
 */
export function ProductEditor({
  value,
  onChange,
  categories,
  shopSlug,
  productsWord,
  errors,
  error,
  onUploadImage,
  imagePending,
  onCreateCategory,
  creatingCategory,
  onSubmit,
  onCancel,
  pending = false,
  submitLabel,
  messages = defaultMessages,
}: ProductEditorProps) {
  const text = messages.catalog.products
  const sections = messages.catalog.sections

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <ProductSection title={sections.basics} hint={sections.basicsHint}>
        <ProductBasicsFields
          value={value}
          onChange={onChange}
          shopSlug={shopSlug}
          productsWord={productsWord}
          errors={errors}
          disabled={pending}
          messages={messages}
        />
      </ProductSection>

      <ProductSection title={sections.media}>
        <ProductMediaField
          value={value.imageUrls}
          onChange={(imageUrls) => onChange({ ...value, imageUrls })}
          onUpload={onUploadImage}
          pending={imagePending}
          disabled={pending}
          messages={messages}
        />
      </ProductSection>

      <ProductSection title={sections.organization} hint={sections.organizationHint}>
        <ProductOrganizationFields
          value={value}
          onChange={onChange}
          categories={categories}
          onCreateCategory={onCreateCategory}
          creatingCategory={creatingCategory}
          disabled={pending}
          messages={messages}
        />
      </ProductSection>

      <ProductSection title={sections.pricing} hint={sections.pricingHint}>
        <ProductPricingFields
          value={value}
          onChange={onChange}
          errors={errors}
          disabled={pending}
          messages={messages}
        />
      </ProductSection>

      <ProductSection title={sections.inventory} hint={sections.inventoryHint}>
        <ProductInventoryFields value={value} onChange={onChange} disabled={pending} messages={messages} />
      </ProductSection>

      <ProductSection title={sections.shipping} hint={sections.shippingHint}>
        <ProductShippingFields
          value={value}
          onChange={onChange}
          errors={errors}
          disabled={pending}
          messages={messages}
        />
      </ProductSection>

      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}

      {/* Sticky, because the form is six cards tall and a save button below all of them is a
          button a shopkeeper has to go looking for. */}
      <div className="bg-shell-content sticky bottom-0 flex justify-end gap-2 border-t py-3">
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          {text.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : submitLabel}
        </Button>
      </div>
    </form>
  )
}
