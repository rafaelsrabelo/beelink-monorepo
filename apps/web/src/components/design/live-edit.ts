// Types
import type { Section, StoreComponent } from "@harness-monorepo/contracts"

// App
import type { DesignEdit } from "@/stores/design-edit"
import { toPayload } from "./component-form-values"

/**
 * The saved page with the block being edited as the owner has it now, unsaved.
 *
 * Through `toPayload`, the function Salvar sends, so the preview draws exactly what a save would
 * write: a slide still without its picture, a benefit without its title, are left out here as they
 * would be there. Only what the fields hold is replaced — the arrangement's width and visibility stay
 * the draft's, which `previewOf` reads separately.
 */
export function withLiveEdit(saved: readonly Section[], edit: DesignEdit | null): readonly Section[] {
  if (!edit) return saved

  return saved.map((section) => {
    const was = section.components.find((component) => component.id === edit.componentId)
    if (!was) return section

    const live = { ...was, ...toPayload(edit.value, edit.linkId) } as StoreComponent
    return {
      ...section,
      // The strip's colour is its band's, asked for beside the words it paints — drawn only when
      // changed here, so a colour the band's sheet saved meanwhile is not painted over.
      ...(was.kind === "ANNOUNCEMENT" && edit.value.background !== edit.openedBackground
        ? { background: edit.value.background || null }
        : {}),
      components: section.components.map((component) => (component.id === was.id ? live : component)),
    }
  })
}
