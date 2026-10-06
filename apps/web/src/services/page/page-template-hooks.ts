"use client"

// Libs
import { useQuery } from "@tanstack/react-query"
import type { UseQueryResult } from "@tanstack/react-query"

// Types
import type { PagePreview, PageTemplateSummary } from "@harness-monorepo/contracts"

// App
import { fetchPageTemplates, fetchTemplatePreview } from "./page-template-requests"

/** Keys built from their inputs at call time, as `pageKeys` are (docs/ai-rules/state-and-data.md). */
export const templateKeys = {
  all: ["page-templates"] as const,
  list: (slug: string, pageId: string) => [...templateKeys.all, slug, pageId] as const,
  /** Everything the drawing depends on: the model, the page it would land on and the product it is about. */
  preview: (slug: string, pageId: string, templateId: string, productId: string | null) =>
    [...templateKeys.all, slug, pageId, "preview", templateId, productId] as const,
}

/** A preview is of today's catalogue; within one look at the gallery it is not asked for twice. */
const PREVIEW_STALE_MS = 60_000

export function usePageTemplates(slug: string, pageId: string, enabled = true): UseQueryResult<PageTemplateSummary[], Error> {
  return useQuery({
    queryKey: templateKeys.list(slug, pageId),
    queryFn: () => fetchPageTemplates(slug, pageId),
    enabled: enabled && slug !== "" && pageId !== "",
  })
}

export interface TemplatePreviewInput {
  slug: string
  pageId: string
  templateId: string
  /** The product a model is built around, or null for one that asks for none. */
  productId: string | null
  /** False until the card is on screen, and while a model that asks for a product has none. */
  enabled: boolean
}

/**
 * One model's preview. Not retried: a refusal is the API's answer (a product deleted, a page gone),
 * and asking again says the same; the card offers the retry.
 */
export function useTemplatePreview({ slug, pageId, templateId, productId, enabled }: TemplatePreviewInput): UseQueryResult<PagePreview, Error> {
  return useQuery({
    queryKey: templateKeys.preview(slug, pageId, templateId, productId),
    queryFn: () => fetchTemplatePreview(slug, templateId, { pageId, ...(productId ? { productId } : {}) }),
    enabled: enabled && slug !== "" && pageId !== "",
    staleTime: PREVIEW_STALE_MS,
    retry: false,
  })
}
