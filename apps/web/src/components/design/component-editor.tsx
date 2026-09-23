"use client"

// React
import { useState } from "react"

// Types
import type { BannerSlide, BenefitRow, StoreComponent, UpdateComponentPayload } from "@harness-monorepo/contracts"

// UI
import { ComponentForm } from "@harness-monorepo/ui/blocks/design/component-form"
import type { ComponentFormValues, SlideTargetOption } from "@harness-monorepo/ui/blocks/design/component-form"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@harness-monorepo/ui/components/sheet"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { useUpdateComponent } from "@/services/page/page-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"
import { labelOf } from "./design-draft"

/** The wire's nulls become the form's empty strings, which is the only shape an input can hold. */
function toForm(component: StoreComponent): ComponentFormValues {
  return {
    kind: component.kind,
    title: component.title ?? "",
    subtitle: component.subtitle ?? "",
    body: component.body ?? "",
    layout: component.layout,
    columns: component.columns ?? 0,
    slides:
      component.kind === "BANNER"
        ? (component.items as BannerSlide[]).map((slide) => ({
            id: slide.id,
            imageUrl: slide.imageUrl,
            title: slide.title ?? "",
            subtitle: slide.subtitle ?? "",
            target: slide.target,
            categoryId: slide.categoryId ?? "",
            productId: slide.productId ?? "",
            externalUrl: slide.externalUrl ?? "",
          }))
        : [],
    benefits:
      component.kind === "BENEFITS"
        ? (component.items as BenefitRow[]).map((row) => ({
            id: row.id,
            icon: row.icon,
            title: row.title,
            detail: row.detail ?? "",
          }))
        : [],
  }
}

/**
 * And back. An empty string is "no value", which on the wire is null.
 *
 * A slide keeps only the destination its target names: the form holds all three so a shopkeeper
 * who changes their mind does not lose what they typed, and the API refuses a slide carrying two.
 * A slide with no picture is dropped rather than sent — the API would refuse the whole save over
 * it, and a card the owner never filled in is not a mistake they meant to make.
 */
function toPayload(value: ComponentFormValues): UpdateComponentPayload {
  const slides: BannerSlide[] = value.slides
    .filter((slide) => slide.imageUrl.trim())
    .map((slide) => ({
      id: slide.id,
      imageUrl: slide.imageUrl.trim(),
      title: slide.title.trim() || null,
      subtitle: slide.subtitle.trim() || null,
      target: slide.target,
      categoryId: slide.target === "CATEGORY" ? slide.categoryId || null : null,
      productId: slide.target === "PRODUCT" ? slide.productId || null : null,
      externalUrl: slide.target === "EXTERNAL" ? slide.externalUrl.trim() || null : null,
    }))

  const benefits: BenefitRow[] = value.benefits
    .filter((row) => row.title.trim())
    .map((row) => ({ id: row.id, icon: row.icon, title: row.title.trim(), detail: row.detail.trim() || null }))

  return {
    title: value.title.trim() || null,
    subtitle: value.subtitle.trim() || null,
    body: value.body.trim() || null,
    layout: value.layout,
    columns: value.columns || null,
    ...(value.kind === "BANNER" ? { items: slides } : {}),
    ...(value.kind === "BENEFITS" ? { items: benefits } : {}),
  }
}

export interface ComponentEditorProps {
  slug: string
  /** The component being edited, or null while the sheet is closed. */
  component: StoreComponent | null
  onClose: () => void
  messages: UiMessages
}

/**
 * The fields of one component, in a sheet beside the page.
 *
 * Saved straight to the API, not held in the arrangement's draft. Publish sends an order and a
 * set of visibilities; what a component SAYS is a different promise, and one the owner wants to
 * see land — the same reason a colour saves on its own.
 *
 * Keyed on the component's id, so opening a different one starts a fresh form instead of showing
 * the last one's fields over the new one's name. That exact confusion was reported once: a slide
 * id where a component id belonged, and the form showing one thing while the page showed another.
 */
export function ComponentEditor({ slug, component, onClose, messages }: ComponentEditorProps) {
  return (
    <Sheet open={component !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        {component ? (
          <ComponentEditorBody key={component.id} slug={slug} component={component} onClose={onClose} messages={messages} />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ComponentEditorBody({
  slug,
  component,
  onClose,
  messages,
}: {
  slug: string
  component: StoreComponent
  onClose: () => void
  messages: UiMessages
}) {
  const text = messages.design
  const [value, setValue] = useState<ComponentFormValues>(() => toForm(component))

  const update = useUpdateComponent(slug)
  const image = useImageUpload()
  // Only a banner needs something to point at; the other kinds never ask.
  const categories = useProductCategories(component.kind === "BANNER" ? slug : "")
  const products = useProducts(component.kind === "BANNER" ? slug : "", { pageSize: 100 })

  const categoryOptions: SlideTargetOption[] = (categories.data ?? []).map((row) => ({ id: row.id, name: row.name }))
  const productOptions: SlideTargetOption[] = (products.data?.products ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }))

  return (
    <>
      <SheetHeader>
        <SheetTitle>{text.editComponent}</SheetTitle>
        <SheetDescription>{labelOf(component.kind, component.title, messages)}</SheetDescription>
      </SheetHeader>
      <div className="px-4 pb-4">
        <ComponentForm
          value={value}
          onChange={setValue}
          categories={categoryOptions}
          products={productOptions}
          onUploadImage={image.upload}
          imagePending={image.pending}
          // Minted here and not in the block: the design system has no clock and no randomness,
          // and an id it invented would be one two open tabs could invent twice.
          newItemId={() => crypto.randomUUID()}
          onSubmit={() =>
            update.mutate({ componentId: component.id, payload: toPayload(value) }, { onSuccess: onClose })
          }
          onCancel={onClose}
          pending={update.isPending}
          messages={messages}
        />
      </div>
    </>
  )
}
