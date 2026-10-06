"use client"

// React
import { useState } from "react"

// Types
import type { PageTemplateSummary } from "@harness-monorepo/contracts"

// UI
import { isLandingTemplate, type LandingTemplateOption } from "@harness-monorepo/ui/blocks/design/landing-template-picker"
import { emptyNewLanding, NewLandingDialog, needsProduct } from "@harness-monorepo/ui/blocks/design/new-landing-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useProducts } from "@/services/catalog/catalog-hooks"
import { useNewPageTemplates } from "@/services/page/page-template-hooks"
import { useCreatePage } from "@/services/page/store-pages-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { editorHrefOf } from "./design-pages"
import { pageErrorCopy } from "./page-error-copy"
import { useAddressCheck } from "./use-address-check"

/**
 * The API's models as the dialog's cards, in its order. Which ones a shop or a site may open a
 * landing with is the catalogue's to say; one the dialog cannot draw — or that asks for something
 * it has no field for, a category — is left out.
 */
export function landingOptionsOf(summaries: readonly PageTemplateSummary[]): LandingTemplateOption[] {
  return summaries.flatMap((summary) =>
    isLandingTemplate(summary.id) && summary.needs.every((need) => need === "PRODUCT")
      ? [{ id: summary.id, needsProduct: summary.needs.includes("PRODUCT"), recommended: summary.recommended }]
      : [],
  )
}

export interface NewLandingProps {
  slug: string
  /** Whether the shop is a site: it sells no product, so none is read for the search. */
  site: boolean
  /** Where the editor goes once the page exists — through the leave guard, which asks first when it must. */
  go: (href: string) => void
  messages: UiMessages
  web: WebMessages
}

/**
 * "Nova landing page", wired: the templates the catalogue offers this shop, the products one can be
 * built around, whether the address is free, the create, and then the new page opened in the
 * editor, a draft to arrange and publish.
 */
export function NewLanding({ slug, site, go, messages, web }: NewLandingProps) {
  const open = useDesignPages((state) => state.dialog?.kind === "new")
  const close = useDesignPages((state) => state.close)
  const listed = useNewPageTemplates(slug, "LANDING", open)
  const templates = landingOptionsOf(listed.data ?? [])
  const [typed, setValue] = useState(() => emptyNewLanding())
  // Until one is chosen, the first the catalogue offers — the one suggested for the shop, when there is one.
  const value = { ...typed, template: templates.some((option) => option.id === typed.template) ? typed.template : (templates[0]?.id ?? null) }
  const create = useCreatePage(slug)
  const [productQuery, setProductQuery] = useState("")
  const search = useDebouncedValue(productQuery.trim(), 300)
  // Only what can be sold: a template built around a hidden product would sell nothing. A page at
  // the admin list's ceiling, and past it the API's own search, so the 97th product can be found.
  const products = useProducts(open && !site ? slug : "", { pageSize: 96, status: "ACTIVE", ...(search ? { search } : {}) })
  const addressState = useAddressCheck(open ? slug : "", value.slug ?? value.title)

  const dismiss = () => {
    close()
    create.reset()
    setProductQuery("")
    setValue(emptyNewLanding())
  }

  const submit = () => {
    if (value.template === null) return
    create.mutate(
      {
        title: value.title.trim(),
        ...(value.slug !== null ? { slug: value.slug } : {}),
        template: value.template,
        productId: needsProduct(value.template, templates) ? value.productId : null,
        inMenu: value.inMenu,
        usesChrome: value.usesChrome,
      },
      {
        onSuccess: (page) => {
          dismiss()
          go(editorHrefOf(slug, page))
        },
      },
    )
  }

  return (
    <NewLandingDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : dismiss())}
      value={value}
      onChange={setValue}
      addressPrefix={`/${slug}/lp/`}
      addressState={addressState}
      templates={templates}
      templatesState={listed.isError ? "failed" : listed.isPending ? "loading" : "ready"}
      onRetryTemplates={() => void listed.refetch()}
      products={(products.data?.products ?? []).map((product) => ({ id: product.id, name: product.name }))}
      productsState={products.isError ? "failed" : products.isPending ? "loading" : "ready"}
      onProductQuery={setProductQuery}
      onSubmit={submit}
      pending={create.isPending}
      error={create.error ? (pageErrorCopy(create.error, web) ?? null) : null}
      messages={messages}
    />
  )
}
