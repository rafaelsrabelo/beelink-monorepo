"use client"

// React
import { useState } from "react"

// Types
import type {
  AnnouncementLink,
  BannerSlide,
  BenefitRow,
  StoreComponent,
  UpdateComponentPayload,
} from "@harness-monorepo/contracts"

// UI
import { ComponentForm } from "@harness-monorepo/ui/blocks/design/component-form"
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"
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
import { useUpdateComponent, useUpdateSection } from "@/services/page/page-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"
import { labelOf } from "./design-draft"

/** The wire's nulls become the form's empty strings, which is the only shape an input can hold. */
function toForm(component: StoreComponent, bandBackground: string | null): ComponentFormValues {
  const link = component.kind === "ANNOUNCEMENT" ? (component.items[0] as AnnouncementLink | undefined) : undefined

  return {
    kind: component.kind,
    title: component.title ?? "",
    subtitle: component.subtitle ?? "",
    body: component.body ?? "",
    layout: component.layout,
    columns: component.columns ?? 0,
    // Resolved for the form, so the toggle marks one; a null on the wire is the kind's own habit.
    align: component.align ?? defaultAlignOf(component.kind),
    background: bandBackground ?? "",
    target: link?.target ?? "NONE",
    categoryId: link?.categoryId ?? "",
    productId: link?.productId ?? "",
    externalUrl: link?.externalUrl ?? "",
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
function toPayload(value: ComponentFormValues, linkId: string): UpdateComponentPayload {
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

  // The strip's one link, kept only when it names somewhere: "nowhere" is an empty list, not a
  // row that says NONE, so a strip that never pointed anywhere holds nothing to resolve.
  const link: AnnouncementLink[] =
    value.target === "NONE"
      ? []
      : [
          {
            id: linkId,
            target: value.target,
            categoryId: value.target === "CATEGORY" ? value.categoryId || null : null,
            productId: value.target === "PRODUCT" ? value.productId || null : null,
            externalUrl: value.target === "EXTERNAL" ? value.externalUrl.trim() || null : null,
          },
        ]

  const benefits: BenefitRow[] = value.benefits
    .filter((row) => row.title.trim())
    .map((row) => ({ id: row.id, icon: row.icon, title: row.title.trim(), detail: row.detail.trim() || null }))

  return {
    title: value.title.trim() || null,
    subtitle: value.subtitle.trim() || null,
    body: value.body.trim() || null,
    layout: value.layout,
    columns: value.columns || null,
    align: value.align,
    ...(value.kind === "BANNER" ? { items: slides } : {}),
    ...(value.kind === "BENEFITS" ? { items: benefits } : {}),
    ...(value.kind === "ANNOUNCEMENT" ? { items: link } : {}),
  }
}

export interface ComponentEditorProps {
  slug: string
  /** The component being edited, or null while the sheet is closed. */
  component: StoreComponent | null
  /** The colour of the band holding it — the announcement strip's, since that band is the strip. */
  bandBackground: string | null
  /** What the page is painted, so turning the strip's colour on starts somewhere visible. */
  pageBackground: string
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
export function ComponentEditor({ slug, component, bandBackground, pageBackground, onClose, messages }: ComponentEditorProps) {
  return (
    <Sheet open={component !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        {component ? (
          <ComponentEditorBody
            key={component.id}
            slug={slug}
            component={component}
            bandBackground={bandBackground}
            pageBackground={pageBackground}
            onClose={onClose}
            messages={messages}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function ComponentEditorBody({
  slug,
  component,
  bandBackground,
  pageBackground,
  onClose,
  messages,
}: Omit<ComponentEditorProps, "component"> & { component: StoreComponent }) {
  const text = messages.design
  const [value, setValue] = useState<ComponentFormValues>(() => toForm(component, bandBackground))

  const update = useUpdateComponent(slug)
  const updateBand = useUpdateSection(slug)
  const image = useImageUpload()
  // Only a banner and the strip need something to point at; the other kinds never ask.
  const points = component.kind === "BANNER" || component.kind === "ANNOUNCEMENT"
  const categories = useProductCategories(points ? slug : "")
  const products = useProducts(points ? slug : "", { pageSize: 100 })
  // The strip's link keeps its id across saves, so a re-pointed strip is the same link moved.
  const linkId = (component.items[0] as { id?: string } | undefined)?.id ?? crypto.randomUUID()

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
          pageBackground={pageBackground}
          onSubmit={() =>
            update.mutate(
              { componentId: component.id, payload: toPayload(value, linkId) },
              {
                onSuccess: () => {
                  // The strip's colour lives on its band. Written second and only when it moved:
                  // a save that only changed the words touches one row, not two.
                  const background = value.background || null
                  if (component.kind !== "ANNOUNCEMENT" || background === bandBackground) return onClose()

                  updateBand.mutate({ sectionId: component.sectionId, payload: { background } }, { onSuccess: onClose })
                },
              },
            )
          }
          onCancel={onClose}
          pending={update.isPending || updateBand.isPending}
          messages={messages}
        />
      </div>
    </>
  )
}
