"use client"

// React
import { useState } from "react"

// Types
import type { StoreComponent } from "@harness-monorepo/contracts"

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
import { useUpdateComponent, useUpdateSection } from "@/services/page/page-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"
import { toForm, toPayload } from "./component-form-values"
import { labelOf } from "./design-draft"
import { pageErrorCopy } from "./page-error-copy"

import type { WebMessages } from "@/locales"

export interface ComponentEditorProps {
  slug: string
  /** The component being edited, or null while the sheet is closed. */
  component: StoreComponent | null
  /** The colour of the band holding it — the announcement strip's, since that band is the strip. */
  bandBackground: string | null
  /** What the page is painted, so turning the strip's colour on starts somewhere visible. */
  pageBackground: string
  onClose: () => void
  /** Told after a save lands, so the screen can take what only the server knows — a showcase's products. */
  onSaved?: (component: StoreComponent) => void
  messages: UiMessages
  /** Where a refusal's `errorCode` becomes a sentence. */
  web: WebMessages
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
export function ComponentEditor({
  slug,
  component,
  bandBackground,
  pageBackground,
  onClose,
  onSaved,
  messages,
  web,
}: ComponentEditorProps) {
  return (
    <Sheet
      open={component !== null}
      // Not modal: the preview beside it is the subject of this form, and the owner has to be able
      // to scroll it, click another block and watch the page answer while the form is open. As a
      // modal it was reported as the screen locking up — which is what a page that looks live and
      // takes no pointer is.
      modal={false}
      onOpenChange={(open) => (open ? undefined : onClose())}
    >
      <SheetContent
        side="right"
        // The preview stays visible behind the form: the owner is editing a block and watching
        // that block, and a dimmed, blurred page hides the only feedback the form has. It is the
        // whole of "já abre o que tem nele, e já aparece na página nele".
        seeThrough
        className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg"
      >
        {component ? (
          <ComponentEditorBody
            key={component.id}
            slug={slug}
            component={component}
            bandBackground={bandBackground}
            pageBackground={pageBackground}
            onClose={onClose}
            {...(onSaved ? { onSaved } : {})}
            messages={messages}
            web={web}
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
  onSaved,
  messages,
  web,
}: Omit<ComponentEditorProps, "component"> & { component: StoreComponent }) {
  const text = messages.design
  const [value, setValue] = useState<ComponentFormValues>(() => toForm(component, bandBackground))

  const update = useUpdateComponent(slug)
  const updateBand = useUpdateSection(slug)
  const image = useImageUpload()
  // A banner and the strip point at a category or a product; a showcase draws from one or picks them.
  const points = component.kind === "BANNER" || component.kind === "ANNOUNCEMENT" || component.kind === "PRODUCTS"
  const categories = useProductCategories(points ? slug : "")
  // The admin list's own ceiling (PRODUCTS_PAGE_SIZE_MAX): asking for more answers this many anyway.
  const products = useProducts(points ? slug : "", { pageSize: 96 })
  const optionsState =
    categories.isError || products.isError ? "failed" : categories.isPending || products.isPending ? "loading" : "ready"
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
          optionsState={points ? optionsState : "ready"}
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
                onSuccess: (saved) => {
                  onSaved?.(saved)
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
        {update.error ? (
          <p role="alert" className="text-destructive mt-3 text-sm">
            {pageErrorCopy(update.error, web)}
          </p>
        ) : null}
      </div>
    </>
  )
}
