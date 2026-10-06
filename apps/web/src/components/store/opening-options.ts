// Types
import type { PageTemplateSummary } from "@harness-monorepo/contracts"

// UI
import { isOpeningTemplate, type OpeningTemplateOption } from "@harness-monorepo/ui/blocks/store/store-opening-template"

/**
 * The API's models as the create form's choices, in its order — the ones suggested for the category
 * picked first. One the picker cannot draw is left out: it came from a catalogue newer than this
 * build. So is one that asks for a product or a category, which a store being created has none of.
 */
export function openingOptionsOf(summaries: readonly PageTemplateSummary[]): OpeningTemplateOption[] {
  return summaries.flatMap((summary) => (isOpeningTemplate(summary.id) && summary.needs.length === 0 ? [{ id: summary.id, recommended: summary.recommended }] : []))
}
