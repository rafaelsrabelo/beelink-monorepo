"use client"

// React
import { useState } from "react"

// Types
import type { PublicProductCategory, PublicStore, StorePage } from "@harness-monorepo/contracts"

// UI
import { TemplateGallery, type GalleryTemplateId } from "@harness-monorepo/ui/blocks/design/template-gallery"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useProducts } from "@/services/catalog/catalog-hooks"
import { usePageTemplates } from "@/services/page/page-template-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { offeredTemplates } from "./template-offer"
import { TemplatePreview } from "./template-preview"

export interface PageTemplatesProps {
  store: PublicStore
  categories: readonly PublicProductCategory[]
  /** The palette being edited, so a model answers the picker and not the database. */
  colors: PublicStore["colors"]
  year: number
  /** The page being edited: the models listed are the ones it may be arranged with. */
  page: StorePage
  messages: UiMessages
  web: WebMessages
}

/**
 * The gallery of whole-page models, wired: the models this page may be arranged with, each one's
 * preview from the API, and the product the product models are drawn around.
 *
 * Choosing a model shows it; nothing is applied here. `TemplateGallery` takes an `onApply` this
 * screen does not hand it yet — the write and its confirmation are the next ticket's (BEELINK-264),
 * which has the page, the chosen model and the product right here.
 */
export function PageTemplates({ store, categories, colors, year, page, messages, web }: PageTemplatesProps) {
  const slug = store.slug
  const open = useDesignPages((state) => state.dialog?.kind === "templates")
  const close = useDesignPages((state) => state.close)
  const [selectedId, setSelectedId] = useState<GalleryTemplateId | null>(null)
  const [productId, setProductId] = useState<string | null>(null)
  const [productQuery, setProductQuery] = useState("")
  const search = useDebouncedValue(productQuery.trim(), 300)

  const listed = usePageTemplates(slug, page.id, open)
  const templates = offeredTemplates(listed.data ?? [], messages)
  const asksProduct = templates.some((template) => template.needsProduct)
  // Only what can be sold, as "Nova landing" asks: a model built around a hidden product sells nothing.
  const products = useProducts(open && asksProduct ? slug : "", { pageSize: 96, status: "ACTIVE", ...(search ? { search } : {}) })

  const dismiss = () => {
    close()
    setSelectedId(null)
    setProductQuery("")
  }

  return (
    <TemplateGallery
      open={open}
      onOpenChange={(next) => (next ? undefined : dismiss())}
      state={listed.isError ? "failed" : listed.isPending ? "loading" : "ready"}
      onRetry={() => void listed.refetch()}
      templates={templates}
      selectedId={selectedId}
      onSelect={setSelectedId}
      renderPreview={(template, size) => {
        const offered = templates.find((candidate) => candidate.id === template.id)
        return offered ? (
          <TemplatePreview
            template={offered}
            size={size}
            page={page}
            productId={productId}
            store={store}
            categories={categories}
            colors={colors}
            year={year}
            messages={messages}
            web={web}
          />
        ) : null
      }}
      product={{
        options: (products.data?.products ?? []).map((product) => ({ id: product.id, name: product.name })),
        state: products.isError ? "failed" : products.isPending ? "loading" : "ready",
        selectedId: productId,
        onPick: setProductId,
        onQueryChange: setProductQuery,
      }}
      messages={messages}
    />
  )
}
