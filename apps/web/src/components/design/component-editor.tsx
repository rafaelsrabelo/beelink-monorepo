"use client"

// React
import { useEffect, useRef, useState } from "react"

// Types
import type { StoreComponent } from "@harness-monorepo/contracts"

// Libs
import { XIcon } from "lucide-react"

// UI
import { ComponentForm } from "@harness-monorepo/ui/blocks/design/component-form"
import type { ComponentFormValues, SlideTargetOption } from "@harness-monorepo/ui/blocks/design/component-form"
import { Button } from "@harness-monorepo/ui/components/button"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { useProductCategories, useProducts } from "@/services/catalog/catalog-hooks"
import { useUpdateComponent, useUpdateSection } from "@/services/page/page-hooks"
import { useImageUpload } from "@/services/uploads/upload-hooks"
import { useDesignEdit } from "@/stores/design-edit"
import { toForm, toPayload } from "./component-form-values"
import { labelOf } from "./design-draft"
import { emptyStateOf } from "./empty-state"
import { EmptyStateNote } from "./empty-state-note"
import { pageErrorCopy } from "./page-error-copy"

import type { WebMessages } from "@/locales"

export interface ComponentEditorProps {
  slug: string
  /** The component selected, or null while none is. */
  component: StoreComponent | null
  /** The colour of the band holding it — the announcement strip's, since that band is the strip. */
  bandBackground: string | null
  /** What the page is painted, so turning the strip's colour on starts somewhere visible. */
  pageBackground: string
  /** How many categories the shop window shows, and whether this showcase's shelf came back empty. */
  categoriesShown: number
  shelfEmpty: boolean
  onClose: () => void
  /** Told after a save lands, so the screen can take what only the server knows — a showcase's products. */
  onSaved?: (component: StoreComponent) => void
  messages: UiMessages
  /** Where a refusal's `errorCode` becomes a sentence. */
  web: WebMessages
}

/** The inspector's title, and how a closing inspector tells that another has already replaced it. */
const INSPECTOR_TITLE = "component-inspector-title"

/**
 * The fields of one component, as the panel's inspector: at the top of the blocks tab, with the list
 * still below it.
 *
 * It used to be a sheet over the panel, and a sheet covered the one list that shows which block is
 * which — the selection was marked in the preview and nowhere else. Inside the panel the preview
 * and the list both show it, and the list stays reachable for dragging and for the hidden blocks
 * the preview does not draw.
 *
 * Saved straight to the API, not held in the arrangement's draft. Publish sends an order and a
 * set of visibilities; what a component SAYS is a different promise, and one the owner wants to
 * see land — the same reason a colour saves on its own.
 *
 * Keyed on the component's id, so choosing a different one starts a fresh form instead of showing
 * the last one's fields over the new one's name. That exact confusion was reported once: a slide
 * id where a component id belonged, and the form showing one thing while the page showed another.
 */
export function ComponentEditor({ component, ...props }: ComponentEditorProps) {
  return component ? <ComponentEditorBody key={component.id} component={component} {...props} /> : null
}

