"use client"

// React
import { useState } from "react"

// UI
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@harness-monorepo/ui/components/alert-dialog"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { cn } from "@harness-monorepo/ui/lib/utils"
import { photoValuesOf, setPhotoValues } from "@harness-monorepo/ui/lib/variation-photos"
import { combinationCountOf, type VariationsValue } from "@harness-monorepo/ui/lib/variations"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { PhotoValuesPicker } from "./photo-values-picker"
import { ProductBasicsFields } from "./product-basics-fields"
import type { ProductCategoryOption, ProductFormIssues, ProductFormValues } from "./product-form-types"
import { ProductInventoryFields } from "./product-inventory-fields"
import { ProductMediaField } from "./product-media-field"
import { ProductOrganizationFields } from "./product-organization-fields"
import { ProductPricingFields } from "./product-pricing-fields"
import { ProductSection } from "./product-section"
import { ProductShippingFields } from "./product-shipping-fields"
import { ProductVariationsFields, type VariationIssues } from "./product-variations-fields"

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
  /** The variations section; absent, the editor has none — as when the product is not saved yet. */
  variations?: {
    value: VariationsValue
    onChange: (value: VariationsValue) => void
    errors?: VariationIssues
  }
  /** Something is not saved: the footer says so, and Cancel asks before throwing it away. */
  dirty?: boolean
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
  variations,
  dirty = false,
  messages = defaultMessages,
}: ProductEditorProps) {
  const text = messages.catalog.products
  const sections = messages.catalog.sections
  const perCombination = variations ? combinationCountOf(variations.value.options) > 0 : false
  const [leaving, setLeaving] = useState(false)

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
          photoFooter={
            variations && perCombination
              ? (url, index) => (
                  <PhotoValuesPicker
                    options={variations.value.options}
                    value={photoValuesOf(variations.value, url)}
                    onChange={(keys) => variations.onChange(setPhotoValues(variations.value, url, keys))}
                    number={index + 1}
                    disabled={pending}
                    messages={messages}
                  />
                )
              : undefined
          }
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
        {perCombination ? (
          <p className="text-muted-foreground text-sm">{sections.perCombination}</p>
        ) : (
          <ProductPricingFields
            value={value}
            onChange={onChange}
            errors={errors}
            disabled={pending}
            messages={messages}
          />
        )}
      </ProductSection>

      {variations ? (
        <ProductSection title={sections.variations} hint={sections.variationsHint}>
          <ProductVariationsFields
            value={variations.value}
            onChange={variations.onChange}
            base={{ isActive: true, price: value.price, stock: value.stock, sku: value.sku, weight: value.weight }}
            trackStock={value.trackStock}
            photos={value.imageUrls}
            errors={variations.errors}
            disabled={pending}
            messages={messages}
          />
        </ProductSection>
      ) : null}

      <ProductSection title={sections.inventory} hint={sections.inventoryHint}>
        <ProductInventoryFields
          value={value}
          onChange={onChange}
          perCombination={perCombination}
          disabled={pending}
          messages={messages}
        />
      </ProductSection>

      <ProductSection title={sections.shipping} hint={sections.shippingHint}>
        <ProductShippingFields
          value={value}
          onChange={onChange}
          errors={errors}
          perCombination={perCombination}
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
      <div className="bg-shell-content sticky bottom-0 flex items-center justify-end gap-2 border-t py-3">
        {dirty ? <p className="text-muted-foreground mr-auto text-sm">{text.unsaved}</p> : null}
        <Button type="button" variant="ghost" disabled={pending} onClick={() => (dirty ? setLeaving(true) : onCancel())}>
          {text.cancel}
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? text.saving : submitLabel}
        </Button>
      </div>

      <AlertDialog open={leaving} onOpenChange={(open: boolean) => setLeaving(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{text.leaveTitle}</AlertDialogTitle>
            <AlertDialogDescription>{text.leaveBody}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* Staying keeps the default focus: Enter on this question must not lose the edit. */}
            <AlertDialogCancel>{text.keepEditing}</AlertDialogCancel>
            <AlertDialogAction className={cn(buttonVariants({ variant: "destructive" }))} onClick={onCancel}>
              {text.leaveConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
