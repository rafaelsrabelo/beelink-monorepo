// Types
import type { PagePreview, PageTemplateSummary, TemplatePreviewQuery } from "@harness-monorepo/contracts"

// App
import { call } from "./page-call"

const templatesPath = (slug: string) => `/api/stores/${encodeURIComponent(slug)}/page-templates`

/** The models this page may be arranged with, the ones suggested for the shop's category first. */
export function fetchPageTemplates(slug: string, pageId: string): Promise<PageTemplateSummary[]> {
  return call<PageTemplateSummary[]>(`${templatesPath(slug)}?${new URLSearchParams({ pageId }).toString()}`, { method: "GET" })
}

/**
 * A model as it would look on the page, from the shop's own products. Nothing is written. The ids of
 * its bands and blocks are made up for the answer: keys for one drawing, never sent back.
 *
 * What the model does not ask for is left out: an empty `productId` is refused as an id that is none.
 */
export function fetchTemplatePreview(slug: string, templateId: string, query: TemplatePreviewQuery): Promise<PagePreview> {
  const asked = new URLSearchParams()
  if (query.pageId) asked.set("pageId", query.pageId)
  if (query.productId) asked.set("productId", query.productId)
  if (query.categoryId) asked.set("categoryId", query.categoryId)

  return call<PagePreview>(`${templatesPath(slug)}/${encodeURIComponent(templateId)}/preview?${asked.toString()}`, { method: "GET" })
}
