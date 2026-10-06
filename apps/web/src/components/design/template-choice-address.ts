// UI
import type { GalleryTemplateId } from "@harness-monorepo/ui/blocks/design/template-gallery"

/**
 * The gallery of models, asked for in the editor's address: `?templates=1` opens it on arrival,
 * `&template=` and `&product=` with what was already chosen there.
 *
 * The address, because two ways into the gallery cross a page load and web storage is not allowed
 * here (`web/no-web-storage`): the Páginas tab opening another page's models, and the reload a
 * draft conflict asks for, which must not cost the owner the model they had picked.
 */
export interface TemplateChoice {
  /** As it was written in the address: the gallery ignores an id it does not list. */
  templateId: GalleryTemplateId | null
  productId: string | null
}

const OPEN = "templates"
const TEMPLATE = "template"
const PRODUCT = "product"

/** Any origin: only the path, the query and the fragment are read back. */
const BASE = "http://editor.invalid"

/** What the address asks the gallery to open with, or null when it does not ask for the gallery. */
export function choiceIn(params: Pick<URLSearchParams, "get" | "has">): TemplateChoice | null {
  if (!params.has(OPEN)) return null
  return { templateId: (params.get(TEMPLATE) || null) as GalleryTemplateId | null, productId: params.get(PRODUCT) || null }
}

function rewritten(href: string, change: (params: URLSearchParams) => void): string {
  const url = new URL(href, BASE)
  change(url.searchParams)
  return `${url.pathname}${url.search}${url.hash}`
}

/** An editor address that opens the gallery on arrival, with the choice made so far. */
export function withChoice(href: string, choice: TemplateChoice = { templateId: null, productId: null }): string {
  return rewritten(href, (params) => {
    params.set(OPEN, "1")
    if (choice.templateId) params.set(TEMPLATE, choice.templateId)
    else params.delete(TEMPLATE)
    if (choice.productId) params.set(PRODUCT, choice.productId)
    else params.delete(PRODUCT)
  })
}

/** The same address once the gallery has opened: a later reload must not open it again. */
export function withoutChoice(href: string): string {
  return rewritten(href, (params) => {
    params.delete(OPEN)
    params.delete(TEMPLATE)
    params.delete(PRODUCT)
  })
}
