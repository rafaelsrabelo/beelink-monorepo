"use client"

// React
import { useState } from "react"

// UI
import { LANDING_TEMPLATES, type LandingTemplateChoice } from "@harness-monorepo/ui/blocks/design/landing-template-picker"
import { emptyNewLanding, NewLandingDialog, needsProduct } from "@harness-monorepo/ui/blocks/design/new-landing-dialog"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import type { WebMessages } from "@/locales"
import { useDebouncedValue } from "@/services/addresses/use-debounced-value"
import { useProducts } from "@/services/catalog/catalog-hooks"
import { useCreatePage } from "@/services/page/store-pages-hooks"
import { useDesignPages } from "@/stores/design-pages"
import { editorHrefOf } from "./design-pages"
import { pageErrorCopy } from "./page-error-copy"
import { useAddressCheck } from "./use-address-check"

/** A site sells no product: the one template it may open with is the blank one. */
const SITE_TEMPLATES: readonly LandingTemplateChoice[] = ["em-branco"]

export interface NewLandingProps {
  slug: string
  /** Whether the shop is a site, which opens only blank pages. */
  site: boolean
  /** Where the editor goes once the page exists — through the leave guard, which asks first when it must. */
  go: (href: string) => void
  messages: UiMessages
  web: WebMessages
}

/**
 * "Nova landing page", wired: the products a template can be built around, whether the address is
 * free, the create, and then the new page opened in the editor, a draft to arrange and publish.
 */
export function NewLanding({ slug, site, go, messages, web }: NewLandingProps) {
  const open = useDesignPages((state) => state.dialog?.kind === "new")
  const close = useDesignPages((state) => state.close)
  const templates = site ? SITE_TEMPLATES : LANDING_TEMPLATES
  const [value, setValue] = useState(() => emptyNewLanding(templates[0] ?? "em-branco"))
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
    setValue(emptyNewLanding(templates[0] ?? "em-branco"))
  }

  const submit = () =>
    create.mutate(
      {
        title: value.title.trim(),
        ...(value.slug !== null ? { slug: value.slug } : {}),
        template: value.template,
        productId: needsProduct(value.template) ? value.productId : null,
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

  return (
    <NewLandingDialog
      open={open}
      onOpenChange={(next) => (next ? undefined : dismiss())}
      value={value}
      onChange={setValue}
      addressPrefix={`/${slug}/lp/`}
      addressState={addressState}
      templates={templates}
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