function ComponentEditorBody({
  slug,
  component,
  bandBackground,
  pageBackground,
  categoriesShown,
  shelfEmpty,
  onClose,
  onSaved,
  messages,
  web,
}: Omit<ComponentEditorProps, "component"> & { component: StoreComponent }) {
  const text = messages.design
  const [initial] = useState<ComponentFormValues>(() => toForm(component, bandBackground))
  // The strip's link keeps its id across saves, so a re-pointed strip is the same link moved. Minted
  // once: the preview draws the fields through `toPayload` on every change, and a fresh id each time
  // would be a different link each time.
  const [linkId] = useState(() => (component.items[0] as { id?: string } | undefined)?.id ?? crypto.randomUUID())
  // The fields as typed live in `useDesignEdit`, where the preview reads them before Salvar.
  const open = useDesignEdit((state) => state.open)
  const change = useDesignEdit((state) => state.change)
  const close = useDesignEdit((state) => state.close)
  const value = useDesignEdit((state) => (state.edit?.componentId === component.id ? state.edit.value : null)) ?? initial
  useEffect(() => open(component.id, initial, linkId), [open, component.id, initial, linkId])
  // Saved, cancelled or closed: the preview goes back to what is saved, and these fields with it.
  const done = () => {
    close()
    onClose()
  }
  const title = useRef<HTMLHeadingElement>(null)
  // What opened this: the preview's block or the list's row. Read while rendering, before the effect
  // of the inspector this replaces has run its cleanup and moved the focus somewhere else.
  const [from] = useState(() => (document.activeElement instanceof HTMLElement ? document.activeElement : null))
  // The strip's colour as it was when these fields opened: the band's sheet can change it meanwhile,
  // and a save here writes it back only when it was changed here.
  const [openedWith] = useState(bandBackground)

  // Focus in on the way in, and back to the opener on the way out, if it is still on the page. Not
  // when another block's fields replaced these — its heading is already there, and the focus is its.
  useEffect(() => {
    title.current?.focus()
    return () => {
      if (from?.isConnected && !document.getElementById(INSPECTOR_TITLE)) from.focus()
    }
  }, [from])

  const update = useUpdateComponent(slug)
  const updateBand = useUpdateSection(slug)
  const image = useImageUpload()
  // A banner and the strip point at a category or a product; a showcase draws from one or picks them;
  // the categories block counts them, to say why it draws nothing.
  const points = ["BANNER", "ANNOUNCEMENT", "PRODUCTS", "CATEGORIES"].includes(component.kind)
  const categories = useProductCategories(points ? slug : "")
  // The admin list's own ceiling (PRODUCTS_PAGE_SIZE_MAX): asking for more answers this many anyway.
  const products = useProducts(points ? slug : "", { pageSize: 96 })
  const optionsState =
    categories.isError || products.isError ? "failed" : categories.isPending || products.isPending ? "loading" : "ready"

  const page = products.data
  const onShelf = page?.products.filter((row) => row.status === "ACTIVE" && !row.soldOut).length ?? 0
  const empty = emptyStateOf(component.kind, {
    categoriesShown,
    categories: categories.data ?? null,
    products: page
      ? // Beyond the page loaded, a page with none on the shelf says nothing about the rest.
        { total: page.total, onShelf: onShelf > 0 || page.total <= page.products.length ? onShelf : null }
      : null,
    shelfEmpty,
  })

  const categoryOptions: SlideTargetOption[] = (categories.data ?? []).map((row) => ({ id: row.id, name: row.name }))
  const productOptions: SlideTargetOption[] = (products.data?.products ?? []).map((row) => ({
    id: row.id,
    name: row.name,
  }))

  return (
    <section
      aria-labelledby={INSPECTOR_TITLE}
      aria-describedby={`${INSPECTOR_TITLE}-block`}
      className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-3"
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          {/* The focus lands here on choosing a block — from the preview it would otherwise stay there. */}
          <h2 id={INSPECTOR_TITLE} ref={title} tabIndex={-1} className="text-sm font-semibold outline-none">
            {text.editComponent}
          </h2>
          <p id={`${INSPECTOR_TITLE}-block`} className="text-muted-foreground truncate text-xs">
            {labelOf(component.kind, component.title, messages)}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={text.closeInspector} onClick={done}>
          <XIcon aria-hidden="true" className="size-4" />
        </Button>
      </header>
      <div className="flex flex-col gap-4">
        {empty ? <EmptyStateNote state={empty} slug={slug} messages={messages} /> : null}
        <ComponentForm
          value={value}
          onChange={change}
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
                  if (component.kind !== "ANNOUNCEMENT" || background === (openedWith || null)) return done()

                  updateBand.mutate({ sectionId: component.sectionId, payload: { background } }, { onSuccess: done })
                },
              },
            )
          }
          onCancel={done}
          pending={update.isPending || updateBand.isPending}
          messages={messages}
        />
        {update.error ? (
          <p role="alert" className="text-destructive text-sm">
            {pageErrorCopy(update.error, web)}
          </p>
        ) : null}
      </div>
    </section>
  )
}
