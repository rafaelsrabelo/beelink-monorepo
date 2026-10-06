"use client"

// Next
import { useSearchParams } from "next/navigation"

// React
import { useEffect, useState } from "react"

// Types
import type { PublicProductCategory, PublicStore, StorePage } from "@harness-monorepo/contracts"

// UI
import { TemplateApplyDialog } from "@harness-monorepo/ui/blocks/design/template-apply-dialog"
import { TemplateGallery, type GalleryTemplateId } from "@harness-monorepo/ui/blocks/design/template-gallery"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useProducts } from "@/services/catalog/catalog-hooks"
import { usePageDraft } from "@/services/page/page-draft-hooks"
import { usePageTemplates } from "@/services/page/page-template-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { pageErrorCopy } from "./page-error-copy"
import { choiceIn, withoutChoice } from "./template-choice-address"
import { canAsk, offeredTemplates } from "./template-offer"
import { TemplatePreview } from "./template-preview"
import type { useDesignDraft } from "./use-design-draft"
import { useTemplateApply } from "./use-template-apply"

export interface PageTemplatesProps {
  store: PublicStore
  categories: readonly PublicProductCategory[]
  /** The palette being edited, so a model answers the picker and not the database. */
  colors: PublicStore["colors"]
  year: number
  /** The page being edited: the models listed are the ones it may be arranged with. */
  page: StorePage
  /** The editor's draft: what is still on its way there goes before a model, and tells the question what would be lost. */
  draft: Pick<ReturnType<typeof useDesignDraft>, "publish" | "saving">
  messages: UiMessages
  web: WebMessages
}

/**
 * The gallery of whole-page models, wired: the models this page may be arranged with, each one's
 * preview from the API, and the product the product models are drawn around.
 *
 * Choosing a model shows it; "Usar este modelo" asks first, then writes it over the page's draft
 * (`useTemplateApply`) and closes the gallery. The shop is not touched: that is Publicar's.
 *
 * The address may ask for the gallery on arrival, with a model and a product already chosen
 * (`template-choice-address.ts`): it is read once, and then taken out of the address.
 */
export function PageTemplates({ store, categories, colors, year, page, draft, messages, web }: PageTemplatesProps) {
  const slug = store.slug
  const open = useDesignPages((state) => state.dialog?.kind === "templates")
  const close = useDesignPages((state) => state.close)
  const params = useSearchParams()
  // Read once, as the editor opens: the address is cleared right after, and the choice lives here from then on.
  const [arrival] = useState(() => choiceIn(params))
  const [selectedId, setSelectedId] = useState<GalleryTemplateId | null>(arrival?.templateId ?? null)
  const [productId, setProductId] = useState<string | null>(arrival?.productId ?? null)
  const [productQuery, setProductQuery] = useState("")
  const search = useDebouncedValue(productQuery.trim(), 300)

  const listed = usePageTemplates(slug, page.id, open)
  const templates = offeredTemplates(listed.data ?? [], messages)
  const asksProduct = templates.some((template) => template.needsProduct)
  // Only what can be sold, as "Nova landing" asks: a model built around a hidden product sells nothing.
  const products = useProducts(open && asksProduct ? slug : "", { pageSize: 96, status: "ACTIVE", ...(search ? { search } : {}) })

  // The editor's bar keeps this read warm; asked here only while the gallery is open.
  const saved = usePageDraft(open ? slug : "", page.id)
  const selected = templates.find((template) => template.id === selectedId) ?? null

  const dismiss = () => {
    close()
    setSelectedId(null)
    setProductQuery("")
  }
  const applying = useTemplateApply({ slug, page, draft, productId, onApplied: dismiss })

  const wanted = arrival !== null
  useEffect(() => {
    if (!wanted) return
    useDesignPages.getState().openTemplates()
    // A null state, as Next documents it: handed its own state back, the router takes the call for one
    // of its own and keeps the old address, which the next `router.refresh()` would then put back.
    window.history.replaceState(null, "", withoutChoice(window.location.href))
  }, [wanted])

  return (
    <>
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
        onApply={(template) => {
          const offered = templates.find((candidate) => candidate.id === template.id)
          if (offered && canAsk(offered, productId)) applying.ask(offered)
        }}
        applying={applying.applying}
        applyBlocked={
          !selected || canAsk(selected, productId)
            ? null
            : selected.askable
              ? messages.design.templateGallery.applyNeedsProduct
              : messages.design.templateGallery.applyUnavailable
        }
        messages={messages}
      />
      <TemplateApplyDialog
        templateName={applying.asking ? messages.design.pages.form.templates[applying.asking.id].title : null}
        pageName={page.kind === "HOME" ? messages.design.frame.homePage : page.title}
        // A read that failed, or has not answered, is taken as changes there to lose: the cautious sentence.
        unpublished={draft.saving || (saved.data?.hasUnpublishedChanges ?? true)}
        onConfirm={applying.confirm}
        onCancel={applying.cancel}
        applying={applying.applying}
        error={applying.error ? (pageErrorCopy(applying.error, web) ?? messages.design.templateApply.failed) : null}
        messages={messages}
      />
    </>
  )
}
