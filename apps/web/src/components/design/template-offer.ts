// Types
import type { PageTemplateSummary } from "@harness-monorepo/contracts"

// UI
import type { GalleryTemplate, GalleryTemplateId } from "@harness-monorepo/ui/blocks/design/template-gallery"
import type { TemplatePreviewState } from "@harness-monorepo/ui/blocks/design/template-preview-frame"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/** A model as the gallery offers it, and whether this screen can ask for its preview at all. */
export interface OfferedTemplate extends GalleryTemplate {
  /** False for a model built around something the gallery has no way to choose — a category. */
  askable: boolean
}

function known(id: string, messages: UiMessages): id is GalleryTemplateId {
  return Object.hasOwn(messages.design.pages.form.templates, id)
}

/**
 * The API's models as cards, in its order — the suggested ones first. A model the dictionary has no
 * name for is left out: it came from an API newer than this build, and a card with no name is not a
 * choice anybody can make.
 */
export function offeredTemplates(summaries: readonly PageTemplateSummary[], messages: UiMessages): OfferedTemplate[] {
  return summaries.flatMap((summary) =>
    known(summary.id, messages)
      ? [
          {
            id: summary.id,
            recommended: summary.recommended,
            needsProduct: summary.needs.includes("PRODUCT"),
            askable: summary.needs.every((need) => need === "PRODUCT"),
          },
        ]
      : [],
  )
}

/** Whether a model's preview can be asked for now: it is askable, and has the product it is built around. */
export function canAsk(template: OfferedTemplate, productId: string | null): boolean {
  return template.askable && (!template.needsProduct || productId !== null)
}

/** The code a failed preview carries, if it is the API's. */
function codeOf(error: unknown): string | null {
  return error instanceof Error && "errorCode" in error && typeof error.errorCode === "string" ? error.errorCode : null
}

/**
 * What stands in a model's preview, from where its request is.
 *
 * `PAGE_PRODUCT_REQUIRED` is not a failure to show: it is the model asking for its product, which
 * the search above the cards answers — reached only if the product chosen was cleared mid-request.
 */
export function previewStateOf(
  template: OfferedTemplate,
  productId: string | null,
  request: { isPending: boolean; isError: boolean; error: unknown },
): TemplatePreviewState {
  if (!template.askable) return "unavailable"
  if (template.needsProduct && productId === null) return "needsProduct"
  if (request.isError) return codeOf(request.error) === "PAGE_PRODUCT_REQUIRED" ? "needsProduct" : "failed"
  return request.isPending ? "loading" : "ready"
}
