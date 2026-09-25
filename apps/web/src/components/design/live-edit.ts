// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import type { DesignEdit } from "@/stores/design-edit"
import { toBandPayload } from "./band-form-values"
import { toPayload } from "./component-form-values"

/**
 * The saved page with the block and the band being edited as the owner has them now, unsaved.
 *
 * Through the payloads Salvar sends, so the preview draws exactly what a save would write: a slide
 * still without its picture, a benefit without its title, are left out here as they would be there;
 * and of the band, only what Estilo changed, so a colour saved elsewhere meanwhile is not painted
 * over. What the arrangement holds — the order, the visibility and the layout — stays the draft's,
 * which `previewOf` reads separately.
 */
export function withLiveEdit(saved: readonly Section[], edit: DesignEdit | null): readonly Section[] {
  if (!edit) return saved

  const band = toBandPayload(edit.band, edit.bandOpened)
  const block = edit.component

  return saved.map((section) =>
    section.id === edit.sectionId
      ? {
          ...section,
          ...band,
          components: section.components.map((component) =>
            block && component.id === block.id
              ? ({ ...component, ...toPayload(block.value, block.linkId) } as StoreComponent)
              : component,
          ),
        }
      : section,
  )
}
